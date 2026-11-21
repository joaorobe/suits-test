'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiCalendar, FiCheck, FiCompass, FiGrid, FiRefreshCw } from 'react-icons/fi';
import type { CatalogItem } from '../../../lib/customer-types';
import { currency, date, Empty } from './shared';

type Filters = { event: string; color: string; style: string; budget: string; recommend: string; q: string; category: string; size: string; min: string; max: string; available: string; start: string; end: string };
type QuizAnswers = { event: string | null; style: string | null; color: string | null; budget: string | null };
type Choice = { value: string; title: string; description?: string };

const eventChoices: Choice[] = [
  { value: 'Casamento', title: 'Casamento', description: 'Uma celebração especial' },
  { value: 'Formatura', title: 'Formatura', description: 'Uma conquista para comemorar' },
  { value: 'Festa', title: 'Festa', description: 'Um evento para aproveitar' },
  { value: 'Trabalho', title: 'Trabalho', description: 'Uma ocasião profissional' },
  { value: '', title: 'Ainda não decidi', description: 'Quero conhecer as opções' },
];
const styleChoices: Choice[] = [
  { value: 'Clássico', title: 'Clássico', description: 'Elegante em qualquer ocasião' },
  { value: 'Moderno', title: 'Moderno', description: 'Contemporâneo e marcante' },
  { value: 'Slim', title: 'Slim', description: 'Silhueta mais ajustada' },
  { value: 'Social', title: 'Social', description: 'Formal e versátil' },
  { value: '', title: 'Me surpreenda', description: 'Estou aberto a sugestões' },
];
const budgetChoices: Choice[] = [
  { value: '200', title: 'Até R$ 200', description: 'Opções econômicas' },
  { value: '350', title: 'Até R$ 350', description: 'Um pouco mais de escolha' },
  { value: '500', title: 'Até R$ 500', description: 'Mais possibilidades' },
  { value: '', title: 'Sem limite definido', description: 'Quero ver todas as opções' },
];

