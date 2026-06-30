import { query } from "./db";
import { DashboardActivity, DashboardMetric, DashboardOverview, InventoryItem, ReturnOrder, TailorTask, User } from "./types";

function rowToInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    sku: row.sku,
    status: row.status,
    size: row.size,
    color: row.color,
    location: row.location,
    stock: row.stock,
    image: row.image,
    action: row.action,
    priceCategory: row.price_category || undefined,
    price: row.price ? Number(row.price) : undefined,
  };
}

function rowToTailorTask(row: any): TailorTask {
  return {
    id: row.id,
    orderId: row.order_id,
    title: row.title,
    note: row.note,
    assignedTo: row.assigned_to,
    when: row.when_text,
    status: row.status,
    priority: row.priority,
  };
}

function rowToReturnOrder(row: any): ReturnOrder {
  return {
    order: row.order_id,
    client: row.client,
    itemId: row.item_id,
    item: row.item,
    dueDate: row.due_date,
    returnedDate: row.returned_date || "",
    status: row.status,
    penalty: row.penalty,
    action: row.action,
  };
}

function snakeCaseField(field: string) {
  const map: Record<string, string> = {
    orderId: "order_id",
    assignedTo: "assigned_to",
    returnedDate: "returned_date",
    dueDate: "due_date",
    when: "when_text",
    priceCategory: "price_category",
  };
  return map[field] ?? field;
}

function buildUpdateQuery(table: string, idColumn: string, idValue: string, updates: Record<string, unknown>) {
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    return null;
  }

  const parts = keys.map((key, index) => `${snakeCaseField(key)} = $${index + 1}`);
  const values = keys.map((key) => updates[key]);
  const queryText = `UPDATE ${table} SET ${parts.join(", ")} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`;
  return { queryText, values: [...values, idValue] };
}

export async function getInventory(search?: string) {
  if (!search || !search.trim()) {
    const result = await query(`SELECT * FROM inventory ORDER BY title ASC`);
    return result.rows.map(rowToInventoryItem);
  }

  const normalized = `%${search.toLowerCase()}%`;
  const result = await query(
    `SELECT * FROM inventory WHERE LOWER(title || ' ' || subtitle || ' ' || sku || ' ' || status || ' ' || color || ' ' || location) LIKE $1 ORDER BY title ASC`,
    [normalized]
  );
  return result.rows.map(rowToInventoryItem);
}

export async function getInventoryById(id: string) {
  const result = await query(`SELECT * FROM inventory WHERE id = $1`, [id]);
  return result.rows[0] ? rowToInventoryItem(result.rows[0]) : null;
}

export async function addInventory(item: InventoryItem) {
  const result = await query(
    `INSERT INTO inventory (id, title, subtitle, sku, status, size, color, location, stock, image, action, price_category, price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [item.id, item.title, item.subtitle, item.sku, item.status, item.size, item.color, item.location, item.stock, item.image, item.action, item.priceCategory ?? null, item.price ?? null]
  );
  return rowToInventoryItem(result.rows[0]);
}

export async function updateInventory(id: string, updates: Partial<InventoryItem>) {
  const queryData = buildUpdateQuery("inventory", "id", id, updates as Record<string, unknown>);
  if (!queryData) return getInventoryById(id);
  const result = await query(queryData.queryText, queryData.values);
  return result.rows[0] ? rowToInventoryItem(result.rows[0]) : null;
}

export async function deleteInventory(id: string) {
  const result = await query(`DELETE FROM inventory WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getTailorTasks() {
  const result = await query(`SELECT * FROM tailor_tasks ORDER BY id ASC`);
  return result.rows.map(rowToTailorTask);
}

export async function updateTailorTask(id: string, status: TailorTask["status"]) {
  const result = await query(`UPDATE tailor_tasks SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
  return result.rows[0] ? rowToTailorTask(result.rows[0]) : null;
}

export async function getReturnOrders() {
  const result = await query(`SELECT order_id, client, item_id, item, due_date, returned_date, status, penalty, action FROM return_orders ORDER BY order_id ASC`);
  return result.rows.map(rowToReturnOrder);
}

export async function updateReturnOrder(order: string, updates: Partial<ReturnOrder>) {
  const queryData = buildUpdateQuery("return_orders", "order_id", order, updates as Record<string, unknown>);
  if (!queryData) return getReturnOrders();
  const result = await query(queryData.queryText, queryData.values);
  return result.rows[0] ? rowToReturnOrder(result.rows[0]) : null;
}

export async function getDashboardMetrics() {
  const inventoryCountResult = await query(`SELECT COUNT(*)::int AS count FROM inventory`);
  const pendingReturnsResult = await query(`SELECT COUNT(*)::int AS count FROM return_orders WHERE status = 'Aguardando'`);
  const tailorTasksCountResult = await query(`SELECT COUNT(*)::int AS count FROM tailor_tasks WHERE status != 'Finalizado'`);
  const activeClientsResult = await query(`SELECT COUNT(DISTINCT client)::int AS count FROM return_orders`);

  const inventoryCount = inventoryCountResult.rows[0].count;
  const pendingReturns = pendingReturnsResult.rows[0].count;
  const tailorTasksCount = tailorTasksCountResult.rows[0].count;
  const activeClients = activeClientsResult.rows[0].count;

  const metrics: DashboardMetric[] = [
    { label: "Trajes no Estoque", value: inventoryCount, detail: "32 novas unidades" },
    { label: "Devoluções Pendentes", value: pendingReturns, detail: "2 com atraso" },
    { label: "Ajustes em Andamento", value: tailorTasksCount, detail: "3 prioridades" },
    { label: "Clientes Ativos", value: activeClients, detail: "+12 este mês" },
  ];

  const activities: DashboardActivity[] = [
    { title: "Reserva confirmada", description: "Smoking para evento social", time: "Há 40 min", badge: "Em andamento" },
    { title: "Devolução agendada", description: "Terno preto retirado em 18/05", time: "Hoje, 09:15", badge: "Pendente" },
    { title: "Ajuste concluído", description: "Alfaiataria de paletó", time: "Ontem, 16:30", badge: "Finalizado" },
  ];

  const overview: DashboardOverview[] = [
    { title: "Taxa de Retorno", value: "4.2%", change: "+0.8%", color: "text-green-600" },
    { title: "Tempo Médio de Ajuste", value: "1h 20m", change: "-10m", color: "text-slate-700" },
    { title: "Multas em Aberto", value: "R$ 420", change: "+R$ 120", color: "text-red-600" },
  ];

  return { metrics, activities, overview };
}

export async function authenticateUser(cpf: string, password: string) {
  const result = await query(`SELECT id, name FROM users WHERE cpf = $1 AND password = $2`, [cpf, password]);
  if (!result.rows[0]) return null;
  return result.rows[0] as Pick<User, "id" | "name">;
}
