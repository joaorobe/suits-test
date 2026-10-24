import { rentalEvent } from '../../../lib/notifications';
import { NextResponse } from 'next/server';
import { api, readBody } from '../../../lib/api';
import { getTailorOrders, getTailorOrderById, rowToInventoryItem } from '../../../lib/data';
import { withTransaction } from '../../../lib/db';
import { allowedUpdates, HttpError, requireValue, text } from '../../../lib/rules';

export const GET = api(["admin", "costureira"], async (request, _context, user) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    const order = await getTailorOrderById(id);
    if (!order || (user.role === 'costureira' && order.assignedTo !== user.id)) throw new HttpError(404, 'Pedido não encontrado.');
    return NextResponse.json(order);
  }
  return NextResponse.json(await getTailorOrders(user.role === 'costureira' ? user.id : url.searchParams.get('assignedTo') || undefined));
});
export const POST = api('admin', async () => NextResponse.json({ message: 'Crie pedidos de ajuste pelo fluxo de reserva.' }, { status: 409 }));
export const PATCH = api(["admin", "costureira"], async (request, _context, user) => {
  const { id: rawId, confirmCompletion, ...updates } = await readBody(request);
  const id = text(rawId, 'Pedido');
  allowedUpdates(updates, user.role === 'admin' ? ['notes'] : ['notes','status','completedAt']);
  if ('notes' in updates) requireValue(typeof updates.notes === 'string' && updates.notes.length <= 4000, 'Observação inválida.');
  if (confirmCompletion && user.role !== 'admin') throw new HttpError(403, 'Apenas o administrador pode confirmar a retirada.');
  let inventory;
  await withTransaction(async client => {
    const reference=(await client.query('SELECT inventory_id,assigned_to FROM tailor_orders WHERE id=$1',[id])).rows[0];
    if(!reference||(user.role==='costureira'&&reference.assigned_to!==user.id))throw new HttpError(404,'Pedido não encontrado.');
    await client.query('SELECT id FROM inventory WHERE id=$1 FOR UPDATE',[reference.inventory_id]);
    const found = await client.query('SELECT * FROM tailor_orders WHERE id=$1 FOR UPDATE', [id]);
    const order = found.rows[0];
    if (!order || (user.role === 'costureira' && order.assigned_to !== user.id)) throw new HttpError(404, 'Pedido não encontrado.');
    if (order.confirmed_at) throw new HttpError(409, 'O ajuste já foi confirmado pelo administrador.');
    if (confirmCompletion) {
      if (order.status !== 'Finalizado') throw new HttpError(409, 'A costureira precisa finalizar o ajuste.');
      const online=order.rental_id?(await client.query('SELECT id FROM reservation_requests WHERE rental_id=$1',[order.rental_id])).rows[0]:null;
      const item = await client.query("UPDATE inventory SET status=$1,location=$2,action='Ver Pedido' WHERE id=$3 AND status='Costureira' AND (holding_rental_id IS NULL OR holding_rental_id=$4) RETURNING *", [online?'Reservado':'Alugado',online?'Pronto para retirada':'Retirado',order.inventory_id,order.rental_id]);
      if (!item.rowCount) throw new HttpError(409, 'O traje não está mais em costura.');
      inventory = rowToInventoryItem(item.rows[0]);
      if(order.rental_id){
        await client.query("UPDATE rentals SET stage=$1,ready_at=CASE WHEN $1='ready' THEN now() ELSE ready_at END,picked_up_at=CASE WHEN $1='out' THEN now() ELSE picked_up_at END WHERE id=$2",[online?'ready':'out',order.rental_id]);
        await rentalEvent(client,order.rental_id,online?'ready':'out',online?'Seu traje está pronto para retirada.':'Retirada registrada pela alfaiataria.');
      }
      await client.query('UPDATE tailor_orders SET confirmed_at=now() WHERE id=$1', [id]);
    }
    const transitions: Record<string, string[]> = { Novo: ['Iniciado','Observação'], Iniciado: ['Finalizado','Observação'], Finalizado: ['Observação'], Observação: ['Novo','Iniciado'] };
    const status = updates.status ?? order.status;
    requireValue(status === order.status || transitions[order.status]?.includes(status), 'Transição de status inválida.');
    await client.query("UPDATE tailor_orders SET notes=$1,status=$2,completed_at=CASE WHEN $2='Finalizado' THEN COALESCE(completed_at,now()) ELSE NULL END,updated_at=now() WHERE id=$3", [updates.notes ?? order.notes, status, id]);
  });
  const order = await getTailorOrderById(id);
  return NextResponse.json(confirmCompletion ? { order, inventory } : order);
});
export const DELETE = api('admin', async () => NextResponse.json({ message: 'Pedidos de ajuste vinculados ao histórico não podem ser excluídos.' }, { status: 409 }));
