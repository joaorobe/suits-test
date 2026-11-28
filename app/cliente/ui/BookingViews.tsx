'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiInfo, FiSearch, FiXCircle } from 'react-icons/fi';
import type { Booking, CustomerData } from '../../../lib/customer-types';
import { currency, date, Empty, RefreshStatus, useCustomerData } from './shared';

type BookingFilter = 'todas' | 'andamento' | 'concluidas' | 'canceladas';

const bookingStages = [
  { label: 'Solicitada', stages: ['pending'] },
  { label: 'Confirmada', stages: ['confirmed', 'scheduled', 'awaiting_measurements'] },
  { label: 'Preparação', stages: ['preparing', 'ready'] },
  { label: 'Retirada', stages: ['out'] },
  { label: 'Devolução', stages: ['returned'] },
];

function isCancelled(item: Booking) {
  return ['rejected', 'cancelled'].includes(item.stage);
}

function progressIndex(item: Booking) {
  return bookingStages.findIndex(step => step.stages.includes(item.stage));
}

function stageTone(stage: string) {
  if (stage === 'returned') return 'is-complete';
  if (['rejected', 'cancelled'].includes(stage)) return 'is-cancelled';
  if (['pending'].includes(stage)) return 'is-pending';
  if (['preparing', 'ready', 'out'].includes(stage)) return 'is-progress';
  return 'is-confirmed';
}

function BookingProgress({ item }: { item: Booking }) {
  const activeIndex = progressIndex(item);
  if (isCancelled(item)) {
    return <p className="customer-booking-cancelled"><FiXCircle aria-hidden="true"/> Esta solicitação foi encerrada.</p>;
  }
  return <ol className="customer-booking-progress" aria-label={'Etapa atual: ' + item.status}>
    {bookingStages.map((step, index) => {
      const complete = activeIndex > index || item.stage === 'returned';
      const active = activeIndex === index;
      return <li key={step.label} className={complete ? 'is-complete' : active ? 'is-active' : ''}>
        <span className="customer-booking-step-mark" aria-hidden="true">{complete ? <FiCheckCircle/> : <span/>}</span>
        <span>{step.label}</span>
      </li>;
    })}
  </ol>;
}

