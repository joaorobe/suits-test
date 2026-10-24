import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { requireClientId } from '../../../../lib/customers';
import { query } from '../../../../lib/db';
import { HttpError, text } from '../../../../lib/rules';
export const PATCH=api('cliente',async(request,_context,user)=>{
 const clientId=await requireClientId(user.id);const payload=await readBody(request);const id=text(payload.id,'Aviso');
 const changed=await query('UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND client_id=$2 RETURNING id',[id,clientId]);
 if(!changed.rowCount)throw new HttpError(404,'Aviso não encontrado.');return NextResponse.json({success:true});
});
