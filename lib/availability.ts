import type { PoolClient } from 'pg';
import { HttpError } from './rules';

export async function available(client: PoolClient, itemId: string, start: string, end: string, excludeRequest?: string, excludeRental?: string) {
  const result = await client.query(`SELECT
    EXISTS(SELECT 1 FROM reservation_requests q JOIN inventory i ON i.id=q.inventory_id WHERE inventory_id=$1 AND q.status='pending'
      AND starts_on-i.preparation_days <= $3::date+(SELECT laundry_days FROM inventory WHERE id=$1)
      AND ends_on+i.laundry_days >= $2::date-(SELECT preparation_days FROM inventory WHERE id=$1) AND q.id IS DISTINCT FROM $4::text)
    OR EXISTS(SELECT 1 FROM rentals WHERE inventory_id=$1 AND returned_at IS NULL
      AND id IS DISTINCT FROM $5::text AND COALESCE(starts_on,(created_at AT TIME ZONE 'America/Sao_Paulo')::date)-(SELECT preparation_days FROM inventory WHERE id=$1) <= $3::date+(SELECT laundry_days FROM inventory WHERE id=$1)
      AND (due_on+(SELECT laundry_days FROM inventory WHERE id=$1) >= $2::date-(SELECT preparation_days FROM inventory WHERE id=$1) OR (stage IN ('out','preparing','ready') AND due_on < (now() AT TIME ZONE 'America/Sao_Paulo')::date)))
    OR EXISTS(SELECT 1 FROM rentals r JOIN inventory i ON i.id=r.inventory_id WHERE inventory_id=$1 AND returned_at IS NOT NULL AND i.laundry_days>0
      AND (returned_at AT TIME ZONE 'America/Sao_Paulo')::date <= $3::date+i.laundry_days
      AND (returned_at AT TIME ZONE 'America/Sao_Paulo')::date+i.laundry_days >= $2::date-i.preparation_days)
    OR EXISTS(SELECT 1 FROM inventory_blocks b JOIN inventory i ON i.id=b.inventory_id WHERE inventory_id=$1 AND cancelled_at IS NULL
      AND starts_on <= $3::date+i.laundry_days AND ends_on >= $2::date-i.preparation_days)
    OR EXISTS(SELECT 1 FROM return_orders WHERE item_id=$1 AND status!='Devolvido' AND rental_id IS NULL)
    AS conflict`, [itemId, start, end, excludeRequest ?? null, excludeRental ?? null]);
  return !result.rows[0].conflict;
}

export async function assertAvailable(client: PoolClient, itemId: string, start: string, end: string, excludeRequest?: string, excludeRental?: string) {
  if (!await available(client, itemId, start, end, excludeRequest, excludeRental)) throw new HttpError(409, 'Este traje tem reserva, solicitação ou bloqueio operacional nesse período. Escolha outras datas.');
}
