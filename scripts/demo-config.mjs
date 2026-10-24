export const DEMO_PASSWORD = 'Suits123!';
export const DEMO_ACCOUNTS = [
  { id: 'demo-admin', cpf: '12345678910', name: 'Administrador Demo', role: 'admin' },
  { id: 'demo-tailor', cpf: '11122233344', name: 'Costureira Demo', role: 'costureira' },
  { id: 'demo-client', cpf: '98765432100', name: 'Cliente Demo', role: 'cliente' },
];

export function demoEnvironment(databaseUrl) {
  const url = new URL(databaseUrl);
  if (url.hostname !== '127.0.0.1' || url.pathname !== '/suits_demo') {
    throw new Error('O modo demo exige o banco local isolado suits_demo.');
  }
  const environment = {
    ...process.env,
    NODE_ENV: 'development',
    SUITS_DEMO: '1',
    DATABASE_URL: databaseUrl,
  };
  delete environment.APP_ORIGIN;
  return environment;
}
