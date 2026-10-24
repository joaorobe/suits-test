import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { resolveClientLink } from '../../../../lib/customers';
import { text } from '../../../../lib/rules';
export const POST=api('admin',async request=>{const payload=await readBody(request);await resolveClientLink(text(payload.userId,'Conta'),text(payload.clientId,'Cliente'));return NextResponse.json({success:true});});
