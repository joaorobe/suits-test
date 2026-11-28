'use client';
import Link from 'next/link';
import { FiArrowRight, FiArrowUpRight, FiBell, FiCalendar, FiCamera, FiCheckCircle, FiClock, FiGrid } from 'react-icons/fi';
import type { CustomerData } from '../../../lib/customer-types';
import { currency, date, Empty, RefreshStatus, useCustomerData } from './shared';

export default function Dashboard({ initial }: { initial: CustomerData }) {
  const { data, error, busy, refresh } = useCustomerData(initial);
  const active = data.bookings
    .filter(item => !['returned', 'rejected', 'cancelled'].includes(item.stage))
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = active.find(item => item.stage !== 'pending') || active[0];
  const recent = data.bookings.filter(item => item.returned).slice(0, 3);

  return <>
    <section className="customer-home-hero">
      <div className="customer-home-welcome">
        <p className="customer-eyebrow">Seu espaço no Suits</p>
        <h1>Olá, {data.profile.name.split(' ')[0] || 'Cliente'}.<br/>Vamos vestir seu próximo momento?</h1>
        <p>Encontre o traje ideal para a sua ocasião ou explore a coleção completa.</p>
        <div className="customer-home-actions">
          <Link href="/cliente/catalogo?modo=quiz" className="customer-home-primary">Descubra seu traje <FiArrowUpRight aria-hidden="true"/></Link>
          <Link href="/cliente/catalogo" className="customer-home-secondary"><FiGrid aria-hidden="true"/> Ir direto ao catálogo</Link>
        </div>
      </div>
      <Link href="/cliente/catalogo?provador=1" className="customer-home-tryon">
        <span className="customer-home-tryon-icon"><FiCamera aria-hidden="true"/></span>
        <span className="customer-home-tryon-label"><span className="customer-home-tryon-dot"/> Novidade no Suits</span>
        <strong>Veja como o traje pode ficar em você</strong>
        <span className="customer-home-tryon-copy">Experimente uma prévia com sua foto no Provador Virtual.</span>
        <span className="customer-home-tryon-cta">Conhecer o provador <FiArrowRight aria-hidden="true"/></span>
        <span className="customer-home-tryon-disclaimer">Demonstração acadêmica não comercial · resultado ilustrativo</span>
      </Link>
    </section>

    {data.profile.linkPending && <div role="status" className="customer-alert">Encontramos um cadastro compatível. A alfaiataria confirmará sua identidade para liberar suas reservas, medidas e histórico. Você já pode conhecer o catálogo.</div>}

    <section className="customer-home-dashboard" aria-label="Resumo da sua conta">
      <article className="customer-home-next">
        <div className="customer-home-section-heading"><span className="customer-home-card-icon"><FiCalendar aria-hidden="true"/></span><div><p className="customer-eyebrow">Acompanhe de perto</p><h2>Próxima reserva ou retirada</h2></div></div>
        {next ? <>
          <div className="customer-home-reservation">
            <div><h3>{next.itemTitle}</h3><p><FiClock aria-hidden="true"/>{date(next.start)} a {date(next.end)}</p></div>
            <span className="customer-badge">{next.status}</span>
          </div>
          <Link href={'/cliente/reservas/' + next.id} className="customer-home-card-link">Ver acompanhamento <FiArrowRight aria-hidden="true"/></Link>
        </> : <>
          <div className="customer-home-empty-state"><h3>Seu próximo evento começa aqui</h3><p>Nenhuma reserva ativa no momento. Explore a coleção para encontrar seu próximo traje.</p></div>
          <Link href="/cliente/catalogo" className="customer-home-card-link">Encontrar um traje <FiArrowRight aria-hidden="true"/></Link>
        </>}
      </article>

      <article className="customer-home-shortcuts">
        <div className="customer-home-section-heading"><span className="customer-home-card-icon is-gold"><FiCheckCircle aria-hidden="true"/></span><div><p className="customer-eyebrow">Tudo ao seu alcance</p><h2>Atalhos rápidos</h2></div></div>
        <div className="customer-home-shortcut-list">
          <Link href="/cliente/reservas"><span className="customer-home-shortcut-icon"><FiCalendar aria-hidden="true"/></span><span><strong>Reservas ativas</strong><small>Acompanhe suas locações</small></span><b>{active.length}</b><FiArrowRight className="customer-home-shortcut-arrow" aria-hidden="true"/></Link>
          <Link href="/cliente/catalogo"><span className="customer-home-shortcut-icon"><FiGrid aria-hidden="true"/></span><span><strong>Catálogo</strong><small>Explore os trajes</small></span><FiArrowRight className="customer-home-shortcut-arrow" aria-hidden="true"/></Link>
          <Link href="/cliente/avisos"><span className="customer-home-shortcut-icon"><FiBell aria-hidden="true"/></span><span><strong>Avisos</strong><small>Novidades da alfaiataria</small></span><b>{data.unread}</b><FiArrowRight className="customer-home-shortcut-arrow" aria-hidden="true"/></Link>
        </div>
      </article>
    </section>

    {data.notifications.filter(item => !item.read).slice(0, 2).map(item => <Link href="/cliente/avisos" key={item.id} className="customer-home-notification"><span><FiBell aria-hidden="true"/></span><div><strong>{item.title}</strong><p>{item.message}</p></div><FiArrowRight aria-hidden="true"/></Link>)}

    <section className="customer-home-history">
      <div className="customer-home-history-heading"><div><p className="customer-eyebrow">Memórias sob medida</p><h2>Momentos anteriores</h2></div><Link href="/cliente/historico" className="customer-home-card-link">Ver histórico <FiArrowRight aria-hidden="true"/></Link></div>
      {recent.length ? <div className="customer-home-history-grid">{recent.map(item => <Link key={item.id} href={'/cliente/reservas/' + item.id} className="customer-home-history-card">
        <span className="customer-home-history-icon"><FiCheckCircle aria-hidden="true"/></span><span className="customer-home-history-status">Locação concluída</span>
        <h3>{item.itemTitle}</h3><p>{date(item.start)}{item.end && item.end !== item.start ? ` — ${date(item.end)}` : ''}</p><strong>{currency(item.amount)}</strong>
      </Link>)}</div> : <Empty title="Seu histórico começa com o primeiro aluguel"><p>Os trajes devolvidos aparecerão aqui.</p></Empty>}
    </section>
    <RefreshStatus error={error} busy={busy} refresh={refresh}/>
  </>;
}
