import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.argv.includes('--confirm-demo-data')) {
  throw new Error('Confirme a operação executando npm run seed:presentation -- --confirm-demo-data.');
}

if (!process.env.DATABASE_URL) {
  throw new Error('Configure localmente DATABASE_URL em .env.local usando a URL atual do Neon.');
}

const connection = new URL(process.env.DATABASE_URL);
if (process.env.NODE_ENV === 'production'
  || !connection.hostname.endsWith('.neon.tech')
  || connection.pathname !== '/neondb'
  || connection.searchParams.get('sslmode') !== 'require'
  || !connection.password
  || connection.password.includes('TROQUE_PELA_NOVA_SENHA')) {
  throw new Error('O seed de apresentação só pode conectar localmente ao banco Neon neondb com SSL obrigatório.');
}

const project = fileURLToPath(new URL('../', import.meta.url));
const environment = { ...process.env, SUITS_PRESENTATION_SEED: '1' };
const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/seed-demo.ts'], {
  cwd: project,
  env: environment,
  stdio: 'inherit',
  windowsHide: true,
});

child.once('error', error => {
  console.error('Não foi possível iniciar o seed de apresentação:', error);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`O seed de apresentação foi interrompido pelo sinal ${signal}.`);
    process.exitCode = 1;
  } else if (code !== 0) {
    process.exitCode = code ?? 1;
  }
});
