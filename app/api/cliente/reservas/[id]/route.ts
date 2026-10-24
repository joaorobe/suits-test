import { NextResponse } from 'next/server';
import { api } from '../../../../../lib/api';
import { cancelRequest, customerData } from '../../../../../lib/customer-reservations';
import { HttpError } from '../../../../../lib/rules';
type Context={params:Promise<{id:string}>};
export const GET=api<Context>('cliente',async(_request,context,user)=>{
 const {id}=await context.params;const booking=(await customerData(user.id)).bookings.find(item=>item.id===id);
 if(!booking)throw new HttpError(404,'Reserva não encontrada.');return NextResponse.json(booking);
});
export const DELETE=api<Context>('cliente',async(_request,context,user)=>{await cancelRequest(user.id,(await context.params).id);return NextResponse.json({success:true});});
