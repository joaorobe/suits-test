'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiHome,FiGrid,FiCalendar,FiClock,FiUser,FiBell,FiLogOut,FiMoon,FiSun } from 'react-icons/fi';
import { applyTheme,getStoredTheme,THEME_STORAGE_KEY } from '../../theme-provider';
const links=[{href:'/cliente',label:'Início',icon:FiHome},{href:'/cliente/catalogo',label:'Catálogo',icon:FiGrid},{href:'/cliente/reservas',label:'Reservas',icon:FiCalendar},{href:'/cliente/historico',label:'Histórico',icon:FiClock},{href:'/cliente/perfil',label:'Perfil',icon:FiUser}];
export default function CustomerShell({children,name}:{children:React.ReactNode;name:string}){
 const pathname=usePathname();const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function logout(){setBusy(true);try{const response=await fetch('/api/auth',{method:'DELETE'});if(!response.ok)throw Error('Não foi possível sair.');router.replace('/login');router.refresh();}catch{setError('Não foi possível sair. Tente novamente.');setBusy(false);}}
 function toggleTheme(){const theme=getStoredTheme()==='dark'?'light':'dark';applyTheme(theme);localStorage.setItem(THEME_STORAGE_KEY,theme);}
 return <div className="customer-portal min-h-screen pb-28 md:pb-10">
 <a className="customer-skip" href="#customer-content">Ir para o conteúdo</a>
 <header className="border-b border-slate-200 bg-[#17182b] text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8"><Link href="/cliente" aria-label="Suits, início"><Image src="/logo.png" width={132} height={56} alt="Suits" className="h-10 w-auto"/></Link><span className="hidden text-sm text-slate-300 sm:block">Seu próximo momento, sob medida.</span><div className="flex items-center gap-2"><Link href="/cliente/avisos" aria-label="Ver avisos" className="customer-icon"><FiBell aria-hidden="true"/></Link><button type="button" onClick={toggleTheme} aria-label="Alternar tema claro e escuro" className="customer-icon"><FiMoon className="dark:hidden"/><FiSun className="hidden dark:block"/></button><button onClick={logout} disabled={busy} aria-label="Sair da conta" className="customer-icon"><FiLogOut aria-hidden="true"/></button></div></div></header>
 <nav aria-label="Navegação do cliente" className="customer-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:static md:border-b md:border-t-0"><div className="mx-auto grid max-w-6xl grid-cols-5 px-2 md:flex md:gap-6 md:px-8">{links.map(({href,label,icon:Icon})=>{const active=href==='/cliente'?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} aria-current={active?'page':undefined} className={'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-3 text-[11px] font-medium transition sm:text-sm md:flex-row md:gap-2 md:px-3 '+(active?'text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/40':'text-slate-600 hover:bg-slate-100')}><Icon className="text-xl" aria-hidden="true"/>{label}</Link>;})}</div></nav>
 <main id="customer-content" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 px-5 py-7 outline-none sm:px-8 sm:py-10">{error&&<p role="alert" className="customer-alert">{error}</p>}{children}</main>
 <footer className="mx-auto max-w-6xl px-5 pt-5 text-xs text-slate-500 sm:px-8">Suits · Área de {name.split(' ')[0]} · Atendimento e ajustes com a alfaiataria.</footer>
 </div>;
}
