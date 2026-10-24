import { NextResponse } from 'next/server';
import { api } from '../../../lib/api';
import { customerData } from '../../../lib/customer-reservations';
export const GET=api('cliente',async(_request,_context,user)=>NextResponse.json(await customerData(user.id)));
