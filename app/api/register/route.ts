import { NextResponse } from 'next/server';
import { checkOrigin, readBody } from '../../../lib/api';
import { registerCustomer } from '../../../lib/customers';
import { cookieOptions, createSession, SESSION_COOKIE } from '../../../lib/auth';
import { HttpError } from '../../../lib/rules';
export async function POST(request:Request){
 try{
  checkOrigin(request);
  const user=await registerCustomer(await readBody(request));
  const {token,maxAge}=await createSession(user.id,false);
  const response=NextResponse.json({user},{status:201,headers:{'Cache-Control':'no-store'}});
  response.cookies.set(SESSION_COOKIE,token,{...cookieOptions,maxAge});return response;
 }catch(error){
  const duplicate=error&&typeof error==='object'&&'code' in error&&error.code==='23505';
  const status=error instanceof HttpError?error.status:error instanceof SyntaxError?400:duplicate?409:500;
  if(status===500)console.error('Registration error:',error);
  return NextResponse.json({message:error instanceof HttpError?error.message:duplicate?'CPF ou e-mail já cadastrado.':status===400?'Dados inválidos.':'Não foi possível concluir o cadastro.'},{status});
 }
}
