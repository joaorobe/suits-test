import { randomUUID } from 'node:crypto';
import { closeDatabase, query, withTransaction } from '../lib/db';
import { validCpf } from '../lib/customer-rules';
import { hashPassword } from '../lib/passwords.mjs';

async function main() {
  const cpf = process.env.ADMIN_CPF?.replace(/\D/g, '') ?? '';
  const name = process.env.ADMIN_NAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!validCpf(cpf)) throw new Error('ADMIN_CPF deve conter um CPF válido.');
  if (name.length < 2 || name.length > 200) throw new Error('ADMIN_NAME deve conter entre 2 e 200 caracteres.');
  if (password.length < 12 || password.length > 128) throw new Error('ADMIN_PASSWORD deve conter entre 12 e 128 caracteres.');

  const hashedPassword = await hashPassword(password);
  await query('SELECT 1');
  await withTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(73194023)');

    const admins = await client.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
    if (admins.rowCount) throw new Error('Já existe um administrador. Nenhuma conta foi alterada.');

    const duplicate = await client.query(
      "SELECT 1 FROM users WHERE regexp_replace(cpf, '\\D', '', 'g')=$1",
      [cpf],
    );
    if (duplicate.rowCount) throw new Error('Este CPF já está cadastrado. Nenhuma conta foi alterada.');

    await client.query(
      "INSERT INTO users(id,cpf,password,name,role) VALUES ($1,$2,$3,$4,'admin')",
      [randomUUID(), cpf, hashedPassword, name],
    );
  });

  console.log('Primeiro administrador criado. Guarde a senha em um gerenciador seguro.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
