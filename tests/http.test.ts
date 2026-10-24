import test from 'node:test';
import assert from 'node:assert/strict';

test('HTTP: server sessions, roles, reservations, receipts, tailor ownership and returns', { skip: !process.env.TEST_APP_URL }, async () => {
  const root = process.env.TEST_APP_URL!;
  async function request(path: string, method = 'GET', body?: unknown, cookie?: string, origin?: string) {
    return fetch(root + path, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: body ? JSON.stringify(body) : undefined });
  }
  for (const path of ['/api/dashboard','/api/inventory','/api/payments','/api/devolucao','/api/users?role=costureira','/api/tailor-orders']) assert.equal((await request(path)).status, 401, path);
  assert.equal((await request('/inventory')).status, 307);
  assert.equal((await request('/api/payments','GET',undefined,'suits-auth-user=' + encodeURIComponent(JSON.stringify({role:'admin'})))).status,401);
  assert.equal((await request('/api/auth','POST',{cpf:'12345678910',password:'wrong'})).status,401);
  async function login(cpf: string) {
    const response = await request('/api/auth','POST',{cpf,password:'validation-password'});
    assert.equal(response.status,200,await response.clone().text());
    const header=response.headers.getSetCookie().find(value=>value.startsWith('suits-session='))!;
    assert.match(header,/HttpOnly/i);
    assert.match(header,/SameSite=lax/i);
    return header.split(';')[0];
  }
  const admin = await login('12345678910');
  const tailor = await login('11122233344');
  const other = await login('55566677788');
  assert.equal((await request('/api/payments','GET',undefined,tailor)).status,403);
  assert.equal((await request('/api/auth','DELETE',undefined,admin,'https://other.example')).status,403);
  const itemResponse = await request('/api/inventory','POST',{title:'Traje HTTP',subtitle:'Completo',size:42,color:'Preto',price:290},admin);
  assert.equal(itemResponse.status,201,await itemResponse.clone().text());
  const item=await itemResponse.json();
  const reservation=await request('/api/reservations','POST',{itemId:item.id,plan:'Semanal',clientName:'Cliente HTTP',clientPhone:'11999999999',clientEmail:'http@example.com',entryAmount:50,sendToCostureira:true,assignedTo:'tailor',adjustmentType:'Barra',description:'Ajustar 2cm'},admin);
  assert.equal(reservation.status,201,await reservation.clone().text());
  const reserved=await reservation.json();
  assert.equal(reserved.payment.amount,1421);
  const orders=await (await request('/api/tailor-orders','GET',undefined,tailor)).json();
  const order=orders.find((entry: {inventoryId:string})=>entry.inventoryId===item.id);
  assert.ok(order);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Iniciado'},other)).status,404);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Iniciado'},admin)).status,400);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Finalizado'},tailor)).status,400);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Iniciado'},tailor)).status,200);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Finalizado'},tailor)).status,200);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,confirmCompletion:true},admin)).status,200);
  assert.equal((await request('/api/tailor-orders','PATCH',{id:order.id,status:'Observação'},tailor)).status,409);
  const receipt={id:reserved.payment.id,paidAmount:50,expectedPaidAmount:0};
  assert.equal((await request('/api/payments','PATCH',receipt,admin)).status,200);
  assert.equal((await request('/api/payments','PATCH',receipt,admin)).status,409);
  const returns=await (await request('/api/devolucao','GET',undefined,admin)).json();
  const returned=returns.find((entry:{itemId:string})=>entry.itemId===item.id);
  assert.equal(returned.amountPaid,50);
  assert.equal((await request('/api/devolucao','PATCH',{order:returned.order,dueDate:'2026-02-30'},admin)).status,400);
  const corrected=await request('/api/devolucao','PATCH',{order:returned.order,dueDate:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})},admin);
  assert.equal(corrected.status,200,await corrected.clone().text());
  assert.equal((await corrected.json()).status,'Aguardando');
  const confirmation={order:returned.order,destination:'inventario',damageFee:50,itemId:'forged-item'};
  const done=await request('/api/devolucao','PATCH',confirmation,admin);
  assert.equal(done.status,200,await done.clone().text());
  assert.equal((await done.json()).status,'Devolvido');
  assert.equal((await request('/api/devolucao','PATCH',confirmation,admin)).status,409);
  assert.equal((await (await request('/api/inventory/'+item.id,'GET',undefined,admin)).json()).status,'Disponível');
  assert.equal((await request('/api/auth','DELETE',undefined,admin)).status,200);
  assert.equal((await request('/api/payments','GET',undefined,admin)).status,401);
});
