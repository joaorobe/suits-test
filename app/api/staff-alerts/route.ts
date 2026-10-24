import { NextResponse } from 'next/server';
import { api } from '../../../lib/api';
import { query } from '../../../lib/db';
import { operationsData } from '../../../lib/operations';
import { today } from '../../../lib/rules';
export const GET = api(['admin','costureira'], async (_request,_context,user) => {
  if(user.role==='admin') return NextResponse.json({alerts:(await operationsData(today(),today())).alerts});
  const result=await query(`SELECT t.id,i.title,to_char(r.starts_on,'YYYY-MM-DD') AS date,
    CASE WHEN r.starts_on < $2::date THEN 'Retirada prevista já passou. Confira o ajuste com a administração.' ELSE 'Ajuste pendente para retirada próxima.' END AS message
    FROM tailor_orders t JOIN inventory i ON i.id=t.inventory_id JOIN rentals r ON r.id=t.rental_id
    WHERE t.assigned_to=$1 AND t.status!='Finalizado' AND t.confirmed_at IS NULL AND r.returned_at IS NULL AND r.starts_on <= $2::date+2 ORDER BY r.starts_on,t.created_at`,[user.id,today()]);
  return NextResponse.json({alerts:result.rows});
});
