import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

let initializationPromise: Promise<void> | null = null;

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
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
        action text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        cpf text NOT NULL UNIQUE,
        password text NOT NULL,
        name text NOT NULL
      );
    `);

    await client.query(`
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_category text;
    `);

    await client.query(`
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price numeric;
    `);

    await client.query(`
      INSERT INTO inventory (id, title, subtitle, sku, status, size, color, location, stock, image, action, price_category, price)
      VALUES
        ('743G', 'Midnight Black', 'Paletó e calça', 'INV-743G', 'Disponível', 42, 'Black', 'Estoque Central', 1, '/terno1.jpg', 'Reservar Traje', 'Terno novo', 290),
        ('744H', 'Midnight Black', 'Paletó e calça', 'INV-744H', 'Costureira', 42, 'Black', 'Oficina A', 1, '/terno1.jpg', 'Editar Status', 'Terno novo', 290),
        ('745J', 'Midnight Black', 'Paletó e calça', 'INV-745J', 'Alugado', 42, 'Black', 'Retirado', 0, '/terno1.jpg', 'Ver Pedido', 'Terno novo', 290),
        ('746K', 'Midnight Black', 'Paletó e calça', 'INV-746K', 'Lavanderia', 42, 'Black', 'Lavanderia', 0, '/terno1.jpg', 'Ver Pedido', 'Terno novo', 290)
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO tailor_tasks (id, order_id, title, note, assigned_to, when_text, status, priority)
      VALUES
        ('ORD-1234', 'ORD-1234', 'Terno Preto Alfaiataria', 'Ajustar barra da manga (2cm) e acinturamento', 'Gladimir', 'Hoje - 14:00', 'Aguardando', 'Alta'),
        ('ORD-1256', 'ORD-1256', 'Terno Preto Alfaiataria', 'Ajustar barra da manga (3cm) e encurtamento', 'Gladimir', 'Amanhã - 14:00', 'Aguardando', 'Normal'),
        ('ORD-1299', 'ORD-1299', 'Smoking Veludo', 'Ajuste completo de ombros. Prioridade para evento.', 'Gladimir', 'Em andamento', 'Em execução', 'Alta'),
        ('ORD-1301', 'ORD-1301', 'Terno Preto Alfaiataria', 'Ajustar barra da manga (2cm)', 'Gladimir', 'Hoje - 09:00', 'Finalizado', 'Normal')
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO return_orders (order_id, client, item_id, item, due_date, returned_date, status, penalty, action)
      VALUES
        ('#ORD-1234', 'Robinson Abraham', 'ID-123', 'Smoking Preto Slim', 'Hoje, 18:00', NULL, 'Aguardando', '-', 'Confirmar'),
        ('#ORD-1235', 'Edecinho Jepsen', 'ID-124', 'Smoking Preto Slim', 'Ontem', NULL, 'Atrasado', 'R$ 50,00', 'Confirmar'),
        ('#ORD-1236', 'Anthonio Escobar', 'ID-125', 'Smoking Preto Slim', '25/04/2026 10:30', '25/04/2026 10:05', 'Devolvido', 'Avaria Reportada', 'Entregue')
      ON CONFLICT (order_id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO users (id, cpf, password, name)
      VALUES
        ('user-1', '123.456.789-10', 'senha123', 'Gladimir')
      ON CONFLICT (id) DO NOTHING;
    `);
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: unknown[]) {
  if (!initializationPromise) {
    initializationPromise = initDatabase();
  }
  await initializationPromise;
  return pool.query(text, params);
}
