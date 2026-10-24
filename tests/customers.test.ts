import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { validCpf, period, quote } from '../lib/customer-rules';

export function cpfFor(base: string) {
  let value=base;
  for(let length=9;length<=10;length++)value+=String(([...value].reduce((sum,digit,index)=>sum+Number(digit)*(length+1-index),0)*10)%11%10);
  return value;
}

test('customer CPF, date periods and prices preserve existing daily and weekly rules',()=>{
  assert.ok(validCpf(cpfFor('987654321')));
  assert.equal(validCpf('11111111111'),false);
  assert.equal(validCpf('12345678910'),false);
  assert.throws(()=>period('2026-02-30','2026-03-01',false));
  assert.throws(()=>period('2026-03-02','2026-03-01',false));
  assert.equal(period('2026-03-01','2026-03-08',false).days,7);
  assert.equal(quote(290,7),1421);
  assert.equal(quote(290,1),290);
  assert.equal(quote(null,7),null);
});

test('PostgreSQL customer portal: safe linkage, isolated history, concurrent dates and real stages',{skip:!process.env.TEST_DATABASE_URL},async()=>{
  const schema='customer_test_'+randomUUID().replaceAll('-','');
  const url=new URL(process.env.TEST_DATABASE_URL!);
  const owner=new pg.Client({connectionString:url.toString()});await owner.connect();await owner.query(`CREATE SCHEMA ${schema}`);
  url.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=url.toString();
  const {query,closeDatabase}=await import('../lib/db');
  const {registerCustomer,customerProfile,resolveClientLink}=await import('../lib/customers');
  const {requestReservation,cancelRequest,manageRequest,customerData,saveMeasurements}=await import('../lib/customer-reservations');
  const {reserve}=await import('../lib/rentals');
  const {today}=await import('../lib/rules');
  const day=(offset:number)=>{const value=new Date(today()+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
  const account=(base:string,email:string)=>({name:'Cliente '+base,cpf:cpfFor(base),phone:'11999999999',email,password:'senha-segura123',passwordConfirmation:'senha-segura123'});
  try{
    await query("INSERT INTO users(id,cpf,password,name,role) VALUES ('admin','12345678910','unused','Admin','admin')");
    const first=await registerCustomer(account('987654321','first@example.com'));
    const second=await registerCustomer(account('876543210','second@example.com'));
    assert.equal(first.role,'cliente');
    await assert.rejects(()=>registerCustomer(account('987654321','duplicate@example.com')),/cadastrado/);
    await assert.rejects(()=>registerCustomer({...account('765432109','bad@example.com'),role:'admin'}),/Campo/);
    await query("INSERT INTO clients(id,name,email,phone) VALUES ('legacy','Cliente antigo','legacy@example.com','11999999999')");
    const countBefore=(await query('SELECT count(*)::int AS n FROM clients')).rows[0].n;
    const linked=await registerCustomer(account('654321098','legacy@example.com'));
    assert.equal((await query('SELECT count(*)::int AS n FROM clients')).rows[0].n,countBefore);
    assert.equal((await customerProfile(linked.id)).linkPending,true);
    assert.equal((await customerData(linked.id)).bookings.length,0);
    await resolveClientLink(linked.id,'legacy');
    assert.equal((await customerProfile(linked.id)).clientId,'legacy');
    await query("INSERT INTO inventory(id,title,subtitle,sku,status,size,color,location,stock,image,action,price) VALUES ('item','Traje','Completo','SKU','Disponível',42,'Preto','Estoque',1,'/terno1.jpg','Reservar Traje',290)");
    const input={itemId:'item',start:day(0),end:day(0)};
    const attempts=await Promise.allSettled([requestReservation(first.id,input),requestReservation(second.id,input)]);
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
    const winner=attempts[0].status==='fulfilled'?first:second;const loser=winner.id===first.id?second:first;
    const id=attempts.find(result=>result.status==='fulfilled')!;
    assert.ok(id.status==='fulfilled');const requestId=id.value.id;
    await assert.rejects(()=>cancelRequest(loser.id,requestId),/não encontrada/);
    await assert.rejects(()=>reserve({itemId:'item',clientName:'Presencial',clientPhone:'11999999999',clientEmail:'presencial@example.com',plan:'Diário',entryAmount:50}),/período/);
    const future=await requestReservation(loser.id,{itemId:'item',start:day(1),end:day(2)});
    await manageRequest(requestId,{action:'approve'});
    await manageRequest(future.id,{action:'approve'});
    assert.equal((await query('SELECT count(*)::int AS n FROM rentals')).rows[0].n,2);
    await assert.rejects(()=>manageRequest(requestId,{action:'approve'}),/analisada/);
    const own=await customerData(winner.id);const other=await customerData(loser.id);
    assert.ok(own.notifications.some(item=>item.title==='Confira sua retirada'));
    const reminderCount=own.notifications.filter(item=>item.title==='Confira sua retirada').length;
    assert.equal((await customerData(winner.id)).notifications.filter(item=>item.title==='Confira sua retirada').length,reminderCount);
    assert.equal(own.bookings.length,1);assert.equal(other.bookings.length,1);assert.notEqual(own.bookings[0].id,other.bookings[0].id);
    const profile=await customerProfile(winner.id);
    await saveMeasurements('admin',{clientId:profile.clientId,measurements:{chest:98,waist:82}});
    assert.equal((await customerData(winner.id)).measurements.length,1);
    assert.equal((await customerData(loser.id)).measurements.length,0);
    await manageRequest(requestId,{action:'measurements'});
    await manageRequest(requestId,{action:'prepare'});
    await manageRequest(requestId,{action:'ready'});
    assert.equal((await customerData(winner.id)).bookings[0].stage,'ready');
    await manageRequest(requestId,{action:'pickup'});
    const refreshed=await customerData(winner.id);
    assert.equal(refreshed.bookings[0].stage,'out');
    assert.ok(refreshed.notifications.some(item=>item.title==='Pronto para retirada'));
    assert.ok(refreshed.notifications.some(item=>item.title==='Confira a data de devolução'));
    assert.equal((await query("SELECT count(*)::int AS n FROM inventory")).rows[0].n,1);
  }finally{await closeDatabase();await owner.query(`DROP SCHEMA ${schema} CASCADE`);await owner.end();}
});
