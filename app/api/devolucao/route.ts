import { assertAvailable } from '../../../lib/availability';
import { rentalEvent } from '../../../lib/notifications';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { api, readBody } from '../../../lib/api';
import { getReturnOrders } from '../../../lib/data';
import { withTransaction } from '../../../lib/db';
import { HttpError, isoDate, money, requireValue, text } from '../../../lib/rules';

export const GET = api('admin', async () => NextResponse.json(await getReturnOrders()));
export const POST = api('admin', async () => NextResponse.json({ message: 'Crie devoluções pelo fluxo de reserva.' }, { status: 409 }));
export const PATCH = api('admin', async request => {
  const payload = await readBody(request);
  const order = text(payload.order, 'Pedido');
  if ('dueDate' in payload) {
    const due = isoDate(payload.dueDate);
    await withTransaction(async client => {
      const result = await client.query('SELECT * FROM return_orders WHERE order_id=$1 FOR UPDATE', [order]);
      const current = result.rows[0];
      if (!current) throw new HttpError(404, 'Pedido não encontrado.');
      if (current.status === 'Devolvido') throw new HttpError(409, 'Este pedido já foi devolvido.');
      await client.query('SELECT id FROM inventory WHERE id=$1 FOR UPDATE',[current.item_id]);
      if(current.rental_id){
        const rental=(await client.query('SELECT * FROM rentals WHERE id=$1 FOR UPDATE',[current.rental_id])).rows[0];
        const request=(await client.query('SELECT id FROM reservation_requests WHERE rental_id=$1',[rental.id])).rows[0];
        const start=typeof rental.starts_on==='string'?rental.starts_on.slice(0,10):rental.starts_on.toISOString().slice(0,10);
        requireValue(due>=start,'A devolução não pode ser anterior à retirada.');
        await assertAvailable(client,current.item_id,start,due,request?.id,rental.id);
        if(request)await client.query('UPDATE reservation_requests SET ends_on=$1,updated_at=now() WHERE id=$2',[due,request.id]);
        await rentalEvent(client,rental.id,rental.stage,'A data de devolução foi atualizada para '+due.split('-').reverse().join('/')+'.');
      }
      await client.query("UPDATE return_orders SET due_date=$1,due_on=$2,status='Aguardando' WHERE order_id=$3", [due, due, order]);
      if (current.rental_id) await client.query('UPDATE rentals SET due_on=$1 WHERE id=$2', [due, current.rental_id]);
    });
    return NextResponse.json((await getReturnOrders()).find(item => item.order === order));
  }
  requireValue(payload.destination === 'inventario' || payload.destination === 'lavanderia', 'Destino inválido.');
  const fee = money(payload.damageFee ?? 0, 'Multa', true);
  await withTransaction(async client => {
    const result = await client.query('SELECT * FROM return_orders WHERE order_id=$1 FOR UPDATE', [order]);
    const current = result.rows[0];
    if (!current) throw new HttpError(404, 'Pedido não encontrado.');
    if (current.status === 'Devolvido') throw new HttpError(409, 'Esta devolução já foi confirmada.');
    const item = await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [current.item_id]);
    if (!item.rowCount) throw new HttpError(404, 'Traje não encontrado.');
    if (item.rows[0].status !== 'Alugado') throw new HttpError(409, 'O traje precisa estar retirado para confirmar a devolução.');
    if (item.rows[0].holding_rental_id && item.rows[0].holding_rental_id !== current.rental_id) throw new HttpError(409, 'O traje está retirado em outro aluguel. Confira o pedido.');
    if (current.rental_id) {
      const rental = (await client.query('SELECT stage,returned_at FROM rentals WHERE id=$1 FOR UPDATE', [current.rental_id])).rows[0];
      if (!rental || rental.stage !== 'out' || rental.returned_at) throw new HttpError(409, 'Registre a retirada deste aluguel antes de confirmar sua devolução.');
    }
    const returnedAt = new Date().toISOString();
    const laundry = payload.destination === 'lavanderia';
    await client.query("UPDATE return_orders SET status='Devolvido',returned_date=$1,penalty=$2,damage_fee=$3,laundry_status=$4,action='Entregue' WHERE order_id=$5", [returnedAt, fee ? 'R$ ' + fee.toFixed(2) : '-', fee, laundry ? 'Em lavanderia' : 'Concluído', order]);
    await client.query("UPDATE inventory SET status=$1,location=$2,stock=$3,action=$4,holding_rental_id=NULL WHERE id=$5", [laundry ? 'Lavanderia' : 'Disponível', laundry ? 'Lavanderia' : 'Estoque Central', laundry ? 0 : 1, laundry ? 'Ver Pedido' : 'Reservar Traje', current.item_id]);
    if (current.rental_id) {
      await client.query("UPDATE rentals SET returned_at=$1,stage='returned' WHERE id=$2", [returnedAt, current.rental_id]);
      await rentalEvent(client,current.rental_id,'returned','Devolução registrada pela alfaiataria. Obrigado por escolher o Suits.');
    }
    if (fee > 0) await client.query("INSERT INTO payments(id,item_id,item_title,plan,payment_type,amount,entry_amount,paid_amount,status,client_name,rental_id) VALUES ($1,$2,$3,'Diário','Multa',$4,0,0,'Pendente',$5,$6)", ['PAY-' + randomUUID(), current.item_id, 'Multa - ' + current.item, fee, current.client, current.rental_id]);
  });
  const updated = (await getReturnOrders()).find(item => item.order === order);
  return NextResponse.json(updated);
});
