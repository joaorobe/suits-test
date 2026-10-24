import { query, closeDatabase } from '../lib/db';
async function main() {
  try {
    await query('SELECT 1');
    console.log('Banco inicializado e migrações aplicadas.');
  } finally { await closeDatabase(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
