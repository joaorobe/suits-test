import { NextResponse } from 'next/server';
import { api, readBody } from '../../../../../lib/api';
import { manageRequest } from '../../../../../lib/customer-reservations';
export const PATCH=api<{params:Promise<{id:string}>}>('admin',async(request,context)=>{await manageRequest((await context.params).id,await readBody(request));return NextResponse.json({success:true});});