export default function BookingViews({ initial, mode, selectedId }: { initial: CustomerData; mode: 'reservas' | 'historico' | 'detalhe' | 'avisos'; selectedId?: string }) {
  const { data, error, busy, refresh } = useCustomerData(initial);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<BookingFilter>('todas');
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  async function mutate(url: string, method: string, body?: unknown) {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Não foi possível concluir.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Confira sua conexão.');
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'historico' ? 'Seu histórico de aluguéis' : mode === 'avisos' ? 'Seus avisos' : mode === 'detalhe' ? 'Cada detalhe, acompanhado.' : 'Minhas reservas';
  const bookings = data.bookings.filter(item => mode === 'detalhe' ? item.id === selectedId : mode === 'historico' ? item.returned : true);
  const historyBookings = useMemo(() => [...data.bookings]
    .filter(item => item.returned)
    .sort((a, b) => b.end.localeCompare(a.end)), [data.bookings]);
  const visibleHistory = useMemo(() => {
    const term = historySearch.trim().toLocaleLowerCase('pt-BR');
    return historyBookings.filter(item => !term
      || item.itemTitle.toLocaleLowerCase('pt-BR').includes(term)
      || item.id.toLocaleLowerCase('pt-BR').includes(term)
      || item.requestId?.toLocaleLowerCase('pt-BR').includes(term)
      || item.rentalId?.toLocaleLowerCase('pt-BR').includes(term));
  }, [historyBookings, historySearch]);
  const historyTotals = historyBookings.reduce((totals, item) => ({
    amount: totals.amount + (item.amount ?? 0),
    paid: totals.paid + item.paid,
    knownAmounts: totals.knownAmounts + (item.amount == null ? 0 : 1),
  }), { amount: 0, paid: 0, knownAmounts: 0 });
  const latestReturned = historyBookings[0];
  const activeBookings = data.bookings.filter(item => !item.returned && !isCancelled(item));
  const nextBooking = activeBookings.find(item => item.stage !== 'pending') || activeBookings[0];
  const counts = {
    total: data.bookings.length,
    confirmed: data.bookings.filter(item => ['confirmed', 'scheduled', 'awaiting_measurements'].includes(item.stage)).length,
    pending: data.bookings.filter(item => item.stage === 'pending').length,
    preparing: data.bookings.filter(item => ['preparing', 'ready'].includes(item.stage)).length,
  };
  const visibleBookings = useMemo(() => {
    if (mode !== 'reservas') return bookings;
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return bookings.filter(item => {
      if (filter === 'andamento' && (item.returned || isCancelled(item))) return false;
      if (filter === 'concluidas' && !item.returned) return false;
      if (filter === 'canceladas' && !isCancelled(item)) return false;
      return !term || item.itemTitle.toLocaleLowerCase('pt-BR').includes(term)
        || item.id.toLocaleLowerCase('pt-BR').includes(term)
        || item.requestId?.toLocaleLowerCase('pt-BR').includes(term)
        || item.rentalId?.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [bookings, filter, mode, search]);

  return <>
    {mode === 'reservas' ? <>
      <header className="customer-booking-heading">
        <div><p className="customer-eyebrow">Área do cliente</p><h1 className="customer-title">{title}</h1><p className="mt-3 text-sm text-slate-500">Acompanhe seus trajes, pagamentos e próximos passos em um só lugar.</p></div>
        <Link href="/cliente/catalogo" className="customer-button">Encontrar outro traje <FiArrowRight aria-hidden="true"/></Link>
      </header>
      <section className="customer-booking-summary" aria-label="Resumo das reservas">
        <article className="customer-booking-stat"><span className="customer-booking-stat-icon"><FiCalendar aria-hidden="true"/></span><span><strong>{counts.total}</strong><small>{counts.total === 1 ? 'reserva no total' : 'reservas no total'}</small></span></article>
        <article className="customer-booking-stat is-confirmed"><span className="customer-booking-stat-icon"><FiCheckCircle aria-hidden="true"/></span><span><strong>{counts.confirmed}</strong><small>confirmadas</small></span></article>
        <article className="customer-booking-stat is-pending"><span className="customer-booking-stat-icon"><FiClock aria-hidden="true"/></span><span><strong>{counts.pending}</strong><small>aguardando análise</small></span></article>
        <article className="customer-booking-stat is-progress"><span className="customer-booking-stat-icon"><FiInfo aria-hidden="true"/></span><span><strong>{counts.preparing}</strong><small>em preparação</small></span></article>
      </section>
      <div className="customer-booking-layout">
        <section className="customer-booking-list" aria-label="Lista de reservas">
          <div className="customer-booking-toolbar">
            <div className="customer-booking-filters" aria-label="Filtrar reservas">
              {([['todas', 'Todas'], ['andamento', 'Em andamento'], ['concluidas', 'Concluídas'], ['canceladas', 'Canceladas']] as const).map(([key, label]) =>
                <button key={key} type="button" className={'customer-booking-filter' + (filter === key ? ' is-selected' : '')} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
            </div>
            <label className="customer-booking-search"><FiSearch aria-hidden="true"/><span className="sr-only">Buscar por traje ou código</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar traje ou código"/></label>
          </div>
          {!visibleBookings.length
            ? <Empty title={bookings.length ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva por aqui'}><p>{bookings.length ? 'Tente outra busca ou escolha um filtro diferente.' : 'Quando solicitar um traje, o andamento aparecerá nesta página.'}</p>{!bookings.length && <Link href="/cliente/catalogo" className="customer-link mt-3 inline-block">Conhecer o catálogo →</Link>}</Empty>
            : visibleBookings.map(item => <article key={item.id} className="customer-booking-card">
              <Image src={item.image || '/terno1.jpg'} alt={item.itemTitle} width={176} height={216} unoptimized className="customer-booking-image"/>
              <div className="customer-booking-main">
                <div className="customer-booking-title-row"><div><p className="customer-eyebrow">{item.requestId ? 'Solicitação ' + item.requestId.slice(0, 8).toUpperCase() : item.rentalId ? 'Locação ' + item.rentalId.slice(0, 8).toUpperCase() : 'Reserva SUITS'}</p><h2>{item.itemTitle}</h2></div><span className={'customer-booking-status ' + stageTone(item.stage)}>{item.status}</span></div>
                <p className="customer-booking-dates"><FiCalendar aria-hidden="true"/>{date(item.start)} <span aria-hidden="true">—</span> {date(item.end)}</p>
                <BookingProgress item={item}/>
                <div className="customer-booking-bottom">
                  <div className="customer-booking-values"><p>Valor <strong>{currency(item.amount)}</strong></p>{item.rentalId && <p>Recebido <strong>{currency(item.paid)}</strong></p>}</div>
                  {item.note && <p className="customer-booking-note"><FiInfo aria-hidden="true"/>{item.note}</p>}
                  <Link href={'/cliente/reservas/' + item.id} className="customer-button customer-booking-action">{item.stage === 'pending' ? 'Ver solicitação' : 'Acompanhar reserva'} <FiArrowRight aria-hidden="true"/></Link>
                </div>
              </div>
            </article>)}
        </section>
        <aside className="customer-booking-aside">
          <div className="customer-booking-next">
            <span className="customer-booking-next-icon"><FiCalendar aria-hidden="true"/></span>
            <p className="customer-eyebrow">Próximo passo</p>
            {nextBooking ? <>
              <h2>{nextBooking.stage === 'pending' ? 'Aguardando a alfaiataria' : nextBooking.stage === 'preparing' || nextBooking.stage === 'ready' ? 'Seu traje está em preparação' : nextBooking.stage === 'out' ? 'Aproveite seu evento' : 'Sua reserva está confirmada'}</h2>
              <p>{nextBooking.stage === 'pending' ? 'Avisaremos quando sua solicitação for analisada.' : nextBooking.stage === 'preparing' || nextBooking.stage === 'ready' ? 'Acompanhe por aqui até a liberação para retirada.' : nextBooking.stage === 'out' ? 'Confira a data de devolução e os detalhes da locação.' : 'Acompanhe as próximas etapas da sua locação.'}</p>
              <Link href={'/cliente/reservas/' + nextBooking.id} className="customer-booking-aside-link">Ver próximo passo <FiArrowRight aria-hidden="true"/></Link>
            </> : <>
              <h2>Seu próximo momento começa aqui</h2><p>Escolha um traje e acompanhe toda a locação nesta página.</p><Link href="/cliente/catalogo" className="customer-booking-aside-link">Explorar catálogo <FiArrowRight aria-hidden="true"/></Link>
            </>}
          </div>
          <div className="customer-booking-help"><p className="customer-eyebrow">Precisa de ajuda?</p><p>Fale com a alfaiataria se precisar ajustar datas ou tirar dúvidas sobre sua reserva.</p><Link href="/cliente/avisos">Ver avisos e atualizações <FiArrowRight aria-hidden="true"/></Link></div>
        </aside>
      </div>
    </> : mode === 'historico' ? <>
      <header className="customer-booking-heading">
        <div><p className="customer-eyebrow">Área do cliente</p><h1 className="customer-title">{title}</h1><p className="mt-3 text-sm text-slate-500">Uma visão completa dos trajes que já fizeram parte dos seus momentos.</p></div>
        <Link href="/cliente/catalogo" className="customer-button">Encontrar outro traje <FiArrowRight aria-hidden="true"/></Link>
      </header>
      <section className="customer-history-summary" aria-label="Resumo do histórico">
        <article className="customer-booking-stat"><span className="customer-booking-stat-icon"><FiCheckCircle aria-hidden="true"/></span><span><strong>{historyBookings.length}</strong><small>{historyBookings.length === 1 ? 'locação concluída' : 'locações concluídas'}</small></span></article>
        <article className="customer-booking-stat is-confirmed"><span className="customer-booking-stat-icon"><FiCalendar aria-hidden="true"/></span><span><strong>{historyTotals.knownAmounts ? currency(historyTotals.amount) : '—'}</strong><small>{historyTotals.knownAmounts} {historyTotals.knownAmounts === 1 ? 'valor registrado' : 'valores registrados'}</small></span></article>
        <article className="customer-booking-stat is-progress"><span className="customer-booking-stat-icon"><FiCheckCircle aria-hidden="true"/></span><span><strong>{currency(historyTotals.paid)}</strong><small>total recebido</small></span></article>
      </section>
      <div className="customer-booking-layout">
        <section className="customer-booking-list" aria-label="Locações concluídas">
          <div className="customer-history-toolbar">
            <div><h2>Seus trajes alugados</h2><p>{historyBookings.length} {historyBookings.length === 1 ? 'registro' : 'registros'} concluídos</p></div>
            <label className="customer-booking-search"><FiSearch aria-hidden="true"/><span className="sr-only">Buscar por traje ou código</span><input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar traje ou código"/></label>
          </div>
          {!visibleHistory.length
            ? <Empty title={historyBookings.length ? 'Nenhum aluguel encontrado' : 'Seu histórico está começando'}><p>{historyBookings.length ? 'Tente buscar pelo nome do traje ou pelo código da locação.' : 'Depois de devolver seu primeiro traje, o registro completo aparecerá aqui.'}</p>{!historyBookings.length && <Link href="/cliente/catalogo" className="customer-link mt-3 inline-block">Explorar catálogo →</Link>}</Empty>
            : visibleHistory.map(item => <article key={item.id} className="customer-booking-card customer-history-card">
              <Image src={item.image || '/terno1.jpg'} alt={item.itemTitle} width={176} height={216} unoptimized className="customer-booking-image"/>
              <div className="customer-booking-main">
                <div className="customer-booking-title-row"><div><p className="customer-eyebrow">{item.rentalId ? 'Locação ' + item.rentalId.slice(0, 8).toUpperCase() : item.requestId ? 'Solicitação ' + item.requestId.slice(0, 8).toUpperCase() : 'Histórico SUITS'}</p><h2>{item.itemTitle}</h2></div><span className="customer-booking-status is-complete"><FiCheckCircle aria-hidden="true"/> Devolvido</span></div>
                <p className="customer-booking-dates"><FiCalendar aria-hidden="true"/>{date(item.start)} <span aria-hidden="true">—</span> {date(item.end)}</p>
                <BookingProgress item={item}/>
                <div className="customer-booking-bottom">
                  <div className="customer-booking-values"><p>Valor<strong>{item.amount == null ? 'Não informado' : currency(item.amount)}</strong></p><p>Recebido<strong>{currency(item.paid)}</strong></p></div>
                  <Link href={'/cliente/reservas/' + item.id} className="customer-button customer-booking-action">Ver registro completo <FiArrowRight aria-hidden="true"/></Link>
                </div>
              </div>
            </article>)}
        </section>
        <aside className="customer-booking-aside">
          <div className="customer-booking-next customer-history-feature">
            <span className="customer-booking-next-icon"><FiCheckCircle aria-hidden="true"/></span>
            <p className="customer-eyebrow">{latestReturned ? 'Sua última locação' : 'Novos momentos'}</p>
            {latestReturned ? <>
              <h2>{latestReturned.itemTitle}</h2>
              <p>Devolvido em {date(latestReturned.end)}. Você pode consultar os valores e todos os detalhes deste aluguel quando quiser.</p>
              <Link href={'/cliente/reservas/' + latestReturned.id} className="customer-booking-aside-link">Ver detalhes <FiArrowRight aria-hidden="true"/></Link>
            </> : <>
              <h2>Um traje para cada ocasião</h2><p>Descubra as opções da alfaiataria e acompanhe suas locações por aqui.</p><Link href="/cliente/catalogo" className="customer-booking-aside-link">Explorar catálogo <FiArrowRight aria-hidden="true"/></Link>
            </>}
          </div>
          <div className="customer-booking-help"><p className="customer-eyebrow">Precisa de ajuda?</p><p>Se tiver dúvidas sobre um aluguel anterior, consulte o registro completo ou fale com a alfaiataria.</p><Link href="/cliente/avisos">Ver avisos e atualizações <FiArrowRight aria-hidden="true"/></Link></div>
        </aside>
      </div>
    </> : <>
      <header><p className="customer-eyebrow">Área do cliente</p><h1 className="customer-title">{title}</h1><p className="mt-3 text-sm text-slate-500">{mode === 'avisos' ? 'Atualizações da alfaiataria e lembretes de devolução.' : 'Confirmação, preparação, retirada e devolução em um só lugar.'}</p></header>
      {message && <p role="alert" className="customer-alert">{message}</p>}
      {mode === 'avisos' ? <>
        {!data.notifications.length ? <Empty title="Tudo em dia"><p>Quando houver novidades sobre suas reservas, elas aparecerão aqui.</p></Empty> : data.notifications.map(item => <article key={item.id} className={'customer-card p-6 ' + (!item.read ? 'border-l-4 border-l-amber-500' : '')}><p className="text-xs text-slate-500">{new Date(item.at).toLocaleString('pt-BR')}{!item.read ? ' · Não lido' : ''}</p><h2 className="mt-2 font-serif text-xl">{item.title}</h2><p className="mt-3 text-sm text-slate-600">{item.message}</p><div className="mt-4 flex flex-wrap gap-5">{item.requestId && <Link href={'/cliente/reservas/' + item.requestId} className="customer-link text-sm">Ver reserva</Link>}{!item.read && <button className="customer-link text-sm" disabled={saving} onClick={() => mutate('/api/cliente/notificacoes', 'PATCH', { id: item.id })}>Marcar como lido</button>}</div></article>)}<p className="text-xs text-slate-500">Os avisos ficam disponíveis aqui. Notificações push serão oferecidas futuramente, mediante seu consentimento.</p>
      </> : <>
        {!bookings.length ? <Empty title="Nenhuma reserva por aqui"><Link href="/cliente/catalogo" className="customer-link">Conhecer o catálogo →</Link></Empty> : bookings.map(item => <article key={item.id} className="customer-card p-5 sm:p-7"><div className="flex items-start gap-4"><Image src={item.image || '/terno1.jpg'} alt={item.itemTitle} width={90} height={110} unoptimized className="h-24 w-20 rounded-xl object-cover"/><div className="min-w-0 flex-1"><p className="customer-badge">{item.status}</p><h2 className="mt-3 font-serif text-xl sm:text-2xl">{item.itemTitle}</h2><p className="mt-2 text-sm text-slate-500">{date(item.start)} a {date(item.end)}</p></div></div><div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm"><p>Valor: <strong>{currency(item.amount)}</strong></p>{item.rentalId && <p>Recebido: <strong>{currency(item.paid)}</strong></p>}</div>{item.note && <p className="customer-alert mt-4">{item.note}</p>}{mode === 'detalhe' ? <><h3 className="mt-7 font-semibold">Linha do tempo</h3><ol className="mt-5 space-y-5 border-l border-slate-300 pl-5">{item.events.map((event, index) => <li key={index} className="relative"><span aria-hidden="true" className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-amber-600"/><p className="text-sm font-medium">{event.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.at).toLocaleString('pt-BR')}</p></li>)}</ol><p className="mt-6 text-xs text-slate-500">As etapas são registradas conforme o atendimento real. Aguarde a liberação de retirada antes de buscar o traje.</p>{item.stage === 'pending' && <button className="customer-outline mt-5" disabled={saving} onClick={() => { if (window.confirm('Cancelar esta solicitação e liberar as datas?')) void mutate('/api/cliente/reservas/' + item.requestId, 'DELETE'); }}>Cancelar solicitação</button>}<Link href="/cliente/reservas" className="customer-link mt-5 block text-sm">← Voltar às reservas</Link></> : <Link href={'/cliente/reservas/' + item.id} className="customer-link mt-5 inline-block text-sm">Ver detalhes e acompanhamento →</Link>}</article>)}
      </>}
    </>}
    <RefreshStatus error={error} busy={busy} refresh={refresh}/>
  </>;
}
