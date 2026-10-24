import { NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { catalog } from '../../../../lib/customer-reservations';
import { query } from '../../../../lib/db';
export const GET=api('cliente',async(request,_context,user)=>{
 const [items,options]=await Promise.all([catalog(new URL(request.url).searchParams,user.id),query('SELECT DISTINCT price_category,size FROM inventory')]);
 return NextResponse.json({items,categories:[...new Set(options.rows.map(row=>row.price_category).filter(Boolean))].sort(),sizes:[...new Set(options.rows.map(row=>row.size))].sort((a,b)=>a-b)});
});
