'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FiActivity, FiArrowRight, FiBell, FiCalendar, FiCheckCircle, FiEdit2, FiLock, FiMail, FiPhone, FiShield, FiUser, FiX } from 'react-icons/fi';
import type { CustomerData } from '../../../lib/customer-types';
import { measurementLabels } from '../../../lib/customer-rules';
import { date, Empty, RefreshStatus, useCustomerData } from './shared';

const measurementOrder = ['hips', 'chest', 'waist', 'height', 'inseam', 'length', 'sleeve', 'shoulder'];
const profileSections = [
  { href: '#profile-information', label: 'Informações', icon: FiUser },
  { href: '#profile-measurements', label: 'Medidas', icon: FiActivity },
  { href: '#profile-reservations', label: 'Reservas', icon: FiCalendar },
  { href: '#profile-communication', label: 'Avisos', icon: FiBell },
  { href: '#profile-security', label: 'Segurança', icon: FiShield },
];

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return '•••.•••.•••-••';
  return `•••.•••.•••-${digits.slice(-2)}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR');
}

export default function Profile({ initial }: { initial: CustomerData }) {
  const { data, error, busy, refresh } = useCustomerData(initial);
  const [form, setForm] = useState({ name: initial.profile.name, email: initial.profile.email, phone: initial.profile.phone });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const measurements = useMemo(() => [...data.measurements].sort((a, b) => b.at.localeCompare(a.at)), [data.measurements]);
  const latestMeasurement = measurements[0];
  const completedRentals = data.bookings.filter(item => item.returned).length;
  const activeRentals = data.bookings.filter(item => !item.returned && !['rejected', 'cancelled'].includes(item.stage)).length;
  const verified = !!data.profile.clientId && !data.profile.linkPending;

  function cancelEdit() {
    setForm({ name: data.profile.name, email: data.profile.email, phone: data.profile.phone });
    setEditing(false);
    setMessage('');
    setFailed(false);
  }

  function startEdit() {
    setForm({ name: data.profile.name, email: data.profile.email, phone: data.profile.phone });
    setMessage('');
    setFailed(false);
    setEditing(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/cliente/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Não foi possível salvar.');
      setForm({ name: result.name, email: result.email, phone: result.phone });
      await refresh();
      setEditing(false);
      setFailed(false);
      setMessage('Suas informações foram atualizadas.');
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'Confira sua conexão.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <header className="customer-profile-heading">
      <div><p className="customer-eyebrow">Meu perfil</p><h1 className="customer-title">Minha Conta</h1><p className="mt-3 text-sm text-slate-500">Gerencie seus dados, medidas e locações da SUITS.</p></div>
    </header>

    {data.profile.linkPending && <p role="status" className="customer-alert">Seu vínculo com o cadastro anterior aguarda confirmação da alfaiataria. O histórico e as medidas serão liberados após a conferência.</p>}

    <section className="customer-profile-identity" aria-label="Identificação do cliente">
      <div className="customer-profile-avatar" aria-hidden="true">{initials(data.profile.name) || <FiUser/>}</div>
      <div className="customer-profile-identity-copy">
        <p className="customer-eyebrow">Cliente SUITS</p>
        <h2>{data.profile.name}</h2>
        <p><FiMail aria-hidden="true"/>{data.profile.email}</p>
        <p><FiPhone aria-hidden="true"/>{data.profile.phone}</p>
        <span className={'customer-profile-link-status' + (verified ? ' is-linked' : '')}>
          <FiCheckCircle aria-hidden="true"/>{verified ? 'Cadastro vinculado' : data.profile.linkPending ? 'Vínculo em análise' : 'Perfil da conta'}
        </span>
      </div>
      <button type="button" className="customer-outline customer-profile-edit" onClick={() => editing ? cancelEdit() : startEdit()}>
        {editing ? <><FiX aria-hidden="true"/> Cancelar edição</> : <><FiEdit2 aria-hidden="true"/> Editar perfil</>}
      </button>
    </section>

    <nav className="customer-profile-tabs" aria-label="Seções do perfil">
      {profileSections.map(({ href, label, icon: Icon }) => <a key={href} href={href}><Icon aria-hidden="true"/><span>{label}</span></a>)}
    </nav>

    <div className="customer-profile-content">
      <div className="customer-profile-main">
        <section id="profile-information" className="customer-profile-panel">
          <div className="customer-profile-section-heading">
            <span className="customer-profile-section-icon"><FiUser aria-hidden="true"/></span>
            <div><h2>Informações pessoais</h2><p>Confira seus dados de contato e identificação.</p></div>
          </div>
          {editing ? <form onSubmit={save} className="customer-profile-form">
            <label className="customer-label">Nome completo<input className="customer-input" required minLength={2} maxLength={200} autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
            <label className="customer-label">E-mail<input className="customer-input" required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label>
            <label className="customer-label">Telefone com DDD<input className="customer-input" required type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label>
            <div className="customer-profile-readonly"><span>CPF</span><strong>{maskCpf(data.profile.cpf)}</strong><small>Por segurança, o CPF não pode ser alterado nesta página.</small></div>
            {message && <p role={failed ? 'alert' : 'status'} className="customer-profile-feedback">{message}</p>}
            <div className="customer-profile-form-actions"><button type="button" className="customer-outline" disabled={saving} onClick={cancelEdit}>Cancelar</button><button type="submit" className="customer-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
          </form> : <>
            <dl className="customer-profile-details">
              <div><dt>Nome completo</dt><dd>{data.profile.name}</dd></div>
              <div><dt>E-mail</dt><dd>{data.profile.email}</dd></div>
              <div><dt>Telefone com DDD</dt><dd>{data.profile.phone}</dd></div>
              <div><dt>CPF</dt><dd>{maskCpf(data.profile.cpf)}</dd></div>
            </dl>
            {message && <p role={failed ? 'alert' : 'status'} className="customer-profile-feedback">{message}</p>}
          </>}
        </section>

        <section id="profile-measurements" className="customer-profile-panel">
          <div className="customer-profile-section-heading">
            <span className="customer-profile-section-icon is-gold"><FiActivity aria-hidden="true"/></span>
            <div><h2>Minhas medidas</h2><p>Medidas oficiais registradas pela alfaiataria, em centímetros.</p></div>
          </div>
          {!measurements.length ? <Empty title="Nenhuma medida disponível"><p>{data.profile.linkPending ? 'Aguarde a confirmação do vínculo do cadastro.' : 'Suas medidas aparecerão aqui quando forem registradas pela alfaiataria.'}</p></Empty> : <>
            <div className="customer-profile-measurement-latest">
              <div><span className="customer-eyebrow">Avaliação mais recente</span><strong>{date(latestMeasurement.at)}</strong></div>
              <span><FiCheckCircle aria-hidden="true"/> Registrada pela alfaiataria</span>
            </div>
            {latestMeasurement.values ? <dl className="customer-profile-measures">
              {[...measurementOrder.filter(key => key in latestMeasurement.values!), ...Object.keys(latestMeasurement.values).filter(key => !measurementOrder.includes(key))].map(key => {
                const value = latestMeasurement.values?.[key];
                return value == null ? null : <div key={key}><dt>{measurementLabels[key] || key}</dt><dd>{value}<span>cm</span></dd></div>;
              })}
            </dl> : <p className="customer-profile-measure-description">{latestMeasurement.description}</p>}
            {measurements.length > 1 && <details className="customer-profile-history">
              <summary><span>Histórico de avaliações</span><span>{measurements.length - 1} {measurements.length === 2 ? 'avaliação anterior' : 'avaliações anteriores'}</span></summary>
              <div className="customer-profile-history-list">{measurements.slice(1).map(item => <article key={item.id}>
                <h3>Avaliação de {date(item.at)}</h3>
                {item.values ? <dl>{[...measurementOrder.filter(key => key in item.values!), ...Object.keys(item.values).filter(key => !measurementOrder.includes(key))].map(key => {
                  const value = item.values?.[key];
                  return value == null ? null : <div key={key}><dt>{measurementLabels[key] || key}</dt><dd>{value} cm</dd></div>;
                })}</dl> : <p>{item.description}</p>}
              </article>)}</div>
            </details>}
            <p className="customer-profile-measure-note"><FiLock aria-hidden="true"/> Para solicitar uma nova avaliação ou correção, fale diretamente com a alfaiataria. As medidas oficiais não podem ser editadas pelo cliente.</p>
          </>}
        </section>
      </div>

      <aside className="customer-profile-aside">
        <section id="profile-reservations" className="customer-profile-side-card">
          <span className="customer-profile-section-icon"><FiCalendar aria-hidden="true"/></span>
          <p className="customer-eyebrow">Locações</p><h2>Suas reservas</h2>
          <div className="customer-profile-counts"><p><strong>{activeRentals}</strong>Ativas</p><p><strong>{completedRentals}</strong>Concluídas</p></div>
          <Link href="/cliente/reservas" className="customer-profile-side-link">Acompanhar reservas <FiArrowRight aria-hidden="true"/></Link>
          <Link href="/cliente/historico" className="customer-profile-secondary-link">Ver histórico de aluguéis</Link>
        </section>

        <section id="profile-communication" className="customer-profile-side-card">
          <span className="customer-profile-section-icon is-gold"><FiBell aria-hidden="true"/></span>
          <p className="customer-eyebrow">Comunicação</p><h2>Avisos da alfaiataria</h2>
          <p className="customer-profile-side-copy">{data.unread ? `Você tem ${data.unread} ${data.unread === 1 ? 'aviso não lido' : 'avisos não lidos'} sobre suas locações.` : 'Acompanhe atualizações e lembretes das suas locações.'}</p>
          <Link href="/cliente/avisos" className="customer-profile-side-link">Consultar avisos <FiArrowRight aria-hidden="true"/></Link>
        </section>

        <section id="profile-security" className="customer-profile-side-card customer-profile-security">
          <span className="customer-profile-section-icon is-secure"><FiShield aria-hidden="true"/></span>
          <p className="customer-eyebrow">Segurança</p><h2>Dados protegidos</h2>
          <p className="customer-profile-side-copy">Suas informações pessoais ficam disponíveis apenas na sua área autenticada. O CPF é exibido parcialmente e não pode ser alterado por aqui.</p>
          <p className="customer-profile-security-status"><FiLock aria-hidden="true"/> Acesso protegido por conta</p>
        </section>
      </aside>
    </div>

    <RefreshStatus error={error} busy={busy} refresh={refresh}/>
  </>;
}
