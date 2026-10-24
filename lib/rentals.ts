import type { PoolClient, QueryResultRow } from 'pg';
import { assertAvailable } from './availability';
import { randomUUID } from 'node:crypto';
import { withTransaction } from './db';
import { rowToInventoryItem, rowToPaymentRecord } from './data';
import { dueDate, HttpError, money, rentalPrice, requireValue, text, today } from './rules';

export async function reserve(payload: Record<string, unknown>) {
  const itemId = text(payload.itemId, 'Traje');
  const name = text(payload.clientName, 'Nome', 200);
  const phone = text(payload.clientPhone, 'Telefone', 30).replace(/\D/g, '');
  const email = text(payload.clientEmail, 'E-mail', 254).toLowerCase();
  requireValue(/^\d{10,13}$/.test(phone), 'Telefone inválido.');
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'E-mail inválido.');
  requireValue(payload.plan === 'Diário' || payload.plan === 'Semanal', 'Plano inválido.');
  const plan = payload.plan;
  const entry = money(payload.entryAmount, 'Entrada');
  requireValue(entry >= 50 && entry <= 100, 'A entrada deve ficar entre R$ 50,00 e R$ 100,00.');
  const tailorId = payload.sendToCostureira === true ? text(payload.assignedTo, 'Costureira') : null;
  const adjustment = tailorId ? text(payload.adjustmentType, 'Tipo de ajuste') : null;
  const description = tailorId ? text(payload.description, 'Descrição do ajuste', 2000) : null;

  return withTransaction(async client => {
    const locked = await client.query('SELECT * FROM inventory WHERE id = $1 FOR UPDATE', [itemId]);
    const item = locked.rows[0];
    if (!item) throw new HttpError(404, 'Traje não encontrado.');
    if (item.status !== 'Disponível' || item.stock < 1) throw new HttpError(409, 'O traje não está mais disponível.');
    await assertAvailable(client, itemId, today(), dueDate(plan));
    const amount = money(rentalPrice(Number(item.price), plan), 'Preço do aluguel');
    requireValue(entry <= amount, 'A entrada não pode superar o valor do aluguel.');
    if (tailorId) {
      const tailor = await client.query("SELECT id FROM users WHERE id = $1 AND role = 'costureira' FOR SHARE", [tailorId]);
      requireValue(tailor.rowCount, 'Costureira inválida.');
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email + '|' + phone]);
    const candidates = await client.query("SELECT id,name FROM clients WHERE lower(trim(email))=$1 AND regexp_replace(phone,'\\D','','g')=$2", [email, phone]);
    const matches=candidates.rows.filter(row=>row.name.trim().toLowerCase()===name.toLowerCase());
    if(candidates.rowCount && matches.length!==1)throw new HttpError(409,'Confira o nome do cliente cadastrado ou peça uma solicitação pela área do cliente para identificar o cadastro correto.');
    const clientId = matches[0]?.id ?? randomUUID();
    if (!candidates.rowCount) await client.query('INSERT INTO clients(id, name, phone, email) VALUES ($1,$2,$3,$4)', [clientId, name, phone, email]);
    return createRental(client, item, { id: clientId, name, phone, email }, { plan, amount, entry, start: today(), end: dueDate(plan), tailorId, adjustment, description, measurements: payload.measurements });
  });
}

export async function createRental(client: PoolClient, item: QueryResultRow, person: { id: string; name: string; phone: string; email: string }, options: { plan: 'Diário' | 'Semanal'; amount: number; entry: number; start: string; end: string; scheduled?: boolean; tailorId?: string | null; adjustment?: string | null; description?: string | null; measurements?: unknown }) {
  const { plan, amount, entry, tailorId, adjustment, description } = options;
  const { name, phone, email } = person;
  const itemId = item.id;
    const rentalId = randomUUID();
    const due = options.end;
    await client.query('INSERT INTO rentals(id, client_id, inventory_id, plan, amount, due_on, starts_on, stage, picked_up_at, item_title) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [rentalId, person.id, itemId, plan, amount, due, options.start, options.scheduled ? 'scheduled' : tailorId ? 'preparing' : 'out', !options.scheduled && !tailorId ? new Date() : null, item.title]);
    const payment = await client.query(`INSERT INTO payments(id,item_id,item_title,plan,payment_type,amount,entry_amount,paid_amount,status,client_name,client_phone,client_email,rental_id)
      VALUES ($1,$2,$3,$4,'Aluguel',$5,$6,0,'Pendente',$7,$8,$9,$10) RETURNING *`, ['PAY-' + randomUUID(), itemId, item.title, plan, amount, entry, name, phone, email, rentalId]);
    await client.query(`INSERT INTO return_orders(order_id,client,item_id,item,due_date,due_on,status,penalty,action,amount_paid,damage_fee,laundry_status,rental_id)
      VALUES ($1,$2,$3,$4,$5,$6,'Aguardando','-','Confirmar',0,0,'Pendente',$7)`, ['RO-' + randomUUID(), name, itemId, item.title, due, due, rentalId]);
    if (tailorId) await client.query(`INSERT INTO tailor_orders(id, inventory_id, assigned_to, adjustment_type, description, measurements, status, rental_id)
      VALUES ($1,$2,$3,$4,$5,$6,'Novo',$7)`, ['TAO-' + randomUUID(), itemId, tailorId, adjustment, description, typeof options.measurements === 'string' ? options.measurements.slice(0, 2000) : null, rentalId]);
    let inventory = rowToInventoryItem(item);
    if (!options.scheduled) {
      const updated = await client.query("UPDATE inventory SET status=$1,location=$2,stock=0,action='Ver Pedido',holding_rental_id=$3 WHERE id=$4 RETURNING *", [tailorId ? 'Costureira' : 'Alugado', tailorId ? 'Costura' : 'Retirado', rentalId, itemId]);
      inventory = rowToInventoryItem(updated.rows[0]);
    }
    return { rentalId, inventory, payment: rowToPaymentRecord(payment.rows[0]) };
}
