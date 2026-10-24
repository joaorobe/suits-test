import { randomUUID } from 'node:crypto';
import { query, withTransaction } from './db';
import { contacts, validCpf } from './customer-rules';
import { hashPassword } from './passwords.mjs';
import { allowedUpdates, HttpError, requireValue, text } from './rules';
import type { CustomerProfile } from './customer-types';

export async function registerCustomer(payload: Record<string, unknown>) {
  allowedUpdates(payload, ['name','cpf','email','phone','password','passwordConfirmation']);
  const person = contacts(payload);
  const cpf = text(payload.cpf, 'CPF', 20).replace(/\D/g, '');
  requireValue(validCpf(cpf), 'Informe um CPF válido.');
  requireValue(typeof payload.password === 'string' && payload.password.length <= 128, 'Senha inválida.');
  const password = payload.password;
  requireValue(password.length >= 8 && password === payload.passwordConfirmation, 'Use uma senha de pelo menos 8 caracteres e confirme a mesma senha.');
  const hashed = await hashPassword(password);
  return withTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [cpf]);
    const duplicate = await client.query("SELECT 1 FROM users WHERE regexp_replace(cpf,'\\D','','g')=$1 OR lower(email)=$2", [cpf, person.email]);
    if (duplicate.rowCount) throw new HttpError(409, 'CPF ou e-mail já cadastrado. Entre na sua conta ou fale com a alfaiataria.');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [person.email + '|' + person.phone]);
    const id = randomUUID();
    await client.query("INSERT INTO users(id,cpf,password,name,role,email,phone) VALUES ($1,$2,$3,$4,'cliente',$5,$6)", [id, cpf, hashed, person.name, person.email, person.phone]);
    const candidates = await client.query("SELECT id FROM clients WHERE lower(trim(email))=$1 AND regexp_replace(phone,'\\D','','g')=$2", [person.email, person.phone]);
    if (candidates.rowCount) {
      await client.query('INSERT INTO client_link_requests(user_id) VALUES ($1)', [id]);
    } else {
      await client.query('INSERT INTO clients(id,name,phone,email,user_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), person.name, person.phone, person.email, id]);
    }
    return { id, name: person.name, role: 'cliente' as const };
  });
}

export async function customerProfile(userId: string): Promise<CustomerProfile> {
  const result = await query(`SELECT u.id,u.name,u.cpf,u.email,u.phone,c.id AS client_id,
    EXISTS(SELECT 1 FROM client_link_requests l WHERE l.user_id=u.id AND l.status='pending') AS link_pending
    FROM users u LEFT JOIN clients c ON c.user_id=u.id WHERE u.id=$1 AND u.role='cliente'`, [userId]);
  const row = result.rows[0];
  if (!row) throw new HttpError(403, 'Perfil de cliente não encontrado.');
  return { id: row.id, name: row.name, cpf: row.cpf, email: row.email, phone: row.phone, clientId: row.client_id, linkPending: row.link_pending };
}

export async function requireClientId(userId: string) {
  const profile = await customerProfile(userId);
  if (!profile.clientId) throw new HttpError(409, 'A alfaiataria precisa confirmar o vínculo do seu cadastro antes de liberar reservas e histórico.');
  return profile.clientId;
}

export async function updateCustomer(userId: string, payload: Record<string, unknown>) {
  allowedUpdates(payload, ['name','email','phone']);
  const person = contacts(payload);
  await withTransaction(async client => {
    await client.query("SELECT id FROM users WHERE id=$1 AND role='cliente' FOR UPDATE", [userId]);
    const duplicate = await client.query('SELECT id FROM users WHERE lower(email)=$1 AND id!=$2', [person.email, userId]);
    if (duplicate.rowCount) throw new HttpError(409, 'Este e-mail já está em uso por outra conta.');
    await client.query('UPDATE users SET name=$1,email=$2,phone=$3 WHERE id=$4', [person.name, person.email, person.phone, userId]);
    await client.query('UPDATE clients SET name=$1,email=$2,phone=$3 WHERE user_id=$4', [person.name, person.email, person.phone, userId]);
  });
  return customerProfile(userId);
}

export async function resolveClientLink(userId: string, clientId: string) {
  return withTransaction(async client => {
    const account = (await client.query("SELECT u.* FROM users u JOIN client_link_requests l ON l.user_id=u.id WHERE u.id=$1 AND u.role='cliente' AND l.status='pending' FOR UPDATE OF u,l", [userId])).rows[0];
    if (!account) throw new HttpError(409, 'Este vínculo já foi resolvido ou não está pendente.');
    if (clientId === 'new') {
      clientId = randomUUID();
      await client.query('INSERT INTO clients(id,name,email,phone) VALUES ($1,$2,$3,$4)', [clientId, account.name, account.email, account.phone]);
    }
    const linked = await client.query('UPDATE clients SET user_id=$1 WHERE id=$2 AND user_id IS NULL RETURNING id', [userId, clientId]);
    if (!linked.rowCount) throw new HttpError(409, 'Cliente inexistente ou já associado a outra conta.');
    await client.query("UPDATE client_link_requests SET status='linked',resolved_at=now() WHERE user_id=$1", [userId]);
    await client.query('INSERT INTO notifications(id,client_id,dedupe_key,title,message) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), clientId, 'link:' + userId, 'Cadastro vinculado', 'A alfaiataria confirmou seu cadastro. Seu histórico e suas medidas já estão disponíveis.']);
  });
}
