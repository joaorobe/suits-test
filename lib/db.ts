import { migrateEnhancements } from './enhancements-migration';
import { Pool, type PoolClient } from "pg";
import { hashPassword } from "./passwords.mjs";
import { migrateCustomers } from './customer-migration';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let initializationPromise: Promise<void> | null = null;

async function initDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL em .env.local antes de acessar o banco.');
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(73194021)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        cpf text NOT NULL UNIQUE,
        password text NOT NULL,
        name text NOT NULL,
        role text NOT NULL DEFAULT 'admin'
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id text PRIMARY KEY,
        title text NOT NULL,
        subtitle text NOT NULL,
        sku text NOT NULL,
        status text NOT NULL,
        size integer NOT NULL,
        color text NOT NULL,
        location text NOT NULL,
        stock integer NOT NULL,
        image text NOT NULL,
        action text NOT NULL,
        price_category text,
        price numeric
      );

      CREATE TABLE IF NOT EXISTS tailor_orders (
        id text PRIMARY KEY,
        inventory_id text NOT NULL REFERENCES inventory(id),
        assigned_to text NOT NULL REFERENCES users(id),
        adjustment_type text NOT NULL,
        description text NOT NULL,
        measurements text,
        status text NOT NULL DEFAULT 'Novo',
        notes text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        completed_at timestamp
      );

      CREATE TABLE IF NOT EXISTS tailor_tasks (
        id text PRIMARY KEY,
        order_id text NOT NULL,
        title text NOT NULL,
        note text NOT NULL,
        assigned_to text NOT NULL,
        when_text text NOT NULL,
        status text NOT NULL,
        priority text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS return_orders (
        order_id text PRIMARY KEY,
        client text NOT NULL,
        item_id text NOT NULL,
        item text NOT NULL,
        due_date text NOT NULL,
        returned_date text,
        status text NOT NULL,
        penalty text NOT NULL,
        action text NOT NULL,
        amount_paid numeric,
        damage_fee numeric,
        laundry_status text
      );

      CREATE TABLE IF NOT EXISTS payments (
        id text PRIMARY KEY,
        item_id text NOT NULL REFERENCES inventory(id),
        item_title text NOT NULL,
        plan text NOT NULL,
        payment_type text NOT NULL DEFAULT 'Aluguel',
        amount numeric NOT NULL,
        entry_amount numeric,
        paid_amount numeric,
        status text NOT NULL,
        client_name text,
        client_phone text,
        client_email text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_category text;
    `);

    await client.query(`
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price numeric;
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
    `);

    await client.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;
    `);

    await client.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS entry_amount numeric;
    `);

    await client.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_amount numeric;
    `);

    await client.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'Aluguel';
    `);

    await client.query(`
      ALTER TABLE return_orders ADD COLUMN IF NOT EXISTS amount_paid numeric;
    `);

    await client.query(`
      ALTER TABLE return_orders ADD COLUMN IF NOT EXISTS damage_fee numeric;
    `);

    await client.query(`
      ALTER TABLE return_orders ADD COLUMN IF NOT EXISTS laundry_status text;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS clients (
        id text PRIMARY KEY, name text NOT NULL, phone text NOT NULL, email text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS rentals (
        id text PRIMARY KEY, client_id text NOT NULL REFERENCES clients(id),
        inventory_id text NOT NULL REFERENCES inventory(id),
        plan text NOT NULL CHECK (plan IN ('Diário', 'Semanal')),
        amount numeric NOT NULL CHECK (amount > 0),
        due_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), returned_at timestamptz
      );
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS rental_id text REFERENCES rentals(id);
      ALTER TABLE return_orders ADD COLUMN IF NOT EXISTS rental_id text REFERENCES rentals(id);
      ALTER TABLE return_orders ADD COLUMN IF NOT EXISTS due_on date;
      ALTER TABLE tailor_orders ADD COLUMN IF NOT EXISTS rental_id text REFERENCES rentals(id);
      ALTER TABLE tailor_orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
      CREATE INDEX IF NOT EXISTS payments_rental_idx ON payments(rental_id);
      CREATE INDEX IF NOT EXISTS returns_rental_idx ON return_orders(rental_id);
    `);
    const migrated = await client.query("SELECT 1 FROM schema_migrations WHERE version = '001_secure_baseline'");
    if (!migrated.rowCount) {
      const users = await client.query<{ id: string; password: string }>("SELECT id, password FROM users");
      for (const user of users.rows) {
        if (!user.password.startsWith('scrypt$')) {
          await client.query("UPDATE users SET password = $1 WHERE id = $2", [await hashPassword(user.password), user.id]);
        }
      }
      const legacyDates = await client.query('SELECT order_id, due_date FROM return_orders WHERE due_on IS NULL');
      for (const row of legacyDates.rows) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(row.due_date)) {
          const parsed = new Date(row.due_date + 'T12:00:00Z');
          if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === row.due_date) {
            await client.query('UPDATE return_orders SET due_on=$1 WHERE order_id=$2', [row.due_date, row.order_id]);
          }
        }
      }
      await client.query("INSERT INTO schema_migrations(version) VALUES ('001_secure_baseline')");
    }
    await migrateCustomers(client);
    await migrateEnhancements(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: unknown[]) {
  if (!initializationPromise) {
    initializationPromise = initDatabase().catch(error => { initializationPromise = null; throw error; });
  }
  await initializationPromise;
  return pool.query(text, params);
}

export async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>) {
  if (!initializationPromise) {
    initializationPromise = initDatabase().catch(error => { initializationPromise = null; throw error; });
  }
  await initializationPromise;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() { await pool.end(); }
