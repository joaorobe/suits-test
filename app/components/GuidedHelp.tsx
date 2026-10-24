'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Role } from '../../lib/roles';

const guides: Record<Role,{title:string;description:string;href:string;selector:string}[]> = {
  admin:[
    {title:'Seu painel',description:'Acompanhe os indicadores e use os atalhos para começar o atendimento.',href:'/dashboard',selector:'main'},
    {title:'Solicitações e reservas',description:'Analise os pedidos dos clientes e registre cada etapa real, da confirmação à retirada.',href:'/solicitacoes',selector:'a[href="/solicitacoes"]'},
    {title:'Operação e calendário',description:'Confira datas, alertas, prazos de higienização, manutenção e relatórios.',href:'/operacoes',selector:'a[href="/operacoes"]'},
    {title:'Medidas profissionais',description:'Registre uma nova avaliação; as anteriores ficam no histórico e ajudam nas recomendações.',href:'/medidas',selector:'a[href="/medidas"]'},
  ],
  costureira:[
    {title:'Seus ajustes',description:'Abra um pedido para consultar o traje, as medidas e as observações. Você vê apenas tarefas atribuídas a você.',href:'/costureira',selector:'main'},
    {title:'Andamento do trabalho',description:'Use Iniciar, Finalizar ou Marcar observação dentro do pedido. A administração confirma a liberação do traje.',href:'/costureira',selector:'article'},
    {title:'Medidas e prazos',description:'Registre avaliações dos clientes dos seus ajustes ativos. Os avisos destacam retiradas próximas.',href:'/medidas',selector:'a[href="/medidas"]'},
  ],
  cliente:[
    {title:'Seu espaço no Suits',description:'Veja a próxima reserva e acompanhe os avisos da alfaiataria.',href:'/cliente',selector:'main'},
    {title:'Encontre seu traje',description:'Escolha as datas e use os filtros e recomendações. A disponibilidade é conferida antes do envio.',href:'/cliente/catalogo',selector:'a[href="/cliente/catalogo"]'},
    {title:'Solicite e acompanhe',description:'Enviar uma solicitação pede a aprovação da alfaiataria e bloqueia o período enquanto aguarda análise. Não há cobrança automática.',href:'/cliente/reservas',selector:'a[href="/cliente/reservas"]'},
    {title:'Seu perfil e suas medidas',description:'Atualize seus contatos e consulte as avaliações profissionais. A alfaiataria registra as medidas.',href:'/cliente/perfil',selector:'a[href="/cliente/perfil"]'},
  ],
};

export default function GuidedHelp(){
  const pathname=usePathname();const [role,setRole]=useState<Role|null>(null);const [open,setOpen]=useState(false);const [step,setStep]=useState(-1);const [error,setError]=useState('');const [saving,setSaving]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
  const active=pathname.startsWith('/cliente')||['/dashboard','/inventory','/solicitacoes','/operacoes','/medidas','/costureira','/costureira-admin','/devolucao','/pagamentos','/settings'].includes(pathname);
  useEffect(()=>{if(!active)return;const controller=new AbortController();fetch('/api/tutorial',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)return;const data=await response.json();setRole(data.role);if(!data.completed)setOpen(true);}).catch(()=>{});return()=>controller.abort();},[active]);
  useEffect(()=>{if(open&&active)dialog.current?.showModal();else dialog.current?.close();},[open,active]);
  useEffect(()=>{if(!open||!role||step<0)return;const target=document.querySelector(guides[role][step].selector);target?.classList.add('tutorial-highlight');return()=>target?.classList.remove('tutorial-highlight');},[open,role,step,pathname]);
  async function finish(){setSaving(true);setError('');try{const response=await fetch('/api/tutorial',{method:'POST'});if(!response.ok)throw Error();setOpen(false);setStep(-1);}catch{setError('Não foi possível salvar sua preferência. Tente novamente.');}finally{setSaving(false);}}
  if(!active||!role)return null;
  const current=step>=0?guides[role][step]:null;
  return <><button className="guided-help customer-outline" aria-label="Abrir ajuda e tutorial" onClick={()=>{setStep(-1);setOpen(true);}}>Ajuda</button><dialog ref={dialog} aria-labelledby="tutorial-title" onCancel={event=>{event.preventDefault();void finish();}} className="tutorial-dialog customer-card"><div className="p-6"><p className="customer-eyebrow">Guia do Suits {step>=0?`· ${step+1}/${guides[role].length}`:''}</p><h2 id="tutorial-title" className="mt-3 font-serif text-2xl">{current?.title||'Quer conhecer o sistema?'}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{current?.description||'Um guia rápido e opcional para o seu perfil. Você pode pular agora e reabrir pelo botão Ajuda.'}</p>{current&&<Link className="customer-link mt-4 inline-block" href={current.href} onClick={()=>setOpen(false)}>Abrir esta área →</Link>}{error&&<p role="alert" className="customer-alert mt-4">{error}</p>}<div className="mt-6 flex flex-wrap gap-3">{step>0&&<button className="customer-outline" disabled={saving} onClick={()=>setStep(step-1)}>Voltar</button>}{step<guides[role].length-1?<button className="customer-button" disabled={saving} onClick={()=>setStep(step+1)}>{step<0?'Conhecer':'Avançar'}</button>:<button className="customer-button" disabled={saving} onClick={()=>void finish()}>Finalizar</button>}<button className="customer-outline" disabled={saving} onClick={()=>void finish()}>{saving?'Salvando…':'Pular'}</button></div></div></dialog></>;
}