export default function Catalog({ initialDate, initialView = 'welcome' }: { initialDate: string; initialView?: 'welcome' | 'quiz' }) {
  const defaults: Filters = { event: '', color: '', style: '', budget: '', recommend: '', q: '', category: '', size: '', min: '', max: '', available: '', start: initialDate, end: initialDate };
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState(defaults);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sizes, setSizes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'quiz' | 'results' | 'catalog'>(initialView);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ event: null, style: null, color: null, budget: null });
  const details = useRef<HTMLElement>(null);
  const selected = items.find(item => item.id === selectedId);
  const checked = draft.start === filters.start && draft.end === filters.end;
  const colorChoices = [...new Set(items.map(item => item.color.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cliente/catalogo?' + new URLSearchParams(filters), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw Error(result.message || 'Não foi possível consultar o catálogo.');
        setItems(result.items);
        setCategories(result.categories);
        setSizes(result.sizes);
        setError('');
      })
      .catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Confira sua conexão.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (selectedId) details.current?.focus();
  }, [selectedId]);

  function update(key: keyof Filters, value: string) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setSent(null);
  }

  function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSent(null);
    setFilters({ ...draft });
  }

  function updateAnswer(key: keyof QuizAnswers, value: string) {
    setAnswers(previous => ({ ...previous, [key]: value }));
  }

  function completeQuiz() {
    if (!draft.start || !draft.end || draft.end < draft.start) {
      setError('Confira as datas de retirada e devolução.');
      return;
    }
    const result: Filters = {
      ...defaults,
      event: answers.event || '',
      style: answers.style || '',
      color: answers.color || '',
      budget: answers.budget || '',
      recommend: 'true',
      start: draft.start,
      end: draft.end,
    };
    setError('');
    setDraft(result);
    setFilters(result);
    setLoading(true);
    setSelectedId(null);
    setSent(null);
    setView('results');
  }

  function browseCatalog() {
    setError('');
    setDraft({ ...defaults });
    setFilters({ ...defaults });
    setLoading(true);
    setSelectedId(null);
    setSent(null);
    setView('catalog');
  }

  function restartQuiz() {
    setAnswers({ event: null, style: null, color: null, budget: null });
    setStep(0);
    setError('');
    setDraft({ ...defaults });
    setView('quiz');
  }

  async function submit() {
    if (!selected || !checked || sending || loading) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/cliente/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selected.id, start: filters.start, end: filters.end }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Não foi possível enviar a solicitação.');
      setSent(result.id);
      setItems(previous => previous.map(item => item.id === selected.id ? { ...item, available: false } : item));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Confira sua conexão.');
    } finally {
      setSending(false);
    }
  }

  const quizKey = (['event', 'style', 'color', 'budget'] as const)[step];
  const answerChoices: Choice[] = step === 0 ? eventChoices
    : step === 1 ? styleChoices
      : step === 2 ? [{ value: '', title: 'Qualquer cor', description: 'Priorize o traje, não a cor' }, ...colorChoices.map(color => ({ value: color, title: color }))]
        : budgetChoices;
  const answer = answers[quizKey];

  return (
    <>
      {view === 'welcome' && <section className="customer-discovery">
        <div className="customer-discovery-copy">
          <p className="customer-eyebrow">Uma escolha com a sua cara</p>
          <h1 className="customer-title">O traje certo para o seu momento.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Conte um pouco sobre a ocasião e seu estilo. Vamos encontrar opções que combinam com você — ou, se preferir, explore todo o catálogo.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-slate-300"><span className="customer-discovery-tag"><FiCheck aria-hidden="true"/> Rápido e personalizado</span><span className="customer-discovery-tag"><FiCheck aria-hidden="true"/> Sem compromisso</span></div>
        </div>
        <div className="customer-entry-grid">
          <button type="button" className="customer-entry-card customer-entry-featured" onClick={() => setView('quiz')}>
            <span className="customer-entry-icon"><FiCompass aria-hidden="true"/></span><span className="customer-eyebrow">Descoberta guiada</span><strong>Descubra seu traje</strong><span>Responda algumas perguntas e receba sugestões para sua ocasião.</span><span className="customer-entry-action">Começar o quiz <FiArrowUpRight aria-hidden="true"/></span>
          </button>
          <button type="button" className="customer-entry-card" onClick={browseCatalog}>
            <span className="customer-entry-icon"><FiGrid aria-hidden="true"/></span><span className="customer-eyebrow">Você escolhe</span><strong>Ir direto ao catálogo</strong><span>Veja todos os trajes e use os filtros para encontrar o que procura.</span><span className="customer-entry-action">Explorar trajes <FiArrowUpRight aria-hidden="true"/></span>
          </button>
        </div>
      </section>}

      {view === 'quiz' && <section id="quiz" className="customer-quiz customer-card">
        <div className="customer-quiz-top">
          <button type="button" className="customer-link inline-flex items-center gap-2" onClick={() => step === 0 ? setView('welcome') : setStep(step - 1)}><FiArrowLeft aria-hidden="true"/> Voltar</button>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">Pergunta {step + 1} de 4</p>
        </div>
        <div className="customer-progress" role="progressbar" aria-label="Progresso do quiz" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) * 25}%` }}/></div>
        <div className="mx-auto mt-8 max-w-3xl">
          <p className="customer-eyebrow">Vamos encontrar seu estilo</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{[
            'Qual é a ocasião especial?',
            'Como você quer se sentir no traje?',
            'Tem alguma cor em mente?',
            'Qual período e orçamento combinam com você?',
          ][step]}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{[
            'A ocasião ajuda a selecionar peças adequadas para o seu evento.',
            'Escolha o estilo que mais combina com a sua personalidade.',
            'Vamos priorizar a sua cor favorita quando houver opções.',
            'Informe as datas para conferirmos a disponibilidade e escolha seu limite para o período.',
          ][step]}</p>

          <div className="customer-quiz-options" role="radiogroup" aria-label={['Ocasião', 'Estilo', 'Cor', 'Orçamento'][step]}>
            {answerChoices.map(choice => <button key={choice.title} type="button" role="radio" aria-checked={answer === choice.value} className={'customer-quiz-choice' + (answer === choice.value ? ' is-selected' : '')} onClick={() => updateAnswer(quizKey, choice.value)}>
              <span className="customer-quiz-radio" aria-hidden="true">{answer === choice.value && <FiCheck/>}</span><span><strong>{choice.title}</strong>{choice.description && <small>{choice.description}</small>}</span>
            </button>)}
          </div>

          {step === 3 && <div className="customer-quiz-dates">
            <label className="customer-label"><span className="inline-flex items-center gap-2"><FiCalendar aria-hidden="true"/> Retirada</span><input className="customer-input" type="date" required min={initialDate} value={draft.start} onChange={event => update('start', event.target.value)}/></label>
            <label className="customer-label"><span className="inline-flex items-center gap-2"><FiCalendar aria-hidden="true"/> Devolução</span><input className="customer-input" type="date" required min={draft.start} value={draft.end} onChange={event => update('end', event.target.value)}/></label>
          </div>}

          {error && <p role="alert" className="customer-alert mt-5">{error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className="customer-link text-left" onClick={browseCatalog}>Prefiro escolher sem o quiz</button>
            <button type="button" className="customer-button min-w-40" disabled={answer === null || (step === 3 && (!draft.start || !draft.end || draft.end < draft.start))} onClick={() => step < 3 ? setStep(step + 1) : completeQuiz()}>{step < 3 ? <>Continuar <FiArrowRight aria-hidden="true"/></> : <>Ver minhas sugestões <FiArrowRight aria-hidden="true"/></>}</button>
          </div>
        </div>
      </section>}

      {(view === 'results' || view === 'catalog') && <>
        <header className="customer-catalog-heading">
          <div><p className="customer-eyebrow">{view === 'results' ? 'Sua seleção personalizada' : 'Explore a alfaiataria'}</p><h1 className="customer-title">{view === 'results' ? 'Trajes que combinam com você.' : 'Elegância para cada ocasião.'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{view === 'results' ? 'As sugestões estão organizadas pela compatibilidade com suas respostas. A disponibilidade considera as datas escolhidas.' : 'Consulte as peças, compare opções e confira a disponibilidade para suas datas.'}</p></div>
          <div className="flex flex-wrap gap-3">
            {view === 'results' ? <><button type="button" className="customer-outline" onClick={restartQuiz}><FiRefreshCw aria-hidden="true"/> Refazer quiz</button><button type="button" className="customer-link" onClick={browseCatalog}>Ver catálogo completo</button></> : <button type="button" className="customer-outline" onClick={() => setView('welcome')}><FiCompass aria-hidden="true"/> Fazer o quiz</button>}
          </div>
        </header>

        <form onSubmit={search} className="customer-card customer-catalog-filters" aria-label="Filtros do catálogo">
          <label className="customer-label sm:col-span-2">Buscar traje<input className="customer-input" value={draft.q} onChange={event => update('q', event.target.value)} placeholder="Nome ou descrição" maxLength={100}/></label>
          <label className="customer-label">Retirada<input className="customer-input" type="date" required min={initialDate} value={draft.start} onChange={event => update('start', event.target.value)}/></label>
          <label className="customer-label">Devolução<input className="customer-input" type="date" required min={draft.start} value={draft.end} onChange={event => update('end', event.target.value)}/></label>
          <label className="customer-label">Categoria<select className="customer-input" value={draft.category} onChange={event => update('category', event.target.value)}><option value="">Todas</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="customer-label">Tamanho<select className="customer-input" value={draft.size} onChange={event => update('size', event.target.value)}><option value="">Todos</option>{sizes.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="customer-label">Diária mínima (R$)<input className="customer-input" type="number" min="0" step="0.01" value={draft.min} onChange={event => update('min', event.target.value)}/></label>
          <label className="customer-label">Diária máxima (R$)<input className="customer-input" type="number" min="0" step="0.01" value={draft.max} onChange={event => update('max', event.target.value)}/></label>
          <label className="customer-catalog-available"><input type="checkbox" checked={draft.available === 'true'} onChange={event => update('available', event.target.checked ? 'true' : '')}/> Mostrar apenas disponíveis no período</label>
          <button className="customer-button customer-filter-submit" disabled={loading}>{loading ? 'Consultando...' : 'Consultar disponibilidade'}</button>
        </form>

        {error && <p role="alert" className="customer-alert">{error}</p>}
        {sent && <div role="status" className="customer-card border-emerald-500 p-6"><h2 className="font-serif text-2xl">Solicitação enviada!</h2><p className="mt-2 text-sm text-slate-500">A alfaiataria vai analisar seu pedido. Nenhuma cobrança foi realizada.</p><Link href={'/cliente/reservas/' + sent} className="customer-link mt-4 inline-block">Acompanhar solicitação →</Link></div>}
        {selected && !sent && <section ref={details} tabIndex={-1} aria-label="Resumo da solicitação" className="customer-card grid gap-6 p-6 outline-none md:grid-cols-[180px_1fr]">
          <Image src={selected.image || '/terno1.jpg'} width={360} height={420} unoptimized alt={selected.title} className="aspect-[4/5] w-full max-w-60 rounded-2xl object-cover"/>
          <div><p className="customer-eyebrow">Seu traje, seus planos</p><h2 className="mt-2 font-serif text-2xl">{selected.title}</h2><p className="mt-2 text-sm text-slate-600">{selected.description} · {selected.color} · Tamanho {selected.size}</p><p className="mt-4 text-sm">Retirada: <strong>{date(filters.start)}</strong> · Devolução: <strong>{date(filters.end)}</strong></p><p className="mt-3 font-medium">Estimativa: {currency(selected.estimate)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Valor sujeito à confirmação da alfaiataria. O período considera os dias de retirada e devolução para disponibilidade. Sem cobrança automática.</p><p className="mt-2 text-xs text-slate-500">{selected.availabilityNote}</p><p className="customer-badge mt-4">{!checked ? 'Consulte novamente após mudar as datas' : selected.available ? 'Disponível para solicitar' : 'Indisponível nesse período'}</p><div className="mt-5 flex flex-wrap gap-3"><button className="customer-button" onClick={submit} disabled={sending || loading || !selected.available || !checked || !!error}>{sending ? 'Enviando...' : 'Enviar solicitação'}</button><button className="customer-link" onClick={() => setSelectedId(null)}>Escolher outro traje</button></div><p className="mt-3 text-xs text-slate-500">A solicitação bloqueia o período até ser aprovada, recusada ou cancelada.</p></div>
        </section>}

        <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-slate-500">{loading ? 'Consultando o inventário...' : items.length + (items.length === 1 ? ' traje encontrado' : ' trajes encontrados')}</p>{view === 'results' && !loading && <span className="customer-result-note"><FiCheck aria-hidden="true"/> Ordenados por compatibilidade</span>}</div>
        {!loading && !items.length ? <Empty title={view === 'results' ? 'Ainda não encontramos uma combinação' : 'Nenhum traje encontrado'}><p>{view === 'results' ? 'Tente ajustar as respostas ou confira todas as peças do catálogo.' : 'Experimente outras datas ou remova alguns filtros.'}</p>{view === 'results' && <button type="button" className="customer-link mt-3" onClick={restartQuiz}>Ajustar minhas respostas</button>}</Empty>
          : <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} className="customer-card customer-garment-card overflow-hidden">
            <div className="relative aspect-[4/4.5] overflow-hidden bg-slate-100"><Image src={item.image || '/terno1.jpg'} alt={item.title + ', ' + item.color} fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" className="object-cover"/><span className="absolute left-3 top-3 rounded-full bg-[#17182b]/90 px-3 py-1 text-xs text-white">{item.category}</span>{item.recommendation?.score != null && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#17182b]">{item.recommendation.score}% combina</span>}</div>
            <div className="p-5"><h2 className="text-xl font-serif">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{item.color} · Tamanho {item.size}</p><p className="mt-3 text-sm font-medium">{currency(item.price)}{item.price != null ? ' / diária' : ''}</p>
              {item.recommendation && <div className="customer-match mt-3"><p className="font-semibold">{item.recommendation.score == null ? 'Confira esta opção' : item.recommendation.score + '% de compatibilidade com suas respostas'}</p>{item.recommendation.reasons.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-4">{item.recommendation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul> : <p className="mt-2">Uma opção para conhecer.</p>}{!item.recommendation.comparedMeasurements && <p className="mt-2">O caimento pode ser confirmado com a alfaiataria.</p>}</div>}
              <p className="mt-3 text-xs text-slate-500">{item.available ? 'Disponível no período consultado' : 'Indisponível no período consultado'}</p><button className="customer-outline mt-4 w-full" onClick={() => { setSelectedId(item.id); setSent(null); }} aria-label={'Ver detalhes de ' + item.title}>Ver detalhes</button>
            </div>
          </article>)}</div>}
      </>}
    </>
  );
}
