import { NextResponse } from 'next/server';
import { api, readBody } from '../../../lib/api';
import { measurementClients } from '../../../lib/measurements';
import { saveMeasurements } from '../../../lib/customer-reservations';
export const GET = api(['admin','costureira'], async (_request,_context,user) => NextResponse.json(await measurementClients(user)));
export const POST = api(['admin','costureira'], async (request,_context,user) => {
  await saveMeasurements(user.id,await readBody(request));
  return NextResponse.json({success:true},{status:201});
});
