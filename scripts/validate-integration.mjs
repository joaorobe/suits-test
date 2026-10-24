import { spawn,execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { mkdtemp,writeFile,unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import net from 'node:net';
import pg from 'pg';
const execute=promisify(execFile);const project=fileURLToPath(new URL('../',import.meta.url));
const storage=await mkdtemp(path.join(tmpdir(),'suits-integration-'));const cluster=path.join(storage,'data');
const portable=createRequire(import.meta.resolve('embedded-postgres'));const platform=process.platform==='win32'?'windows':process.platform;
const binaries=await import(pathToFileURL(portable.resolve('@embedded-postgres/'+platform+'-'+process.arch)).href);
const options={cwd:project,windowsHide:true,timeout:45000};let started=false;let server;
const freePort=()=>new Promise((resolve,reject)=>{const socket=net.createServer();socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
function run(args,env){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:project,env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Validação falhou: '+args[0]+' (código '+code+')')));});}
try{
 const password=randomBytes(24).toString('hex');const passwordFile=path.join(storage,'password');await writeFile(passwordFile,password,{mode:0o600});
 await execute(binaries.initdb,['-D',cluster,'-U','postgres','--auth=scram-sha-256','--encoding=UTF8','--locale=C','--pwfile='+passwordFile],options);
 await unlink(passwordFile);
 const port=await freePort();await execute(binaries.pg_ctl,['-D',cluster,'-l',path.join(storage,'postgres.log'),'-o','-h 127.0.0.1 -p '+port,'-w','-t','30','start'],options);started=true;
 const connection=new URL('postgresql://127.0.0.1:'+port+'/postgres');connection.username='postgres';connection.password=password;
 const client=new pg.Client({connectionString:connection.toString()});await client.connect();await client.query('CREATE DATABASE suits_validation');await client.end();connection.pathname='/suits_validation';
 const env={...process.env,SUITS_VALIDATION:'1',DATABASE_URL:connection.toString(),TEST_DATABASE_URL:connection.toString()};delete env.TEST_APP_URL;delete env.SUITS_DEMO;delete env.APP_ORIGIN;
 await run(['--import','tsx','--test','tests/baseline.test.ts','tests/customers.test.ts','tests/database.test.ts','tests/demo.test.ts','tests/recommendations.test.ts','tests/operations.test.ts'],env);
 if(!process.argv.includes('--database-only')){
  await run(['--import','tsx','scripts/seed-validation.ts'],env);
  await run(['node_modules/next/dist/bin/next','build'],env);
  const appPort=await freePort();const url='http://127.0.0.1:'+appPort;
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{cwd:project,env,stdio:'inherit',windowsHide:true});
  let ready=false;for(let attempt=0;attempt<100;attempt++){try{const response=await fetch(url+'/login');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,300));}
  if(!ready)throw Error('O servidor de validação não iniciou.');
  await run(['--import','tsx','--test','tests/http.test.ts','tests/customer-http.test.ts','tests/enhancements-http.test.ts'],{...env,TEST_APP_URL:url});
 }
 console.log('Validação isolada concluída. Nenhum banco compartilhado foi utilizado.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 if(server&&server.exitCode===null){if(process.platform==='win32')await execute('taskkill',['/pid',String(server.pid),'/t','/f'],options).catch(()=>{});else server.kill('SIGTERM');}
 if(started)await execute(binaries.pg_ctl,['-D',cluster,'-m','fast','-w','-t','30','stop'],options);
}
