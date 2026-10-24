import { assertMeasurementAccess } from './measurements';
import { rankRecommendations, scoreGarment, type RecommendationPreferences } from './recommendations';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from './db';
import { assertAvailable, available } from './availability';
import { period, quote, measurementLabels } from './customer-rules';
import { customerProfile, requireClientId } from './customers';
import { createRental } from './rentals';
import { requestEvent, remindReturns } from './notifications';
import { allowedUpdates, HttpError, money, requireValue, text, today } from './rules';
import { stageLabels, type Booking, type CatalogItem, type CustomerData } from './customer-types';

export async function catalog(search: URLSearchParams, userId?: string): Promise<CatalogItem[]> {
  const dates = period(search.get('start') || today(), search.get('end') || search.get('start') || today());
  const min = search.get('min') ? Number(search.get('min')) : null;
  const max = search.get('max') ? Number(search.get('max')) : null;
  const size = search.get('size') ? Number(search.get('size')) : null;
  requireValue(size === null || Number.isInteger(size) && size > 0 && size <= 100, 'Tamanho inválido.');
  requireValue((min === null || Number.isFinite(min) && min >= 0) && (max === null || Number.isFinite(max) && max >= 0) && (min === null || max === null || max >= min), 'Confira a faixa de preço.');
  const preferences: RecommendationPreferences = {
    event: search.get('event')?.slice(0, 60) || undefined, color: search.get('color')?.slice(0, 60) || undefined,
    style: search.get('style')?.slice(0, 60) || undefined,
    budget: search.get('budget') ? Number(search.get('budget')) : undefined,
    size: size ?? undefined,
  };
  requireValue(preferences.budget == null || Number.isFinite(preferences.budget) && preferences.budget >= 0, 'Orçamento inválido.');
  return withTransaction(async client => {
    const measurement = userId ? (await client.query(`SELECT m.measurements FROM client_measurements m JOIN clients c ON c.id=m.client_id WHERE c.user_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 1`, [userId])).rows[0]?.measurements ?? null : null;
    const items = await client.query(`SELECT * FROM inventory WHERE ($1::text IS NULL OR price_category=$1)
      AND ($2::int IS NULL OR size=$2) AND ($3::numeric IS NULL OR price >= $3) AND ($4::numeric IS NULL OR price <= $4)
      AND ($5::text='' OR title ILIKE '%'||$5||'%' OR subtitle ILIKE '%'||$5||'%') ORDER BY title LIMIT 200`,
    [search.get('category') || null, size, min, max, search.get('q')?.slice(0, 100) || '']);
    const result: CatalogItem[] = [];
    for (const item of items.rows) {
      const usable = item.status !== 'Lavanderia' && ((item.status === 'Disponível' && item.stock > 0) || item.holding_rental_id != null);
      const free = usable && await available(client, item.id, dates.startsOn, dates.endsOn);
      if (search.get('available') === 'true' && !free) continue;
      const metadata = item.recommendation_data || {};
      const record: CatalogItem = { id: item.id, title: item.title, description: item.subtitle, image: item.image, category: item.price_category || 'Trajes', size: item.size, color: item.color, price: item.price == null ? null : Number(item.price), available: free, estimate: quote(item.price == null ? null : Number(item.price), dates.days) };
      record.availabilityNote = free ? `Inclui ${item.preparation_days} dia(s) de preparação e ${item.laundry_days} de higienização.` : 'Considere outra data. Reservas, higienização e manutenção podem impedir a solicitação.';
      if (search.get('recommend') === 'true') record.recommendation = scoreGarment(record, metadata, preferences, measurement);
      result.push(record);
    }
    return search.get('recommend') === 'true' ? rankRecommendations(result) : result;
  });
}

