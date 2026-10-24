import type { PoolClient } from 'pg';

export async function migrateEnhancements(client: PoolClient) {
  if ((await client.query("SELECT 1 FROM schema_migrations WHERE version='003_operations_recommendations'")).rowCount) return;
  await client.query(`
    ALTER TABLE inventory ADD COLUMN preparation_days integer NOT NULL DEFAULT 0 CHECK(preparation_days BETWEEN 0 AND 30);
    ALTER TABLE inventory ADD COLUMN laundry_days integer NOT NULL DEFAULT 0 CHECK(laundry_days BETWEEN 0 AND 30);
    ALTER TABLE inventory ADD COLUMN recommendation_data jsonb NOT NULL DEFAULT '{}';
    CREATE TABLE inventory_blocks (
      id text PRIMARY KEY, inventory_id text NOT NULL REFERENCES inventory(id),
      starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
      reason text NOT NULL, created_by text NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz
    );
    CREATE INDEX inventory_blocks_period_idx ON inventory_blocks(inventory_id,starts_on,ends_on) WHERE cancelled_at IS NULL;
    CREATE TABLE tutorial_progress (
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, version integer NOT NULL,
      completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,version)
    );
    CREATE TABLE operation_audit (
      id bigserial PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
      method text NOT NULL, path text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX operation_audit_time_idx ON operation_audit(created_at DESC);
    INSERT INTO schema_migrations(version) VALUES ('003_operations_recommendations');
  `);
}
