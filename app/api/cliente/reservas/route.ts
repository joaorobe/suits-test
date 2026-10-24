import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { requestReservation } from '../../../../lib/customer-reservations';
export const POST=api('cliente',async(request,_context,user)=>NextResponse.json(await requestReservation(user.id,await readBody(request)),{status:201}));