export async function requestReservation(userId: string, payload: Record<string, unknown>) {
  allowedUpdates(payload, ['itemId','start','end']);
  const itemId = text(payload.itemId, 'Traje');
  const dates = period(payload.start, payload.end);
  const clientId = await requireClientId(userId);
  return withTransaction(async client => {
    const item = (await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [itemId])).rows[0];
    if (!item) throw new HttpError(404, 'Traje não encontrado.');
    if (item.status === 'Lavanderia' || !((item.status === 'Disponível' && item.stock > 0) || item.holding_rental_id)) throw new HttpError(409, 'Este traje está temporariamente indisponível.');
    await assertAvailable(client, itemId, dates.startsOn, dates.endsOn);
    const id = randomUUID();
    await client.query('INSERT INTO reservation_requests(id,client_id,inventory_id,starts_on,ends_on,quoted_amount) VALUES ($1,$2,$3,$4,$5,$6)', [id, clientId, itemId, dates.startsOn, dates.endsOn, quote(item.price == null ? null : Number(item.price), dates.days)]);
    await requestEvent(client, id, 'pending', 'Solicitação enviada para análise da alfaiataria.');
    return { id };
  });
}

export async function cancelRequest(userId: string, requestId: string) {
  const clientId = await requireClientId(userId);
  await withTransaction(async client => {
    const request = (await client.query('SELECT * FROM reservation_requests WHERE id=$1 AND client_id=$2 FOR UPDATE', [requestId, clientId])).rows[0];
    if (!request) throw new HttpError(404, 'Solicitação não encontrada.');
    if (request.status !== 'pending') throw new HttpError(409, 'Apenas solicitações aguardando aprovação podem ser canceladas por aqui.');
    await client.query("UPDATE reservation_requests SET status='cancelled',updated_at=now() WHERE id=$1", [requestId]);
    await requestEvent(client, requestId, 'cancelled', 'Solicitação cancelada pelo cliente.');
  });
}

