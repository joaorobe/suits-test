import type { PoolClient } from 'pg';

export async function migrateVirtualTryOn(client: PoolClient) {
  if ((await client.query("SELECT 1 FROM schema_migrations WHERE version='004_virtual_try_on'")).rowCount) return;
  await client.query(`
    CREATE TABLE virtual_try_on_limits (
      user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_requested_at timestamptz NOT NULL
    );
    INSERT INTO schema_migrations(version) VALUES ('004_virtual_try_on');
  `);
}
