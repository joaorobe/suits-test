import test from 'node:test';
import assert from 'node:assert/strict';
test('HTTP enhancements: backend permissions, tutorial persistence, planning and recommendations',{skip:!process.env.TEST_APP_URL},async()=>{
 const root=process.env.TEST_APP_URL!;
 const call=(path:string,method='GET',body?:unknown,cookie?:string)=>fetch(root+path,{method,redirect:'manual',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const session=(response:Response)=>response.headers.getSetCookie().find(value=>value.startsWith('suits-session='))!.split(';')[0];
 async function login(cpf:string){const result=await call('/api/auth','POST',{cpf,password:'validation-password'});assert.equal(result.status,200);return session(result);}
 const admin=await login('12345678910'),tailor=await login('11122233344'),other=await login('55566677788');
 let cpf='765123456';for(let size=9;size<=10;size++)cpf+=String(([...cpf].reduce((sum,digit,index)=>sum+Number(digit)*(size+1-index),0)*10)%11%10);
 const registration=await call('/api/register','POST',{name:'Enhanced Customer',cpf,email:'enhanced@example.com',phone:'11966665555',password:'enhanced-password',passwordConfirmation:'enhanced-password'});assert.equal(registration.status,201);const customer=session(registration);
 for(const endpoint of ['/api/admin/operations','/api/measurements','/api/staff-alerts']){
  assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,'GET',undefined,customer)).status,403);
 }
 assert.equal((await call('/api/admin/operations','GET',undefined,tailor)).status,403);
 assert.equal((await call('/operacoes','GET',undefined,tailor)).status,307);
 for(const cookie of [admin,tailor])assert.equal((await call('/medidas','GET',undefined,cookie)).status,200);
 assert.equal((await call('/api/tutorial','GET',undefined,customer)).status,200);
 await call('/api/tutorial','POST',{},customer);
 assert.equal((await(await call('/api/tutorial','GET',undefined,customer)).json()).completed,true);
 const created=await call('/api/inventory','POST',{title:'Traje Enhanced',subtitle:'Social',size:42,color:'Preto',price:100},admin);assert.equal(created.status,201);const item=await created.json();
 const settings={action:'settings',itemId:item.id,preparationDays:1,laundryDays:2,events:['Casamento'],styles:['Clássico'],measurements:{chest:106}};
 assert.equal((await call('/api/admin/operations','POST',settings,customer)).status,403);
 assert.equal((await call('/api/admin/operations','POST',settings,admin)).status,200);
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});const day=(offset:number)=>new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
 const blocked=await call('/api/admin/operations','POST',{action:'block',itemId:item.id,start:day(15),end:day(16),reason:'Manutenção'},admin);assert.equal(blocked.status,200,await blocked.clone().text());
 assert.equal((await call('/api/cliente/reservas','POST',{itemId:item.id,start:day(16),end:day(16)},customer)).status,409);
 const catalog=await(await call('/api/cliente/catalogo?'+new URLSearchParams({start:day(15),end:day(15),recommend:'true',event:'Casamento',color:'Preto',budget:'100'}),'GET',undefined,customer)).json();
 const entry=catalog.items.find((value:{id:string})=>value.id===item.id);assert.equal(entry.available,false);assert.equal(entry.recommendation.score,100);
 const operations=await(await call('/api/admin/operations?start='+today+'&end='+day(30),'GET',undefined,admin)).json();assert.ok(operations.blocks.some((block:{itemId:string})=>block.itemId===item.id));assert.ok(operations.audit.length);
 const own=await(await call('/api/cliente','GET',undefined,customer)).json();
 assert.equal((await call('/api/measurements','POST',{clientId:own.profile.clientId,measurements:{chest:100}},tailor)).status,403);
 assert.equal((await call('/api/measurements','POST',{clientId:own.profile.clientId,measurements:{chest:100}},customer)).status,403);
 assert.equal((await call('/api/measurements','POST',{clientId:own.profile.clientId,measurements:{chest:100}},admin)).status,201);
 const hidden=await(await call('/api/measurements','GET',undefined,other)).json();assert.ok(!hidden.clients.some((client:{id:string})=>client.id===own.profile.clientId));
 assert.equal((await call('/api/staff-alerts','GET',undefined,tailor)).status,200);
 assert.equal((await call('/api/admin/operations?start='+today+'&end='+day(30),'GET',undefined,admin)).status,200);
 assert.equal((await call('/operacoes','GET',undefined,admin)).status,200);
});