export async function manageRequest(requestId: string, payload: Record<string, unknown>) {
  const action = text(payload.action, 'Ação');
  await withTransaction(async client => {
    const reference=(await client.query('SELECT inventory_id FROM reservation_requests WHERE id=$1',[requestId])).rows[0];
    if(!reference)throw new HttpError(404,'Solicitação não encontrada.');
    const item=(await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE',[reference.inventory_id])).rows[0];
    const request=(await client.query('SELECT * FROM reservation_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (action === 'reject') {
      if (request.status !== 'pending') throw new HttpError(409, 'Esta solicitação já foi analisada.');
      const note = text(payload.note, 'Motivo da recusa', 1000);
      await client.query("UPDATE reservation_requests SET status='rejected',public_note=$1,updated_at=now() WHERE id=$2", [note, requestId]);
      await requestEvent(client, requestId, 'rejected', 'Solicitação recusada: ' + note);
      return;
    }
    if (action === 'approve') {
      if (request.status !== 'pending') throw new HttpError(409, 'Esta solicitação já foi analisada.');
      const start = dateString(request.starts_on), end = dateString(request.ends_on);
      requireValue(start >= today(), 'O período solicitado já começou. Combine novas datas com o cliente.');
      await assertAvailable(client, item.id, start, end, requestId);
      requireValue(item.status !== 'Lavanderia' && ((item.status === 'Disponível' && item.stock > 0) || item.holding_rental_id), 'O traje está indisponível para confirmação.');
      const person = (await client.query('SELECT * FROM clients WHERE id=$1', [request.client_id])).rows[0];
      const amount = money(payload.amount ?? (request.quoted_amount == null ? null : Number(request.quoted_amount)), 'Valor acordado');
      const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
      const created = await createRental(client, item, person, { plan: days === 7 ? 'Semanal' : 'Diário', amount, entry: 0, start, end, scheduled: true });
      await client.query("UPDATE reservation_requests SET status='confirmed',rental_id=$1,quoted_amount=$2,updated_at=now() WHERE id=$3", [created.rentalId, amount, requestId]);
      await requestEvent(client, requestId, 'scheduled', 'Reserva confirmada pela alfaiataria. Confira as datas de retirada e devolução.');
      return;
    }
    if (request.status !== 'confirmed' || !request.rental_id) throw new HttpError(409, 'Confirme a reserva antes de preparar o traje.');
    const rental = (await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE', [request.rental_id])).rows[0];
    if (rental.returned_at) throw new HttpError(409, 'Este aluguel já foi devolvido.');
    const transitions: Record<string, string[]> = { scheduled: ['measurements','prepare','ready'], awaiting_measurements: ['prepare','ready'], preparing: ['ready'], ready: ['pickup'] };
    requireValue(transitions[rental.stage]?.includes(action), 'Esta ação não corresponde à etapa atual.');
    const stage = ({ measurements: 'awaiting_measurements', prepare: 'preparing', ready: 'ready', pickup: 'out' } as Record<string, string>)[action];
    if (action !== 'measurements') {
      requireValue(today() >= new Date(Date.parse(dateString(rental.starts_on)) - (action === 'pickup' ? 0 : item.preparation_days) * 86400000).toISOString().slice(0,10) && today() <= dateString(rental.due_on), 'Preparação liberada na janela configurada; retirada apenas dentro do período reservado.');
      if (item.holding_rental_id && item.holding_rental_id !== rental.id || item.status === 'Lavanderia' || item.status === 'Alugado') throw new HttpError(409, 'O traje ainda está em outra operação.');
      await assertAvailable(client, item.id, dateString(rental.starts_on), dateString(rental.due_on), requestId, rental.id);
      if (action === 'ready') {
        await client.query('SELECT id FROM tailor_orders WHERE rental_id=$1 FOR UPDATE',[rental.id]);
        const unfinished = await client.query("SELECT 1 FROM tailor_orders WHERE rental_id=$1 AND status!='Finalizado'", [rental.id]);
        requireValue(!unfinished.rowCount, 'Finalize os ajustes antes de liberar a retirada.');
        await client.query('UPDATE tailor_orders SET confirmed_at=COALESCE(confirmed_at,now()) WHERE rental_id=$1',[rental.id]);
      }
      await client.query('UPDATE inventory SET status=$1,stock=0,holding_rental_id=$2,location=$3,action=$4 WHERE id=$5', [action === 'pickup' ? 'Alugado' : 'Reservado', rental.id, action === 'pickup' ? 'Retirado' : action === 'ready' ? 'Pronto para retirada' : 'Preparação', 'Ver Pedido', item.id]);
      if (action === 'prepare' && payload.assignedTo) {
        const tailor = await client.query("SELECT id FROM users WHERE id=$1 AND role='costureira'", [text(payload.assignedTo, 'Costureira')]);
        requireValue(tailor.rowCount, 'Costureira inválida.');
        const description = text(payload.description, 'Descrição do ajuste', 2000);
        await client.query("INSERT INTO tailor_orders(id,inventory_id,assigned_to,adjustment_type,description,status,rental_id) VALUES ($1,$2,$3,'Ajuste de reserva',$4,'Novo',$5)", ['TAO-' + randomUUID(), item.id, payload.assignedTo, description, rental.id]);
        await client.query("UPDATE inventory SET status='Costureira',location='Costura' WHERE id=$1", [item.id]);
      }
    }
    await client.query(`UPDATE rentals SET stage=$1,prepared_at=CASE WHEN $1='preparing' THEN now() ELSE prepared_at END,
      ready_at=CASE WHEN $1='ready' THEN now() ELSE ready_at END,picked_up_at=CASE WHEN $1='out' THEN now() ELSE picked_up_at END WHERE id=$2`, [stage, rental.id]);
    await client.query('UPDATE reservation_requests SET updated_at=now() WHERE id=$1', [requestId]);
    await requestEvent(client, requestId, stage, stageLabels[stage]);
  });
}

export function dateString(value: Date | string): string { return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10); }
const timestamp = (value: Date | string) => new Date(value).toISOString();

export async function customerData(userId: string): Promise<CustomerData> {
  const profile = await customerProfile(userId);
  if (!profile.clientId) return { profile, bookings: [], measurements: [], notifications: [], unread: 0 };
  return withTransaction(async client => {
    await remindReturns(client, profile.clientId!);
    const rows = await client.query(`SELECT q.id AS request_id,q.status AS request_status,q.starts_on AS request_start,q.ends_on,q.quoted_amount,q.public_note,
      r.id AS rental_id,r.starts_on,r.due_on,r.stage,r.amount,r.returned_at,r.created_at,r.picked_up_at,r.ready_at,r.prepared_at,
      COALESCE(r.item_title,i.title) AS title,i.image,COALESCE(p.paid_amount,0) AS paid
      FROM reservation_requests q JOIN inventory i ON i.id=q.inventory_id LEFT JOIN rentals r ON r.id=q.rental_id
      LEFT JOIN payments p ON p.rental_id=r.id AND p.payment_type='Aluguel' WHERE q.client_id=$1
      UNION ALL SELECT NULL,NULL,r.starts_on,r.due_on,NULL,NULL,r.id,r.starts_on,r.due_on,r.stage,r.amount,r.returned_at,r.created_at,r.picked_up_at,r.ready_at,r.prepared_at,
      COALESCE(r.item_title,i.title),i.image,COALESCE(p.paid_amount,0) FROM rentals r JOIN inventory i ON i.id=r.inventory_id
      LEFT JOIN payments p ON p.rental_id=r.id AND p.payment_type='Aluguel'
      WHERE r.client_id=$1 AND NOT EXISTS(SELECT 1 FROM reservation_requests q WHERE q.rental_id=r.id)
      ORDER BY request_start DESC`, [profile.clientId]);
    const events = await client.query(`SELECT e.* FROM reservation_events e JOIN reservation_requests q ON q.id=e.request_id WHERE q.client_id=$1 ORDER BY e.created_at,e.id`, [profile.clientId]);
    const bookings: Booking[] = rows.rows.map(row => {
      const stage = row.rental_id ? row.stage : row.request_status;
      const history = events.rows.filter(e => e.request_id === row.request_id).map(e => ({ stage: e.stage, message: e.message, at: timestamp(e.created_at) }));
      if (!row.request_id) {
        for (const [key, at] of [['scheduled', row.created_at], ['preparing', row.prepared_at], ['ready', row.ready_at], ['out', row.picked_up_at], ['returned', row.returned_at]]) {
          if (at) history.push({ stage: key, message: stageLabels[key], at: timestamp(at) });
        }
      }
      return { id: row.request_id ?? row.rental_id, requestId: row.request_id, rentalId: row.rental_id, itemTitle: row.title, image: row.image, start: dateString(row.starts_on ?? row.request_start), end: dateString(row.due_on ?? row.ends_on), status: stageLabels[stage] || stage, stage, amount: row.amount != null ? Number(row.amount) : row.quoted_amount != null ? Number(row.quoted_amount) : null, paid: Number(row.paid), note: row.public_note, returned: stage === 'returned', events: history };
    });
    const measurements = await client.query(`SELECT id,measurements,created_at FROM client_measurements WHERE client_id=$1 ORDER BY created_at DESC`, [profile.clientId]);
    const legacy = await client.query(`SELECT t.id,t.measurements,t.created_at FROM tailor_orders t JOIN rentals r ON r.id=t.rental_id WHERE r.client_id=$1 AND NULLIF(trim(t.measurements),'') IS NOT NULL ORDER BY t.created_at DESC`, [profile.clientId]);
    const notifications = await client.query('SELECT * FROM notifications WHERE client_id=$1 ORDER BY created_at DESC LIMIT 50', [profile.clientId]);
    const unread = await client.query('SELECT COUNT(*)::int AS count FROM notifications WHERE client_id=$1 AND read_at IS NULL', [profile.clientId]);
    return { profile, bookings, measurements: [...measurements.rows.map(row => ({ id: row.id, values: row.measurements, at: timestamp(row.created_at) })), ...legacy.rows.map(row => ({ id: row.id, values: null, description: row.measurements, at: timestamp(row.created_at) }))], notifications: notifications.rows.map(row => ({ id: row.id, title: row.title, message: row.message, at: timestamp(row.created_at), read: !!row.read_at, requestId: row.request_id })), unread: unread.rows[0].count };
  });
}

export async function saveMeasurements(adminId: string, payload: Record<string, unknown>) {
  allowedUpdates(payload, ['clientId','measurements']);
  const clientId = text(payload.clientId, 'Cliente');
  await assertMeasurementAccess(adminId, clientId);
  requireValue(payload.measurements && typeof payload.measurements === 'object' && !Array.isArray(payload.measurements), 'Informe as medidas em centímetros.');
  const values = payload.measurements as Record<string, unknown>;
  allowedUpdates(values, Object.keys(measurementLabels));
  requireValue(Object.keys(values).length > 0 && Object.values(values).every(value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 300), 'As medidas devem ficar entre 0 e 300 cm.');
  if (!(await query('SELECT id FROM clients WHERE id=$1', [clientId])).rowCount) throw new HttpError(404, 'Cliente não encontrado.');
  await query('INSERT INTO client_measurements(id,client_id,taken_by,measurements) VALUES ($1,$2,$3,$4)', [randomUUID(), clientId, adminId, JSON.stringify(values)]);
}
