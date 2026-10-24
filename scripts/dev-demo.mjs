import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoEnvironment } from './demo-config.mjs';

const execute = promisify(execFile);
const project = fileURLToPath(new URL('../', import.meta.url));
const checking = process.argv.includes('--check');
const storage = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Suits', 'demo-postgres-18')
  : path.join(os.homedir(), '.local', 'share', 'suits', 'demo-postgres-18');
const cluster = path.join(storage, 'data');
const logfile = path.join(storage, 'postgres.log');
const settingsFile = path.join(storage, 'settings.json');
const executeOptions = { cwd: project, windowsHide: true, timeout: 45000 };
let binaries;
let databaseStarted = false;
let app;
let startupError;
let closing;

async function exists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function freePort(preferred = 0) {
  for (let candidate = preferred; candidate <= (preferred ? preferred + 20 : 0); candidate++) {
    const result = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', error => error.code === 'EADDRINUSE' ? resolve(null) : reject(error));
      server.listen(candidate, '127.0.0.1', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    });
    if (result) {
      if (preferred) {
        try {
          await fetch('http://127.0.0.1:' + result + '/api/auth', { signal: AbortSignal.timeout(1500) });
          continue;
        } catch (error) {
          if (error.name === 'TimeoutError') continue;
        }
      }
      return result;
    }
  }
  throw new Error('Não foi encontrada uma porta livre para o modo demo.');
}

async function runNode(args, environment) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: project, env: environment, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('A preparação dos dados demo não foi concluída.')));
  });
}

