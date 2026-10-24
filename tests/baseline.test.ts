import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/passwords.mjs';
import { allowedUpdates, dueDate, isoDate, money, rentalPrice, today } from '../lib/rules';
import { validateInventory } from '../lib/inventory';

test('hashes have unique salts and verify only the correct password', async () => {
  const first = await hashPassword('Senha de teste!');
  const second = await hashPassword('Senha de teste!');
  assert.notEqual(first, second);
  assert.ok(!first.includes('Senha de teste!'));
  assert.equal(await verifyPassword('Senha de teste!', first), true);
  assert.equal(await verifyPassword('senha errada', first), false);
});

test('plaintext and malformed hashes cannot authenticate', async () => {
  for (const value of ['senha123', 'scrypt$$', 'scrypt$a$b', 'bcrypt$test']) assert.equal(await verifyPassword('senha123', value), false);
});

test('daily due dates preserve the business date and weekly plans cross year and leap-day boundaries', () => {
  assert.equal(dueDate('Diário', '2026-10-23'), '2026-10-23');
  assert.equal(dueDate('Semanal', '2026-12-28'), '2027-01-04');
  assert.equal(dueDate('Semanal', '2028-02-24'), '2028-03-02');
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isoDate('2028-02-29'), '2028-02-29');
  assert.throws(() => isoDate('2026-02-29'));
  assert.throws(() => isoDate('Hoje'));
});

test('server prices preserve daily and weekly pricing, rounded to cents', () => {
  assert.equal(rentalPrice(290, 'Diário'), 290);
  assert.equal(rentalPrice(290, 'Semanal'), 1421);
  assert.equal(rentalPrice(123.45, 'Semanal'), 604.91);
});

test('financial values reject negative, nonfinite, oversized and fractional-cent inputs', () => {
  for (const value of [-1, NaN, Infinity, '50', 0, 0.001, 100000000]) assert.throws(() => money(value, 'Valor'));
  assert.equal(money(0, 'Multa', true), 0);
  assert.equal(money(50.01, 'Valor'), 50.01);
});

test('dynamic updates reject unknown and SQL-shaped column names', () => {
  assert.throws(() => allowedUpdates({ 'status = NULL; DROP TABLE users; --': 'x' }, ['status']));
  assert.throws(() => validateInventory({ id: 'outro-traje' }));
  assert.throws(() => validateInventory({ stock: -1 }));
  assert.throws(() => validateInventory({ size: 42.5 }));
  assert.throws(() => validateInventory({ status: 'Inexistente' }));
  assert.doesNotThrow(() => validateInventory({ title: 'Traje', size: 42, stock: 1, status: 'Disponível', price: 290 }));
});
