import { NextResponse } from 'next/server';
import { api, readBody } from '../../../lib/api';
import { getPayments } from '../../../lib/data';
import { recordPayment } from '../../../lib/payments';

export const GET = api('admin', async () => NextResponse.json(await getPayments()));
export const POST = api('admin', async () => NextResponse.json({ message: 'Crie pagamentos pelo fluxo de reserva ou devolução.' }, { status: 409 }));
export const PATCH = api('admin', async request => NextResponse.json(await recordPayment(await readBody(request))));
