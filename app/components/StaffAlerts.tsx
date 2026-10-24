'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
type Alert={id:string;title:string;date:string;message:string};
export default function StaffAlerts(){
 const [loading,setLoading]=useState(true);
 const [alerts,setAlerts]=useState<Alert[]>([]);const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();async function load(){if(document.hidden)return;try{const response=await fetch('/api/staff-alerts',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();setAlerts((await response.json()).alerts);setError('');}catch{if(!controller.signal.aborted)setError('Não foi possível atualizar os avisos.');}finally{if(!controller.signal.aborted)setLoading(false);}}void load();const timer=setInterval(()=>void load(),60000);return()=>{controller.abort();clearInterval(timer);};},[]);
 return <section className="customer-card mb-6 p-5" aria-label="Avisos operacionais"><h2 className="text-lg font-semibold">Atenção ao atendimento</h2>{loading?<p role="status" className="mt-2 text-sm">Consultando avisos…</p>:error?<p role="status" className="mt-2 text-sm">{error}</p>:alerts.length?<ul className="mt-3 space-y-3">{alerts.slice(0,5).map((alert,index)=><li key={alert.id+index} className="border-l-2 border-amber-500 pl-3 text-sm"><strong>{alert.title}</strong><p className="mt-1 text-slate-600">{alert.message} {alert.date?.split('-').reverse().join('/')}</p></li>)}</ul>:<p className="mt-2 text-sm text-slate-600">Nenhum aviso de prazo disponível nesta atualização.</p>}<Link className="customer-link mt-3 inline-block text-sm" href="/medidas">Consultar medidas profissionais</Link></section>;
}
