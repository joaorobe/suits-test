import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { today } from '../lib/rules';

test('operational buffers, maintenance races, measurement ownership and reports',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='operations_test_'+randomUUID().replaceAll('-','');const url=new URL(process.env.TEST_DATABASE_URL!);const owner=new pg.Client({connectionString:url.toString()});await owner.connect();await owner.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=url.toString();
 const {query,closeDatabase,withTransaction}=await import('../lib/db');const {updateOperations,operationsData}=await import('../lib/operations');const {requestReservation,saveMeasurements,catalog}=await import('../lib/customer-reservations');const {available}=await import('../lib/availability');const {measurementClients}=await import('../lib/measurements');
 const day=(offset:number)=>new Date(Date.parse(today()+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
 const settings={action:'settings',itemId:'item',preparationDays:1,laundryDays:2,events:['Casamento'],styles:['Clássico'],measurements:{chest:106,waist:86}};
 try{
  await query("INSERT INTO users(id,cpf,password,name,role) VALUES ('admin','12345678910','unused','Admin','admin'),('tailor','11122233344','unused','Tailor','costureira'),('other','55566677788','unused','Other','costureira'),('customer','98765432100','unused','Customer','cliente')");
  await query("INSERT INTO clients(id,name,email,phone,user_id) VALUES ('person','Customer','customer@example.com','11999999999','customer'),('other-person','Other person','other@example.com','11999999999',NULL)");
  await query("INSERT INTO inventory(id,title,subtitle,sku,status,size,color,location,stock,image,action,price) VALUES ('item','Traje','Social','SKU','Disponível',42,'Preto','Estoque',1,'/terno1.jpg','Reservar Traje',100)");
  await updateOperations('admin',settings);
  const booked=await requestReservation('customer',{itemId:'item',start:day(5),end:day(6)});
  assert.ok(booked.id);
  await assert.rejects(()=>requestReservation('customer',{itemId:'item',start:day(9),end:day(9)}),/período/);
  assert.ok(await withTransaction(client=>available(client,'item',day(10),day(10))));
  await assert.rejects(()=>updateOperations('admin',{action:'block',itemId:'item',start:day(7),end:day(8),reason:'Manutenção'}),/período/);
  const future=await requestReservation('customer',{itemId:'item',start:day(10),end:day(10)});assert.ok(future.id);
  await assert.rejects(()=>updateOperations('admin',{...settings,laundryDays:4}),/período/);
  assert.equal((await query("SELECT laundry_days FROM inventory WHERE id='item'")).rows[0].laundry_days,2);
  const race=await Promise.allSettled([requestReservation('customer',{itemId:'item',start:day(20),end:day(20)}),updateOperations('admin',{action:'block',itemId:'item',start:day(20),end:day(20),reason:'Ajuste'})]);
  assert.equal(race.filter(value=>value.status==='fulfilled').length,1);
  await saveMeasurements('admin',{clientId:'person',measurements:{chest:100,waist:80}});
  await assert.rejects(()=>saveMeasurements('tailor',{clientId:'person',measurements:{chest:101}}),/não pode/);
  await query("INSERT INTO rentals(id,client_id,inventory_id,plan,amount,due_on,starts_on,stage) VALUES ('rental','person','item','Diário',100,$1,$2,'scheduled')",[day(25),day(24)]);
  await query("INSERT INTO tailor_orders(id,inventory_id,assigned_to,adjustment_type,description,status,rental_id) VALUES ('adjustment','item','tailor','Barra','Ajuste','Novo','rental')");
  await saveMeasurements('tailor',{clientId:'person',measurements:{chest:101,waist:81}});
  assert.equal((await measurementClients({id:'tailor',name:'Tailor',role:'costureira'})).history.length,2);
  assert.equal((await measurementClients({id:'other',name:'Other',role:'costureira'})).history.length,0);
  await assert.rejects(()=>saveMeasurements('tailor',{clientId:'other-person',measurements:{chest:90}}),/não pode/);
  await assert.rejects(()=>saveMeasurements('customer',{clientId:'person',measurements:{chest:90}}),/não pode/);
  const items=await catalog(new URLSearchParams({start:day(30),end:day(30),recommend:'true',event:'Casamento',color:'Preto',budget:'100'}),'customer');
  assert.equal(items[0].recommendation?.score,100);assert.equal(items[0].recommendation?.comparedMeasurements,2);
  const data=await operationsData(day(0),day(30));assert.ok(data.calendar.length>=3);assert.ok(data.alerts.some(alert=>alert.kind==='pending'));assert.ok(data.audit.length>=1);
  const migrations=(await query("SELECT count(*)::int AS n FROM schema_migrations WHERE version='003_operations_recommendations'")).rows[0].n;assert.equal(migrations,1);
 }finally{await closeDatabase();await owner.query(`DROP SCHEMA ${schema} CASCADE`);await owner.end();}
});
