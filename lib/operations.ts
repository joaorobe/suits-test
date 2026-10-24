import { randomUUID } from 'node:crypto';
import { query, withTransaction } from './db';
import { assertAvailable } from './availability';
import { allowedUpdates, HttpError, isoDate, requireValue, text, today } from './rules';
import { measurementLabels } from './customer-rules';
import type { GarmentMetadata } from './recommendations';

export async function updateOperations(userId: string, payload: Record<string, unknown>) {
  const action = text(payload.action, 'Ação');
  const itemId = text(payload.itemId, 'Traje');
  return withTransaction(async client => {
    const item = (await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [itemId])).rows[0];
    if (!item) throw new HttpError(404, 'Traje não encontrado.');
    if (action === 'settings') {
      allowedUpdates(payload, ['action','itemId','preparationDays','laundryDays','events','styles','measurements']);
      for (const field of ['preparationDays','laundryDays']) requireValue(Number.isInteger(payload[field]) && Number(payload[field]) >= 0 && Number(payload[field]) <= 30, 'Os prazos devem ser de 0 a 30 dias.');
      const metadata: GarmentMetadata = {};
      for (const field of ['events','styles'] as const) {
        requireValue(Array.isArray(payload[field]) && payload[field].length <= 10 && payload[field].every(value => typeof value === 'string' && value.trim().length > 0 && value.length <= 60), 'Confira os eventos e estilos.');
        metadata[field] = (payload[field] as string[]).map(value => value.trim());
      }
      requireValue(payload.measurements && typeof payload.measurements === 'object' && !Array.isArray(payload.measurements), 'Informe as medidas do traje em centímetros.');
      const measurements = payload.measurements as Record<string, unknown>;
      allowedUpdates(measurements, Object.keys(measurementLabels));
      requireValue(Object.values(measurements).every(value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 300), 'Medidas do traje inválidas.');
      metadata.measurements = measurements as Record<string, number>;
      await client.query('UPDATE inventory SET preparation_days=$1,laundry_days=$2,recommendation_data=$3 WHERE id=$4', [payload.preparationDays, payload.laundryDays, JSON.stringify(metadata), itemId]);
      const periods = await client.query(`SELECT id,starts_on::text AS start,ends_on::text AS "end",NULL::text AS rental FROM reservation_requests WHERE inventory_id=$1 AND status='pending'
        UNION ALL SELECT q.id,r.starts_on::text,r.due_on::text,r.id FROM rentals r LEFT JOIN reservation_requests q ON q.rental_id=r.id WHERE r.inventory_id=$1 AND r.returned_at IS NULL`, [itemId]);
      for (const period of periods.rows) await assertAvailable(client, itemId, period.start, period.end, period.id ?? undefined, period.rental ?? undefined);
    } else if (action === 'block') {
      const start = isoDate(payload.start), end = isoDate(payload.end);
      requireValue(start >= today() && end >= start && Date.parse(end) - Date.parse(start) <= 366 * 86400000, 'Informe um período futuro de até um ano.');
      await assertAvailable(client, itemId, start, end);
      await client.query('INSERT INTO inventory_blocks(id,inventory_id,starts_on,ends_on,reason,created_by) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), itemId, start, end, text(payload.reason, 'Motivo', 500), userId]);
    } else if (action === 'unblock') {
      const changed = await client.query('UPDATE inventory_blocks SET cancelled_at=now() WHERE id=$1 AND inventory_id=$2 AND cancelled_at IS NULL RETURNING id', [text(payload.blockId, 'Bloqueio'), itemId]);
      if (!changed.rowCount) throw new HttpError(404, 'Bloqueio não encontrado.');
    } else if (action === 'laundry-complete') {
      requireValue(item.status === 'Lavanderia' && !item.holding_rental_id, 'O traje não está em lavanderia ou ainda pertence a uma operação ativa.');
      const active = await client.query("SELECT 1 FROM return_orders WHERE item_id=$1 AND status!='Devolvido' AND rental_id IS NULL", [itemId]);
      requireValue(!active.rowCount, 'Resolva o pedido antigo antes de liberar o traje.');
      await client.query("UPDATE inventory SET status='Disponível',stock=1,location='Estoque Central',action='Reservar Traje' WHERE id=$1", [itemId]);
      await client.query("UPDATE return_orders SET laundry_status='Concluído' WHERE item_id=$1 AND status='Devolvido' AND laundry_status='Em lavanderia'", [itemId]);
    } else throw new HttpError(400, 'Ação operacional inválida.');
    await client.query('INSERT INTO operation_audit(user_id,method,path) VALUES($1,$2,$3)', [userId, action, '/inventory/' + itemId]);
  });
}

