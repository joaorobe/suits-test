import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { updateCustomer } from '../../../../lib/customers';
export const PATCH=api('cliente',async(request,_context,user)=>NextResponse.json(await updateCustomer(user.id,await readBody(request))));
