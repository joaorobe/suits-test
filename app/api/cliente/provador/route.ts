import { Client, handle_file } from '@gradio/client';
import { NextResponse } from 'next/server';
import { getInventoryById } from '../../../../lib/data';
import { api } from '../../../../lib/api';
import { withTransaction } from '../../../../lib/db';
import { HttpError, requireValue } from '../../../../lib/rules';
import { decodeTryOnImageDataUrl, detectTryOnImageMime, isTryOnProviderUrl, type TryOnImageMime } from '../../../../lib/virtual-try-on';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RESULT_BYTES = 4 * 1024 * 1024;
const supportedMimeTypes: TryOnImageMime[] = ['image/jpeg', 'image/png', 'image/webp'];
const publicDirectory = resolve(process.cwd(), 'public');

function isHuggingFaceToken(value: string): value is `hf_${string}` {
  return /^hf_[A-Za-z0-9_-]+$/.test(value);
}

function validateImage(bytes: Buffer, declaredMime?: string): { bytes: Buffer; mime: TryOnImageMime } {
  const mime = detectTryOnImageMime(bytes);
  requireValue(mime && supportedMimeTypes.includes(mime), 'Use uma imagem JPG, PNG ou WEBP.');
  requireValue(!declaredMime || declaredMime === mime, 'O formato do arquivo não corresponde à imagem enviada.');
  requireValue(bytes.length <= MAX_IMAGE_BYTES, 'A imagem deve ter no máximo 3 MB.');
  return { bytes, mime };
}

async function loadTryOnResult(outputUrl: string): Promise<{ bytes: Buffer; mime: TryOnImageMime }> {
  let url: URL;
  try {
    url = new URL(outputUrl);
  } catch {
    throw new HttpError(502, 'O provador retornou um endereço de imagem inválido.');
  }
  if (!isTryOnProviderUrl(url)) throw new HttpError(502, 'O provador retornou um endereço de imagem inválido.');

  const signal = AbortSignal.timeout(15000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    let response: Response;
    try {
      response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal });
    } catch {
      throw new HttpError(502, 'Não foi possível carregar a prévia gerada. Tente novamente.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new HttpError(502, 'Não foi possível carregar a prévia gerada. Tente novamente.');
      try {
        url = new URL(location, url);
      } catch {
        throw new HttpError(502, 'O provador retornou um endereço de imagem inválido.');
      }
      if (!isTryOnProviderUrl(url)) throw new HttpError(502, 'O provador retornou um endereço de imagem inválido.');
      continue;
    }

    if (!response.ok) throw new HttpError(502, 'Não foi possível carregar a prévia gerada. Tente novamente.');
    const bytes = await readLimited(response, MAX_RESULT_BYTES, 'A prévia gerada excede o limite permitido.');
    const mime = detectTryOnImageMime(bytes);
    if (!mime || !supportedMimeTypes.includes(mime)) throw new HttpError(502, 'O provador não retornou uma imagem válida.');
    return { bytes, mime };
  }
  throw new HttpError(502, 'Não foi possível carregar a prévia gerada. Tente novamente.');
}

async function loadGarmentImage(image: string, origin: string): Promise<{ bytes: Buffer; mime: TryOnImageMime }> {
  if (image.startsWith('data:')) {
    const decoded = decodeTryOnImageDataUrl(image, MAX_IMAGE_BYTES);
    if (!decoded) throw new HttpError(415, 'A imagem cadastrada para este traje não está em JPG, PNG ou WEBP.');
    return decoded;
  }

  let url: URL;
  try {
    url = new URL(image, origin);
  } catch {
    throw new HttpError(415, 'A imagem cadastrada para este traje não pode ser usada no provador.');
  }

  if (url.origin === origin) {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(url.pathname);
    } catch {
      throw new HttpError(400, 'O caminho da imagem do traje é inválido.');
    }
    const path = resolve(publicDirectory, '.' + decodedPath);
    const relativePath = relative(publicDirectory, path);
    requireValue(relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath), 'O caminho da imagem do traje é inválido.');
    const fileInfo = await stat(path).catch(() => null);
    if (!fileInfo?.isFile()) throw new HttpError(404, 'Não foi possível encontrar a imagem deste traje.');
    requireValue(fileInfo.size <= MAX_IMAGE_BYTES, 'A imagem do traje excede o limite permitido.');
    return validateImage(await readFile(path));
  }

  requireValue(url.protocol === 'https:' && url.hostname === 'http2.mlstatic.com' && !url.port && !url.username && !url.password, 'O provador aceita imagens de trajes cadastradas no Suits ou no catálogo de imagens aprovado.');
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HttpError(502, 'Não foi possível carregar a imagem do traje. Tente novamente.');
  }
  if (!response.ok) throw new HttpError(502, 'Não foi possível carregar a imagem do traje. Tente novamente.');
  return validateImage(await readLimited(response), response.headers.get('content-type')?.split(';')[0].trim());
}

