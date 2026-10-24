import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from './lib/passwords.mjs';
for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);
const { DATABASE_URL, USER_CPF, USER_PASSWORD, USER_NAME } = process.env;
if (!DATABASE_URL || !USER_CPF || !USER_PASSWORD || !USER_NAME || USER_PASSWORD.length < 8 || !/^\d{11}$/.test(USER_CPF.replace(/\D/g, ''))) throw new Error('Defina DATABASE_URL, USER_CPF, USER_NAME e USER_PASSWORD (mínimo de 8 caracteres).');
const client = new pg.Client({ connectionString: DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN');
  const found = await client.query("SELECT id FROM users WHERE regexp_replace(cpf, '\\D', '', 'g')=$1 FOR UPDATE", [USER_CPF.replace(/\D/g, '')]);
  const id = found.rows[0]?.id ?? randomUUID();
  const password = await hashPassword(USER_PASSWORD);
  if (found.rowCount) {
    await client.query("UPDATE users SET password=$1,name=$2,role='costureira' WHERE id=$3", [password, USER_NAME, id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [id]);
  } else await client.query("INSERT INTO users(id,cpf,password,name,role) VALUES ($1,$2,$3,$4,'costureira')", [id, USER_CPF.replace(/\D/g, ''), password, USER_NAME]);
  await client.query('COMMIT');
  console.log('Usuário de costureira criado/atualizado.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