export async function operationsData(start: string, end: string) {
  isoDate(start); isoDate(end);
  requireValue(end >= start && Date.parse(end) - Date.parse(start) <= 366 * 86400000, 'Consulte um período de até um ano.');
  const [items, blocks, calendar, alerts, utilization, finance, audit] = await Promise.all([
    query(`SELECT id,title,status,preparation_days AS "preparationDays",laundry_days AS "laundryDays",recommendation_data AS metadata,
      CASE WHEN status='Lavanderia' THEN (SELECT to_char(max((returned_at AT TIME ZONE 'America/Sao_Paulo')::date)+i.laundry_days+1,'YYYY-MM-DD') FROM rentals WHERE inventory_id=i.id AND returned_at IS NOT NULL) END AS "estimatedRelease"
      FROM inventory i ORDER BY title`),
    query(`SELECT id,inventory_id AS "itemId",to_char(starts_on,'YYYY-MM-DD') AS start,to_char(ends_on,'YYYY-MM-DD') AS "end",reason FROM inventory_blocks WHERE cancelled_at IS NULL AND ends_on >= $1::date ORDER BY starts_on`, [today()]),
    query(`SELECT q.id,i.title,c.name AS client,to_char(q.starts_on,'YYYY-MM-DD') AS start,to_char(q.ends_on,'YYYY-MM-DD') AS "end",CASE WHEN q.status='confirmed' THEN r.stage ELSE q.status END AS stage
      FROM reservation_requests q JOIN inventory i ON i.id=q.inventory_id JOIN clients c ON c.id=q.client_id LEFT JOIN rentals r ON r.id=q.rental_id
      WHERE q.starts_on <= $2::date AND q.ends_on >= $1::date
      UNION ALL SELECT r.id,COALESCE(r.item_title,i.title),c.name,to_char(r.starts_on,'YYYY-MM-DD'),to_char(r.due_on,'YYYY-MM-DD'),r.stage
      FROM rentals r JOIN clients c ON c.id=r.client_id JOIN inventory i ON i.id=r.inventory_id WHERE r.starts_on <= $2::date AND r.due_on >= $1::date AND NOT EXISTS(SELECT 1 FROM reservation_requests q WHERE q.rental_id=r.id)
      ORDER BY start,id`, [start, end]),
    query(`SELECT 'overdue' AS kind,r.id,i.title,to_char(r.due_on,'YYYY-MM-DD') AS date,'Devolução atrasada; confira as próximas reservas.' AS message FROM rentals r JOIN inventory i ON i.id=r.inventory_id WHERE r.returned_at IS NULL AND r.stage IN ('out','ready','preparing') AND r.due_on < $1::date
      UNION ALL SELECT 'pickup',q.id,i.title,to_char(q.starts_on,'YYYY-MM-DD'),'Retirada prevista nos próximos dois dias.' FROM reservation_requests q JOIN rentals r ON r.id=q.rental_id JOIN inventory i ON i.id=q.inventory_id WHERE q.status='confirmed' AND r.stage IN ('scheduled','awaiting_measurements','preparing','ready') AND q.starts_on BETWEEN $1::date AND $1::date+2
      UNION ALL SELECT 'return',r.id,i.title,to_char(r.due_on,'YYYY-MM-DD'),'Devolução prevista nos próximos dois dias.' FROM rentals r JOIN inventory i ON i.id=r.inventory_id WHERE r.stage='out' AND returned_at IS NULL AND due_on BETWEEN $1::date AND $1::date+2
      UNION ALL SELECT 'pending',q.id,i.title,to_char(q.starts_on,'YYYY-MM-DD'),'Solicitação pendente bloqueando o período.' FROM reservation_requests q JOIN inventory i ON i.id=q.inventory_id WHERE q.status='pending'
      UNION ALL SELECT 'conflict',q.id,i.title,to_char(q.starts_on,'YYYY-MM-DD'),'Reserva próxima depende de traje ainda não devolvido.' FROM reservation_requests q JOIN inventory i ON i.id=q.inventory_id WHERE q.status IN ('pending','confirmed') AND q.starts_on <= $1::date+7 AND EXISTS(SELECT 1 FROM rentals r WHERE r.inventory_id=i.id AND r.returned_at IS NULL AND r.due_on<$1::date AND r.stage IN ('out','preparing','ready') AND r.id IS DISTINCT FROM q.rental_id)
      ORDER BY date,id LIMIT 150`, [today()]),
    query(`SELECT i.id,i.title,count(r.id)::int AS rentals,COALESCE(sum(r.amount),0)::float8 AS contracted FROM inventory i LEFT JOIN rentals r ON r.inventory_id=i.id AND r.starts_on <= $2::date AND r.due_on >= $1::date GROUP BY i.id,i.title ORDER BY rentals DESC,i.title`, [start,end]),
    query(`SELECT count(*)::int AS rentals,COALESCE(sum(p.amount),0)::float8 AS contracted,COALESCE(sum(p.paid_amount),0)::float8 AS received,COALESCE(sum(GREATEST(p.amount-COALESCE(p.paid_amount,0),0)),0)::float8 AS outstanding FROM payments p WHERE (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $1::date AND $2::date`, [start,end]),
    query(`SELECT a.id::text,u.name,a.method,a.path,a.created_at AS at FROM operation_audit a JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100`),
  ]);
  return { items: items.rows, blocks: blocks.rows, calendar: calendar.rows, alerts: alerts.rows, utilization: utilization.rows, finance: finance.rows[0], audit: audit.rows };
}
