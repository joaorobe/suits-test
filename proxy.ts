import { NextResponse, type NextRequest } from 'next/server';
import { findSession, SESSION_COOKIE } from './lib/auth';
import { homeFor } from './lib/roles';
export async function proxy(request: NextRequest) {
  const user=await findSession(request.cookies.get(SESSION_COOKIE)?.value);
  const path=request.nextUrl.pathname;
  const publicPage=path==='/login'||path==='/cadastro';
  if(!user)return publicPage?NextResponse.next():NextResponse.redirect(new URL('/login',request.url));
  const home=homeFor(user.role);
  if(publicPage||path==='/')return NextResponse.redirect(new URL(home,request.url));
  const customerPage=path==='/cliente'||path.startsWith('/cliente/');
  const tailorPage=path==='/costureira'||path.startsWith('/costureira/');
  const allowed=user.role==='cliente'?customerPage:user.role==='costureira'?tailorPage||path==='/settings'||path==='/medidas':!customerPage&&!tailorPage;
  if(!allowed)return NextResponse.redirect(new URL(home,request.url));
  const response=NextResponse.next();response.headers.set('Cache-Control','no-store');return response;
}
export const config={matcher:['/','/login','/cadastro','/cliente/:path*','/solicitacoes/:path*','/operacoes/:path*','/medidas/:path*','/dashboard/:path*','/inventory/:path*','/costureira/:path*','/costureira-admin/:path*','/devolucao/:path*','/pagamentos/:path*','/settings/:path*']};
