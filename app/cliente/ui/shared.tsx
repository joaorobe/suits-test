'use client';
import { useCallback,useEffect,useState } from 'react';
import type { CustomerData } from '../../../lib/customer-types';
export const currency=(value:number|null)=>value==null?'Valor a combinar':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const date=(value:string)=>value?value.slice(0,10).split('-').reverse().join('/'):'A combinar';
export function useCustomerData(initial:CustomerData){
 const [data,setData]=useState(initial);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{setBusy(true);try{const response=await fetch('/api/cliente',{cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.message||'Não foi possível atualizar.');setData(result);setError('');}catch(error){setError(error instanceof Error?error.message:'Confira sua conexão.');}finally{setBusy(false);}},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},20000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{window.clearInterval(timer);window.removeEventListener('focus',focus);};},[refresh]);
 return {data,error,busy,refresh};
}
export function RefreshStatus({error,busy,refresh}:{error:string;busy:boolean;refresh:()=>void}){return <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><p role={error?'alert':undefined}>{error||'As informações são atualizadas automaticamente enquanto esta página está aberta.'}</p><button className="customer-link" disabled={busy} onClick={refresh}>{busy?'Atualizando...':'Atualizar agora'}</button></div>;}
export function Empty({title,children}:{title:string;children:React.ReactNode}){return <div className="customer-card border-dashed p-8 text-center"><h2 className="text-xl font-serif">{title}</h2><div className="mt-3 text-sm text-slate-500">{children}</div></div>;}
