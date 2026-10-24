import type { PoolClient } from 'pg';

export async function migrateCustomers(client: PoolClient) {
  if ((await client.query("SELECT 1 FROM schema_migrations WHERE version='002_customer_portal'")).rowCount) return;
  await client.query(`
    ALTER TABLE users ADD COLUMN email text;
    ALTER TABLE users ADD COLUMN phone text;
    CREATE UNIQUE INDEX users_email_idx ON users(lower(email)) WHERE email IS NOT NULL;
    ALTER TABLE clients ADD COLUMN user_id text UNIQUE REFERENCES users(id);
    ALTER TABLE inventory ADD COLUMN holding_rental_id text REFERENCES rentals(id);
    ALTER TABLE rentals ADD COLUMN starts_on date;
    ALTER TABLE rentals ADD COLUMN stage text NOT NULL DEFAULT 'out';
    ALTER TABLE rentals ADD COLUMN prepared_at timestamptz;
    ALTER TABLE rentals ADD COLUMN ready_at timestamptz;
    ALTER TABLE rentals ADD COLUMN picked_up_at timestamptz;
    ALTER TABLE rentals ADD COLUMN item_title text;
    UPDATE rentals r SET starts_on=(r.created_at AT TIME ZONE 'America/Sao_Paulo')::date,
      stage=CASE WHEN returned_at IS NOT NULL THEN 'returned' WHEN i.status='Costureira' THEN 'preparing' ELSE 'out' END,
      picked_up_at=CASE WHEN i.status='Costureira' AND r.returned_at IS NULL THEN NULL
        WHEN NOT EXISTS(SELECT 1 FROM tailor_orders t WHERE t.rental_id=r.id) THEN r.created_at
        ELSE (SELECT max(t.confirmed_at) FROM tailor_orders t WHERE t.rental_id=r.id) END,
      item_title=i.title FROM inventory i WHERE i.id=r.inventory_id;
    UPDATE inventory i SET holding_rental_id=r.id FROM rentals r
      WHERE r.inventory_id=i.id AND r.returned_at IS NULL AND i.status IN ('Alugado','Costureira');
    DROP INDEX IF EXISTS rentals_active_item_idx;
    CREATE UNIQUE INDEX rentals_physical_item_idx ON rentals(inventory_id) WHERE returned_at IS NULL AND stage='out';
    CREATE INDEX rentals_period_idx ON rentals(inventory_id,starts_on,due_on) WHERE returned_at IS NULL;
    CREATE TABLE client_link_requests (
      user_id text PRIMARY KEY REFERENCES users(id), status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
    );
    CREATE TABLE reservation_requests (
      id text PRIMARY KEY, client_id text NOT NULL REFERENCES clients(id), inventory_id text NOT NULL REFERENCES inventory(id),
      starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
      status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','cancelled')),
      rental_id text UNIQUE REFERENCES rentals(id), quoted_amount numeric, public_note text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX requests_period_idx ON reservation_requests(inventory_id,starts_on,ends_on) WHERE status='pending';
    CREATE INDEX requests_client_idx ON reservation_requests(client_id,created_at DESC);
    CREATE TABLE reservation_events (
      id text PRIMARY KEY, request_id text NOT NULL REFERENCES reservation_requests(id),
      stage text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX events_request_idx ON reservation_events(request_id,created_at);
    CREATE TABLE client_measurements (
      id text PRIMARY KEY, client_id text NOT NULL REFERENCES clients(id), taken_by text NOT NULL REFERENCES users(id),
      measurements jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE notifications (
      id text PRIMARY KEY, client_id text NOT NULL REFERENCES clients(id), request_id text REFERENCES reservation_requests(id),
      dedupe_key text UNIQUE NOT NULL, title text NOT NULL, message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
    );
    CREATE INDEX notifications_client_idx ON notifications(client_id,created_at DESC);
    CREATE TABLE push_subscriptions (
      id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint text UNIQUE NOT NULL, subscription jsonb NOT NULL, consent_at timestamptz NOT NULL,
      revoked_at timestamptz
    );
    INSERT INTO schema_migrations(version) VALUES ('002_customer_portal');
  `);
}
