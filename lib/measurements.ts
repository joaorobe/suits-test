import type { SessionUser } from './auth';
import { query } from './db';
import { HttpError } from './rules';

export async function assertMeasurementAccess(userId: string, clientId: string) {
  const allowed = await query(`SELECT 1 FROM users u WHERE u.id=$1 AND (u.role='admin' OR u.role='costureira' AND EXISTS(
    SELECT 1 FROM tailor_orders t JOIN rentals r ON r.id=t.rental_id WHERE t.assigned_to=u.id AND r.client_id=$2 AND r.returned_at IS NULL AND t.confirmed_at IS NULL))`, [userId, clientId]);
  if (!allowed.rowCount) throw new HttpError(403, 'Você não pode registrar medidas deste cliente.');
}

export async function measurementClients(user: SessionUser) {
  const clients = await query(`SELECT c.id,c.name FROM clients c WHERE $1::boolean OR EXISTS(SELECT 1 FROM tailor_orders t JOIN rentals r ON r.id=t.rental_id WHERE t.assigned_to=$2 AND r.client_id=c.id AND r.returned_at IS NULL AND t.confirmed_at IS NULL) ORDER BY c.name`, [user.role === 'admin', user.id]);
  const ids = clients.rows.map(row => row.id);
  const history = await query(`SELECT m.id,m.client_id AS "clientId",m.measurements AS values,m.created_at AS at,u.name AS professional FROM client_measurements m JOIN users u ON u.id=m.taken_by WHERE m.client_id=ANY($1::text[]) ORDER BY m.created_at DESC,m.id DESC`, [ids]);
  return { clients: clients.rows, history: history.rows };
}
