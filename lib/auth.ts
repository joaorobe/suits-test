import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './db';
import { HttpError } from './rules';
import { homeFor, type Role } from './roles';

export const SESSION_COOKIE = 'suits-session';
export type SessionUser = { id: string; name: string; role: Role };
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function findSession(token?: string): Promise<SessionUser | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await query(`SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now() AND u.role IN ('admin', 'costureira', 'cliente')`, [tokenHash(token)]);
  return result.rows[0] ?? null;
}

export async function currentUser() {
  return findSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser(role?: SessionUser['role']) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Faça login para continuar.');
  if (role && user.role !== role) throw new HttpError(403, 'Acesso não permitido.');
  return user;
}

export async function requirePageUser(role?: SessionUser['role'] | readonly SessionUser['role'][]) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (role && !(Array.isArray(role) ? role.includes(user.role) : user.role === role)) redirect(homeFor(user.role));
  return user;
}

export async function createSession(userId: string, remember: boolean) {
  const token = randomBytes(32).toString('hex');
  const maxAge = remember ? 7 * 86400 : 8 * 3600;
  await query('DELETE FROM sessions WHERE expires_at <= now()');
  await query('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash(token), userId, new Date(Date.now() + maxAge * 1000)]);
  return { token, maxAge };
}
