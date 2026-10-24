import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../lib/api';
import { saveMeasurements } from '../../../../lib/customer-reservations';
export const POST=api('admin',async(request,_context,user)=>{await saveMeasurements(user.id,await readBody(request));return NextResponse.json({success:true},{status:201});});