async function shutdown() {
  if (closing) return closing;
  closing = (async () => {
    if (app && app.exitCode === null && app.signalCode === null) {
      if (process.platform === 'win32') {
        await execute('taskkill', ['/pid', String(app.pid), '/t', '/f'], executeOptions).catch(() => {});
      } else {
        app.kill('SIGTERM');
        await Promise.race([new Promise(resolve => app.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
      }
    }
    if (databaseStarted) {
      try {
        await execute(binaries.pg_ctl, ['-D', cluster, '-m', 'fast', '-w', '-t', '15', 'stop'], executeOptions);
        databaseStarted = false;
        console.log('\nBanco demo encerrado. Seus dados de teste foram preservados.');
      } catch {
        console.error('Não foi possível encerrar o PostgreSQL demo. Consulte o log em ' + logfile);
        process.exitCode = 1;
      }
    }
  })();
  return closing;
}

async function checkApplication(url, instance) {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (startupError) throw startupError;
    if (app.exitCode !== null || app.signalCode !== null) throw new Error('O servidor demo encerrou antes da validação.');
    try {
      const response = await fetch(url + '/api/demo-status', { signal: AbortSignal.timeout(5000) });
      if (response.ok && (await response.json()).instance === instance) { ready = true; break; }
    } catch {  }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('O servidor demo não ficou disponível a tempo.');
  for (const account of DEMO_ACCOUNTS) {
    const response = await fetch(url + '/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: account.cpf, password: DEMO_PASSWORD }),
    });
    const result = await response.json();
    if (!response.ok || result.user?.role !== account.role) throw new Error('Login demo falhou para ' + account.role + ': ' + (result.message || response.status));
    const session = response.headers.getSetCookie().find(value => value.startsWith('suits-session='))?.split(';')[0];
    if (!session) throw new Error('A sessão demo não foi criada.');
    const endpoint = account.role === 'cliente' ? '/api/cliente' : account.role === 'admin' ? '/api/dashboard' : '/api/tailor-orders';
    const authorized = await fetch(url + endpoint, { headers: { Cookie: session } });
    if (!authorized.ok) throw new Error('Os dados demo não carregaram para ' + account.role);
  }
  const account = {
    name: 'Cadastro de verificação demo', cpf: '90000000418', phone: '11988887777',
    email: 'demo-check@suits.invalid', password: DEMO_PASSWORD, passwordConfirmation: DEMO_PASSWORD,
  };
  const registered = await fetch(url + '/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account),
  });
  if (registered.status !== 201 && registered.status !== 409) throw new Error('O cadastro de teste falhou: ' + await registered.text());
  const login = await fetch(url + '/api/auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: account.cpf, password: DEMO_PASSWORD }),
  });
  if (!login.ok) throw new Error('O cadastro de teste não foi preservado para login.');
  console.log('\nVerificação concluída: login nos três perfis, dados do sistema e cadastro de cliente funcionando.');
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('O modo demo é exclusivo para desenvolvimento local.');
  const portable = createRequire(import.meta.resolve('embedded-postgres'));
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const packageName = '@embedded-postgres/' + platform + '-' + process.arch;
  try { binaries = await import(pathToFileURL(portable.resolve(packageName)).href); }
  catch { throw new Error('Binários demo indisponíveis para este sistema. Execute npm install com as dependências opcionais.'); }
  await mkdir(storage, { recursive: true });
  let settings;
  try { settings = JSON.parse(await readFile(settingsFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    settings = { password: randomBytes(32).toString('hex') };
    await writeFile(settingsFile, JSON.stringify(settings), { flag: 'wx', mode: 0o600 });
  }
  if (!settings.password || typeof settings.password !== 'string') throw new Error('Configuração demo inválida em ' + settingsFile);
  if (!await exists(path.join(cluster, 'PG_VERSION'))) {
    const passwordFile = path.join(storage, 'init-password');
    await writeFile(passwordFile, settings.password + '\n', { mode: 0o600 });
    console.log('Preparando o PostgreSQL demo local pela primeira vez...');
    try {
      await execute(binaries.initdb, ['-D', cluster, '-U', 'suits_demo', '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C', '--pwfile=' + passwordFile], executeOptions);
    } finally { await unlink(passwordFile).catch(() => {}); }
  }
  const databasePort = await freePort();
  try {
    await execute(binaries.pg_ctl, ['-D', cluster, '-l', logfile, '-o', '-h 127.0.0.1 -p ' + databasePort, '-w', '-t', '30', 'start'], executeOptions);
    databaseStarted = true;
  } catch {
    throw new Error('Não foi possível iniciar o banco demo. Confira se outro npm run dev:demo já está aberto. Log: ' + logfile);
  }
  const connection = new URL('postgresql://127.0.0.1:' + databasePort + '/postgres');
  connection.searchParams.set('sslmode', 'disable');
  connection.username = 'suits_demo';
  connection.password = settings.password;
  const client = new pg.Client({ connectionString: connection.toString() });
  try {
    await client.connect();
    if (!(await client.query("SELECT 1 FROM pg_database WHERE datname='suits_demo'")).rowCount) await client.query('CREATE DATABASE suits_demo');
  } finally { await client.end(); }
  connection.pathname = '/suits_demo';
  const environment = demoEnvironment(connection.toString());
  await runNode(['--import', 'tsx', 'scripts/seed-demo.ts'], environment);
  const appPort = await freePort(3001);
  const url = 'http://127.0.0.1:' + appPort;
  environment.APP_ORIGIN = url;
  environment.SUITS_DEMO_INSTANCE = randomBytes(16).toString('hex');
  console.log('\nSUITS — DEMONSTRAÇÃO LOCAL');
  console.log('Endereço: ' + url);
  console.log('Dados de teste: ' + storage);
  console.table(DEMO_ACCOUNTS.map(account => ({ Perfil: account.role, CPF: account.cpf, Senha: DEMO_PASSWORD })));
  console.log('Para encerrar e preservar os dados, pressione Ctrl+C neste terminal.\n');
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(appPort)],
    { cwd: project, env: environment, stdio: 'inherit', windowsHide: true });
  app.once('error', error => { startupError = error; });
  if (checking) {
    await checkApplication(url, environment.SUITS_DEMO_INSTANCE);
  } else {
    await new Promise((resolve, reject) => {
      app.once('error', reject);
      app.once('exit', code => code === 0 || closing ? resolve() : reject(new Error('O servidor demo encerrou com erro.')));
    });
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown().then(() => process.exit(process.exitCode || 0)); });
try { await main(); }
catch (error) { console.error('\n' + error.message); process.exitCode = 1; }
finally { await shutdown(); }
