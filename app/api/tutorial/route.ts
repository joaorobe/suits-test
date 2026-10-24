import { NextResponse } from 'next/server';
import { api } from '../../../lib/api';
import { query } from '../../../lib/db';
export const GET=api(null,async(_request,_context,user)=>{
  const progress=await query('SELECT 1 FROM tutorial_progress WHERE user_id=$1 AND version=1',[user.id]);
  return NextResponse.json({role:user.role,completed:!!progress.rowCount});
});
export const POST=api(null,async(_request,_context,user)=>{
  await query('INSERT INTO tutorial_progress(user_id,version) VALUES($1,1) ON CONFLICT DO NOTHING',[user.id]);
  return NextResponse.json({success:true});
});
