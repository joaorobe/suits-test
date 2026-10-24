import { NextResponse } from 'next/server';
import { api } from '../../../../lib/api';
import { query } from '../../../../lib/db';
export const GET=api('admin',async()=>{
 const [requests,links,clients,tailors]=await Promise.all([
 query(`SELECT q.*,to_char(q.starts_on,'YYYY-MM-DD') AS start,to_char(q.ends_on,'YYYY-MM-DD') AS "end",c.name AS client_name,c.email,c.phone,i.title,i.image,r.stage
 FROM reservation_requests q JOIN clients c ON c.id=q.client_id JOIN inventory i ON i.id=q.inventory_id LEFT JOIN rentals r ON r.id=q.rental_id ORDER BY q.created_at DESC LIMIT 200`),
 query(`SELECT u.id,u.name,u.cpf,u.email,u.phone,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name,'linked',c.user_id IS NOT NULL)) FROM clients c WHERE lower(trim(c.email))=u.email AND regexp_replace(c.phone,'\\D','','g')=u.phone),'[]'::json) AS candidates FROM client_link_requests l JOIN users u ON u.id=l.user_id WHERE l.status='pending' ORDER BY l.created_at`),
 query('SELECT id,name,email,phone FROM clients ORDER BY name LIMIT 300'),query("SELECT id,name FROM users WHERE role='costureira' ORDER BY name")]);
 return NextResponse.json({requests:requests.rows,links:links.rows,clients:clients.rows,tailors:tailors.rows});
});
