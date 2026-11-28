import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeTryOnImageDataUrl, detectTryOnImageMime, isTryOnProviderUrl } from '../lib/virtual-try-on';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFF0000WEBP', 'ascii');

test('virtual try-on accepts only supported image signatures', () => {
  assert.equal(detectTryOnImageMime(jpeg), 'image/jpeg');
  assert.equal(detectTryOnImageMime(png), 'image/png');
  assert.equal(detectTryOnImageMime(webp), 'image/webp');
  assert.equal(detectTryOnImageMime(Buffer.from('<svg></svg>')), null);
});

test('virtual try-on data URLs verify MIME, canonical base64 and byte limits', () => {
  const image = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  assert.deepEqual(decodeTryOnImageDataUrl(image, 10), { bytes: jpeg, mime: 'image/jpeg' });
  assert.equal(decodeTryOnImageDataUrl(image, 2), null);
  assert.equal(decodeTryOnImageDataUrl(image.replace('image/jpeg', 'image/png'), 10), null);
  assert.equal(decodeTryOnImageDataUrl('data:image/jpeg;base64,***', 10), null);
  assert.equal(decodeTryOnImageDataUrl('data:image/jpeg;base64,/9j', 10), null);
});

test('virtual try-on result URLs allow only HTTPS Hugging Face hosts', () => {
  assert.equal(isTryOnProviderUrl(new URL('https://yisol-idm-vton.hf.space/gradio_api/file=preview.png')), true);
  assert.equal(isTryOnProviderUrl(new URL('https://cdn-0.hf.co/path?token=temporary')), true);
  assert.equal(isTryOnProviderUrl(new URL('http://yisol-idm-vton.hf.space/preview.png')), false);
  assert.equal(isTryOnProviderUrl(new URL('https://huggingface.co.attacker.example/preview.png')), false);
  assert.equal(isTryOnProviderUrl(new URL('https://attacker.example/preview.png')), false);
  assert.equal(isTryOnProviderUrl(new URL('https://user@huggingface.co/preview.png')), false);
});

test('presentation demo includes valid mannequin and result images', async () => {
  for (const filename of ['smoking-peak-mannequin.png', 'smoking-peak-result.png']) {
    const image = await readFile(new URL('../public/demo-tryon/' + filename, import.meta.url));
    assert.equal(detectTryOnImageMime(image), 'image/png');
  }
});
