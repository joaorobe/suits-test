import { query } from './db';
import { NextResponse } from 'next/server';
import { requireUser, type SessionUser } from './auth';
import { HttpError } from './rules';

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Envie um objeto JSON válido.');
  return body;
}

export function checkOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expectedOrigin)) throw new HttpError(403, 'Origem da requisição não permitida.');
}

export function api<C = unknown>(role: SessionUser['role'] | readonly SessionUser['role'][] | null, handler: (request: Request, context: C, user: SessionUser) => Promise<Response>) {
  return async (request: Request, context: C) => {
    try {
      checkOrigin(request);
      const user = await requireUser();
      if (role && !(Array.isArray(role) ? role.includes(user.role) : role === user.role)) throw new HttpError(403, 'Acesso não permitido.');
      const response = await handler(request, context, user);
      if (response.ok && !['GET','HEAD','OPTIONS'].includes(request.method) && !['/api/tutorial','/api/admin/operations'].includes(new URL(request.url).pathname)) {
        await query('INSERT INTO operation_audit(user_id,method,path) VALUES($1,$2,$3)', [user.id,request.method,new URL(request.url).pathname.slice(0,500)]).catch(error => console.error('Falha ao registrar histórico operacional:',error));
      }
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      if (!(error instanceof HttpError) && !(error instanceof SyntaxError)) console.error('API error:', error);
      return NextResponse.json({ message: error instanceof HttpError ? error.message : error instanceof SyntaxError ? 'JSON inválido.' : 'Erro interno ao processar a solicitação.' }, { status: error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
