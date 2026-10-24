import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateUser } from '../../../lib/data';
import { createSession, currentUser, cookieOptions, SESSION_COOKIE, tokenHash } from '../../../lib/auth';
import { checkOrigin, readBody } from '../../../lib/api';
import { query } from '../../../lib/db';
import { HttpError } from '../../../lib/rules';

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user }, { status: user ? 200 : 401, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const payload = await readBody(request);
    if (typeof payload.cpf !== 'string' || !/^\d{11}$/.test(payload.cpf.replace(/\D/g, '')) || typeof payload.password !== 'string' || !payload.password || payload.password.length > 256) return NextResponse.json({ message: 'Informe CPF e senha válidos.' }, { status: 400 });
    const user = await authenticateUser(payload.cpf, payload.password);
    if (!user) return NextResponse.json({ success: false, message: 'CPF ou senha inválidos.' }, { status: 401 });
    const old = (await cookies()).get(SESSION_COOKIE)?.value;
    if (old) await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(old)]);
    const { token, maxAge } = await createSession(user.id, payload.remember === true);
    const response = NextResponse.json({ success: true, user }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge });
    response.cookies.set('suits-auth-user', '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ message: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 });
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Não foi possível entrar. Tente novamente.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try { checkOrigin(request); } catch { return NextResponse.json({ message: 'Origem não permitida.' }, { status: 403 }); }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)]);
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set('suits-auth-user', '', { path: '/', maxAge: 0 });
  return response;
}
