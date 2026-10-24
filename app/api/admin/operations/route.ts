import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { operationsData, updateOperations } from '../../../../lib/operations';
import { today } from '../../../../lib/rules';
export const GET = api('admin', async request => {
  const params = new URL(request.url).searchParams;
  return NextResponse.json(await operationsData(params.get('start') || today(), params.get('end') || today()));
});
export const POST = api('admin', async (request, _context, user) => {
  await updateOperations(user.id, await readBody(request));
  return NextResponse.json({ success: true });
});