async function readLimited(response: Response, maxBytes = MAX_IMAGE_BYTES, message = 'A imagem do traje excede o limite permitido.'): Promise<Buffer> {
  const length = Number(response.headers.get('content-length'));
  requireValue(!Number.isFinite(length) || length <= maxBytes, message);
  const body = response.body;
  if (!body) throw new HttpError(502, 'Não foi possível carregar a imagem.');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, message);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export const POST = api('cliente', async (request, _context, user) => {
  const contentLength = Number(request.headers.get('content-length'));
  requireValue(!Number.isFinite(contentLength) || contentLength <= MAX_REQUEST_BYTES, 'A foto enviada excede o limite permitido.');
  requireValue(request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;'), 'Envie a foto e os dados do traje para continuar.');

  const form = await request.formData();
  const itemId = form.get('itemId');
  const personImage = form.get('personImage');
  requireValue(typeof itemId === 'string' && itemId.trim().length > 0 && itemId.length <= 100, 'Selecione um traje válido.');
  requireValue(form.get('consent') === 'true', 'Confirme o envio da foto ao serviço externo para continuar.');
  requireValue(personImage instanceof File, 'Envie uma foto sua para continuar.');
  requireValue(personImage.size > 0 && personImage.size <= MAX_IMAGE_BYTES, 'A foto deve ter no máximo 3 MB.');
  const person = validateImage(Buffer.from(await personImage.arrayBuffer()), personImage.type);

  const item = await getInventoryById(itemId);
  if (!item) throw new HttpError(404, 'O traje selecionado não foi encontrado.');
  const garment = await loadGarmentImage(item.image, new URL(request.url).origin);
  const token = process.env.HF_TOKEN;
  const validToken = token && isHuggingFaceToken(token) ? token : undefined;
  if (token && !validToken) throw new HttpError(503, 'O provador virtual está temporariamente indisponível.');

  const rateLimit = await withTransaction(async client => {
    const result = await client.query(`
      INSERT INTO virtual_try_on_limits(user_id, last_requested_at) VALUES($1, now())
      ON CONFLICT(user_id) DO UPDATE SET last_requested_at=now()
      WHERE virtual_try_on_limits.last_requested_at <= now()-interval '1 minute'
      RETURNING user_id
    `, [user.id]);
    return result.rowCount === 1;
  });
  if (!rateLimit) throw new HttpError(429, 'Aguarde um minuto antes de gerar outra prova virtual.');

  let client: Client | undefined;
  try {
    client = await Client.connect('yisol/IDM-VTON', validToken ? { token: validToken } : undefined);
    const result = await client.predict('/tryon', {
      dict: {
        background: handle_file(new Blob([new Uint8Array(person.bytes)], { type: person.mime })),
        layers: [],
        composite: null,
      },
      garm_img: handle_file(new Blob([new Uint8Array(garment.bytes)], { type: garment.mime })),
      garment_des: `${item.title} ${item.subtitle}`.trim().slice(0, 200) || 'Terno social',
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: 42,
    });

    const firstOutput = Array.isArray(result.data) ? result.data[0] : null;
    const outputUrl = typeof firstOutput === 'string' ? firstOutput
      : firstOutput && typeof firstOutput === 'object' && 'url' in firstOutput ? firstOutput.url
        : null;
    if (typeof outputUrl !== 'string') throw new Error('O modelo não retornou um arquivo de imagem.');
    const output = await loadTryOnResult(outputUrl);
    return new NextResponse(new Uint8Array(output.bytes), {
      headers: {
        'Content-Type': output.mime,
        'Content-Disposition': 'inline; filename="previa-virtual"',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('Virtual try-on provider failed:', error instanceof Error ? error.message : 'Erro desconhecido do provedor.');
    throw new HttpError(502, 'O provador virtual está ocupado ou indisponível. Tente novamente mais tarde.');
  } finally {
    client?.close();
  }
});
