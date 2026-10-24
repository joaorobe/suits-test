import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

export async function requestEvent(client: PoolClient, requestId: string, stage: string, message: string) {
  const eventId = randomUUID();
  await client.query('INSERT INTO reservation_events(id,request_id,stage,message) VALUES ($1,$2,$3,$4)', [eventId, requestId, stage, message]);
  await client.query(`INSERT INTO notifications(id,client_id,request_id,dedupe_key,title,message)
    SELECT $1,client_id,id,$2,$3,$4 FROM reservation_requests WHERE id=$5`, [randomUUID(), 'event:' + eventId, message, message, requestId]);
}

export async function rentalEvent(client: PoolClient, rentalId: string, stage: string, message: string) {
  const request = await client.query('SELECT id FROM reservation_requests WHERE rental_id=$1', [rentalId]);
  if (request.rows[0]) await requestEvent(client, request.rows[0].id, stage, message);
}

export async function remindReturns(client: PoolClient, clientId: string) {
  await client.query(`INSERT INTO notifications(id,client_id,request_id,dedupe_key,title,message)
    SELECT 'pickup-'||r.id||'-'||r.starts_on::text,r.client_id,q.id,'pickup:'||r.id||':'||r.starts_on::text,
      'Confira sua retirada', 'A retirada de '||COALESCE(r.item_title,'seu traje')||' está prevista para '||to_char(r.starts_on,'DD/MM/YYYY')||'. Acompanhe a liberação pela alfaiataria.'
    FROM rentals r JOIN reservation_requests q ON q.rental_id=r.id
    WHERE r.client_id=$1 AND r.stage IN ('scheduled','awaiting_measurements','preparing','ready') AND r.returned_at IS NULL
      AND r.starts_on BETWEEN (now() AT TIME ZONE 'America/Sao_Paulo')::date AND (now() AT TIME ZONE 'America/Sao_Paulo')::date+2
    ON CONFLICT(dedupe_key) DO NOTHING`, [clientId]);
  await client.query(`INSERT INTO notifications(id,client_id,request_id,dedupe_key,title,message)
    SELECT 'due-'||r.id||'-'||r.due_on::text,r.client_id,q.id,'due:'||r.id||':'||r.due_on::text,
      'Confira a data de devolução', 'A devolução de '||COALESCE(r.item_title,'seu traje')||' está prevista para '||to_char(r.due_on,'DD/MM/YYYY')||'.'
    FROM rentals r LEFT JOIN reservation_requests q ON q.rental_id=r.id
    WHERE r.client_id=$1 AND r.stage='out' AND r.returned_at IS NULL
      AND r.due_on <= (now() AT TIME ZONE 'America/Sao_Paulo')::date+2
    ON CONFLICT(dedupe_key) DO NOTHING`, [clientId]);
}

