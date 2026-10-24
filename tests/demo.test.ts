import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoEnvironment } from '../scripts/demo-config.mjs';
import { validCpf } from '../lib/customer-rules';

test('demo environment uses only its local database and preserves real authorization roles', () => {
  const environment = demoEnvironment('postgresql://suits_demo:example@127.0.0.1:54379/suits_demo');
  assert.equal(environment.SUITS_DEMO, '1');
  assert.equal(environment.NODE_ENV, 'development');
  assert.equal(new URL(environment.DATABASE_URL).pathname, '/suits_demo');
  assert.deepEqual(DEMO_ACCOUNTS.map(account => account.role), ['admin', 'costureira', 'cliente']);
  assert.ok(DEMO_PASSWORD.length >= 8);
  assert.ok(validCpf(DEMO_ACCOUNTS.find(account => account.role === 'cliente')!.cpf));
  assert.throws(() => demoEnvironment('postgresql://example.com/suits_demo'), /isolado/);
  assert.throws(() => demoEnvironment('postgresql://127.0.0.1/suits'), /isolado/);
});
