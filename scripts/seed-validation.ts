import { query, closeDatabase } from '../lib/db';
import { hashPassword } from '../lib/passwords.mjs';
if(process.env.SUITS_VALIDATION!=='1')throw Error('Fixture exclusiva da validação isolada.');
async function main(){try {
 for(const [id,cpf,role] of [['admin','12345678910','admin'],['tailor','11122233344','costureira'],['other','55566677788','costureira']]){
  await query('INSERT INTO users(id,cpf,password,name,role) VALUES($1,$2,$3,$4,$5)',[id,cpf,await hashPassword('validation-password'),id,role]);
 }
}finally{await closeDatabase();}}
void main().catch(error=>{console.error(error);process.exitCode=1;});
