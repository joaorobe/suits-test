'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiCalendar, FiCamera, FiCheck, FiCompass, FiGrid, FiRefreshCw, FiSliders, FiX } from 'react-icons/fi';
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

export default function Catalog({ initialDate, initialView = 'welcome', showTryOnIntro = false }: { initialDate: string; initialView?: 'welcome' | 'quiz' | 'catalog'; showTryOnIntro?: boolean }) {
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
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnFile, setTryOnFile] = useState<File | null>(null);
  const [tryOnPreview, setTryOnPreview] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [tryOnConsent, setTryOnConsent] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnError, setTryOnError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'welcome' | 'quiz' | 'results' | 'catalog'>(initialView);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ event: null, style: null, color: null, budget: null });
  const details = useRef<HTMLElement>(null);
  const tryOnDialog = useRef<HTMLDialogElement>(null);
  const selected = items.find(item => item.id === selectedId);
  const isPresentationMock = selected?.id === 'demo-history';
  const checked = draft.start === filters.start && draft.end === filters.end;
  const activeFilterCount = [draft.q, draft.category, draft.size, draft.min, draft.max, draft.available, draft.start !== initialDate || draft.end !== initialDate].filter(Boolean).length;
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

  useEffect(() => {
    const dialog = tryOnDialog.current;
    if (!dialog) return;
    if (tryOnOpen && !dialog.open) dialog.showModal();
    else if (!tryOnOpen && dialog.open) dialog.close();
  }, [tryOnOpen]);

  useEffect(() => {
    if (!tryOnPreview) return;
    return () => URL.revokeObjectURL(tryOnPreview);
  }, [tryOnPreview]);

  useEffect(() => {
    if (!tryOnResult) return;
    if (!tryOnResult.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(tryOnResult);
  }, [tryOnResult]);

  function update(key: keyof Filters, value: string) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setSent(null);
  }

  function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSent(null);
    setFilters({ ...draft });
    setFiltersOpen(false);
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

  async function chooseTryOnPhoto(file?: File) {
    setTryOnError('');
    setTryOnResult(null);
    setTryOnFile(null);
    setTryOnPreview(null);
    setTryOnConsent(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setTryOnError('Escolha uma foto JPG, PNG ou WEBP.');
      return;
    }

    try {
      const source = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / source.width, 1600 / source.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a foto neste dispositivo.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      source.close();

      const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!compressed) throw new Error('Não foi possível preparar a foto. Tente outra imagem.');
      if (compressed.size > 3 * 1024 * 1024) throw new Error('Esta foto ficou muito grande. Escolha uma imagem menor.');
      const preparedFile = new File([compressed], 'foto-cliente.jpg', { type: 'image/jpeg' });
      setTryOnFile(preparedFile);
      setTryOnPreview(URL.createObjectURL(compressed));
    } catch (error) {
      setTryOnError(error instanceof Error ? error.message : 'Não foi possível abrir esta foto.');
    }
  }

  async function generateTryOn() {
    if (!selected || (!isPresentationMock && !tryOnFile) || !tryOnConsent || tryOnLoading) return;
    setTryOnLoading(true);
    setTryOnError('');
    setTryOnResult(null);
    try {
      if (isPresentationMock) {
        await new Promise(resolve => window.setTimeout(resolve, 5000));
        setTryOnResult('/demo-tryon/smoking-peak-result.png');
        return;
      }
      if (!tryOnFile) return;
      const form = new FormData();
      form.set('itemId', selected.id);
      form.set('personImage', tryOnFile);
      form.set('consent', 'true');
      const response = await fetch('/api/cliente/provador', { method: 'POST', body: form });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        const message = result && typeof result === 'object' && 'message' in result && typeof result.message === 'string' ? result.message : 'O provador está ocupado ou indisponível. Tente novamente mais tarde.';
        throw new Error(message);
      }
      const image = await response.blob();
      if (!image.size || !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('O provador não retornou uma imagem válida.');
      setTryOnResult(URL.createObjectURL(image));
    } catch (error) {
      setTryOnError(error instanceof Error ? error.message : 'Confira sua conexão e tente novamente.');
    } finally {
      setTryOnLoading(false);
    }
  }

  function openTryOn() {
    setTryOnError('');
    setTryOnFile(null);
    setTryOnPreview(null);
    setTryOnResult(null);
    setTryOnConsent(false);
    setTryOnOpen(true);
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
            <button type="button" className="customer-outline" aria-expanded={filtersOpen} aria-controls="customer-catalog-filters" onClick={() => setFiltersOpen(open => !open)}><FiSliders aria-hidden="true"/> Filtros{activeFilterCount > 0 && <span className="customer-filter-count">{activeFilterCount}</span>}</button>
            {view === 'results' ? <><button type="button" className="customer-outline" onClick={restartQuiz}><FiRefreshCw aria-hidden="true"/> Refazer quiz</button><button type="button" className="customer-link" onClick={browseCatalog}>Ver catálogo completo</button></> : <button type="button" className="customer-outline" onClick={() => setView('welcome')}><FiCompass aria-hidden="true"/> Fazer o quiz</button>}
          </div>
        </header>

        {view === 'results' && <p className="text-xs leading-5 text-slate-500">A compatibilidade considera suas respostas e as características cadastradas pela alfaiataria. Dados ausentes não reduzem a nota; sem critérios comparáveis, mostramos 50% como referência neutra, não como recomendação personalizada.</p>}

        {showTryOnIntro && view === 'catalog' && <section className="customer-tryon-intro">
          <span className="customer-tryon-promo-icon"><FiCamera aria-hidden="true"/></span>
          <div><p className="customer-eyebrow">Novidade para você</p><h2 className="mt-1 font-serif text-xl sm:text-2xl">Experimente antes de escolher</h2><p className="mt-2 text-sm leading-6 text-slate-600">Abra os detalhes de um traje e use o Provador Virtual para ter uma prévia com sua foto.</p></div>
          <span className="customer-tryon-promo-note">Demonstração acadêmica · uso não comercial</span>
        </section>}

        <div id="customer-catalog-filters" hidden={!filtersOpen}>
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
        </div>

        {error && <p role="alert" className="customer-alert">{error}</p>}
        {sent && <div role="status" className="customer-card border-emerald-500 p-6"><h2 className="font-serif text-2xl">Solicitação enviada!</h2><p className="mt-2 text-sm text-slate-500">A alfaiataria vai analisar seu pedido. Nenhuma cobrança foi realizada.</p><Link href={'/cliente/reservas/' + sent} className="customer-link mt-4 inline-block">Acompanhar solicitação →</Link></div>}
        {selected && !sent && <section ref={details} tabIndex={-1} aria-label="Resumo da solicitação" className="customer-card grid gap-6 p-6 outline-none md:grid-cols-[180px_1fr]">
          <Image src={selected.image || '/terno1.jpg'} width={360} height={420} unoptimized alt={selected.title} className="aspect-[4/5] w-full max-w-60 rounded-2xl object-cover"/>
          <div><p className="customer-eyebrow">Seu traje, seus planos</p><h2 className="mt-2 font-serif text-2xl">{selected.title}</h2><p className="mt-2 text-sm text-slate-600">{selected.description} · {selected.color} · Tamanho {selected.size}</p><p className="mt-4 text-sm">Retirada: <strong>{date(filters.start)}</strong> · Devolução: <strong>{date(filters.end)}</strong></p><p className="mt-3 font-medium">Estimativa: {currency(selected.estimate)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Valor sujeito à confirmação da alfaiataria. O período considera os dias de retirada e devolução para disponibilidade. Sem cobrança automática.</p><p className="mt-2 text-xs text-slate-500">{selected.availabilityNote}</p><p className="customer-badge mt-4">{!checked ? 'Consulte novamente após mudar as datas' : selected.available ? 'Disponível para solicitar' : 'Indisponível nesse período'}</p><div className="mt-5 flex flex-wrap gap-3"><button className="customer-button" onClick={submit} disabled={sending || loading || !selected.available || !checked || !!error}>{sending ? 'Enviando...' : 'Enviar solicitação'}</button><button type="button" className="customer-tryon-button" onClick={openTryOn}><FiCamera aria-hidden="true"/> Provar no Provador Virtual</button><button className="customer-link" onClick={() => setSelectedId(null)}>Escolher outro traje</button></div><p className="mt-3 text-xs text-slate-500">A solicitação bloqueia o período até ser aprovada, recusada ou cancelada.</p></div>
        </section>}

        <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-slate-500">{loading ? 'Consultando o inventário...' : items.length + (items.length === 1 ? ' traje encontrado' : ' trajes encontrados')}</p>{view === 'results' && !loading && <span className="customer-result-note"><FiCheck aria-hidden="true"/> {items.some(item => item.recommendation?.score != null) ? 'Ordenados por compatibilidade' : 'Sem critérios para personalizar a ordem'}</span>}</div>
        {!loading && !items.length ? <Empty title={view === 'results' ? 'Ainda não encontramos uma combinação' : 'Nenhum traje encontrado'}><p>{view === 'results' ? 'Tente ajustar as respostas ou confira todas as peças do catálogo.' : 'Experimente outras datas ou remova alguns filtros.'}</p>{view === 'results' && <button type="button" className="customer-link mt-3" onClick={restartQuiz}>Ajustar minhas respostas</button>}</Empty>
          : <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} className="customer-card customer-garment-card overflow-hidden">
            <div className="relative aspect-[4/4.5] overflow-hidden bg-slate-100"><Image src={item.image || '/terno1.jpg'} alt={item.title + ', ' + item.color} fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" className="object-cover"/><span className="absolute left-3 top-3 rounded-full bg-[#17182b]/90 px-3 py-1 text-xs text-white">{item.category}</span>{item.recommendation && <span className={'absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ' + (item.recommendation.score == null ? 'customer-score-neutral' : 'bg-white/95 text-[#17182b]')}>{item.recommendation.score == null ? '50% · referência' : item.recommendation.score + '% combina'}</span>}</div>
            <div className="p-5"><h2 className="text-xl font-serif">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{item.color} · Tamanho {item.size}</p><p className="mt-3 text-sm font-medium">{currency(item.price)}{item.price != null ? ' / diária' : ''}</p>
              {item.recommendation && <div className="customer-match mt-3"><p className="font-semibold">{item.recommendation.score == null ? '50% é uma referência neutra, não uma nota personalizada' : item.recommendation.score + '% de compatibilidade com suas respostas'}</p>{item.recommendation.reasons.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-4">{item.recommendation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul> : <p className="mt-2">{item.recommendation.score == null ? 'Suas escolhas não trouxeram critérios comparáveis para este traje. Veja a peça e escolha pelo seu estilo.' : 'Uma opção para conhecer.'}</p>}{!item.recommendation.comparedMeasurements && <p className="mt-2">O caimento pode ser confirmado com a alfaiataria.</p>}</div>}
              <p className="mt-3 text-xs text-slate-500">{item.available ? 'Disponível no período consultado' : 'Indisponível no período consultado'}</p><button className="customer-outline mt-4 w-full" onClick={() => { setSelectedId(item.id); setSent(null); }} aria-label={'Ver detalhes de ' + item.title}>Ver detalhes</button>
            </div>
          </article>)}</div>}
      </>}
      <dialog ref={tryOnDialog} aria-labelledby="tryon-title" className="customer-tryon-dialog" onCancel={event => { event.preventDefault(); if (!tryOnLoading) setTryOnOpen(false); }} onClose={() => { setTryOnOpen(false); setTryOnFile(null); setTryOnPreview(null); setTryOnResult(null); setTryOnConsent(false); }}>
        {selected && <div className="customer-tryon-modal">
          <div className="customer-tryon-modal-header"><div><p className="customer-eyebrow">Uma prévia para imaginar</p><h2 id="tryon-title" className="mt-1 font-serif text-2xl">Provador Virtual</h2><p className="mt-1 text-sm text-slate-500">{selected.title}</p></div><button type="button" className="customer-icon customer-tryon-close" aria-label="Fechar provador virtual" disabled={tryOnLoading} onClick={() => setTryOnOpen(false)}><FiX aria-hidden="true"/></button></div>
          <div className="customer-tryon-modal-body">
            <div className="customer-tryon-form">
              {isPresentationMock ? <>
                <p className="text-sm leading-6 text-slate-600">Foto de teste já selecionada para demonstrar o fluxo do provador com o Smoking Peak.</p>
                <p className="customer-label mt-5">Foto selecionada</p>
                <div className="customer-tryon-person-preview"><Image src="/demo-tryon/smoking-peak-person.png" alt="Foto predefinida para a demonstração do provador" fill unoptimized sizes="(max-width: 640px) 100vw, 320px" className="object-contain"/></div>
                <p className="customer-tryon-privacy">Esta é uma imagem ilustrativa pré-gerada: não é uma prova feita com sua foto, não analisa seu corpo e não envia imagens a um serviço externo.</p>
                <label className="customer-tryon-consent"><input type="checkbox" checked={tryOnConsent} disabled={tryOnLoading} onChange={event => setTryOnConsent(event.target.checked)}/><span>Entendi que esta é uma demonstração com resultado pré-gerado e que a foto não será enviada para processamento.</span></label>
              </> : <>
                <p className="text-sm leading-6 text-slate-600">Envie uma foto sua, de frente, com boa iluminação e usando uma calça que combine com o traje. Vamos gerar uma prévia virtual da parte de cima.</p>
                <label className="customer-label mt-5">Sua foto
                  <input className="customer-input customer-tryon-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={tryOnLoading} onChange={event => { void chooseTryOnPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }}/>
                </label>
                <p className="mt-2 text-xs leading-5 text-slate-500">JPG, PNG ou WEBP. A imagem é reduzida no seu dispositivo antes do envio.</p>
                {tryOnPreview && <div className="customer-tryon-person-preview"><Image src={tryOnPreview} alt="Prévia da sua foto para o provador" fill unoptimized sizes="(max-width: 640px) 100vw, 320px" className="object-contain"/></div>}
                <p className="customer-tryon-privacy">Demonstração acadêmica não comercial. Ao continuar, sua foto e a imagem do traje serão enviadas ao Hugging Face IDM-VTON para gerar esta prévia. O Suits não persiste a foto nem o resultado; o provedor aplica sua própria política de processamento e retenção. A prévia fica temporariamente disponível nesta tela. Use apenas uma foto sua.</p>
                <label className="customer-tryon-consent"><input type="checkbox" checked={tryOnConsent} disabled={tryOnLoading} onChange={event => setTryOnConsent(event.target.checked)}/><span>Autorizo o envio temporário da minha foto ao serviço externo para esta geração.</span></label>
              </>}
              {tryOnError && <p role="alert" className="customer-alert mt-4">{tryOnError}</p>}
              <button type="button" className="customer-button mt-5 w-full" disabled={(!isPresentationMock && !tryOnFile) || !tryOnConsent || tryOnLoading} onClick={() => void generateTryOn()}>{tryOnLoading ? <><span className="customer-spinner" aria-hidden="true"/> Preparando sua prévia...</> : <><FiCamera aria-hidden="true"/> Gerar prova virtual</>}</button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">{isPresentationMock ? 'A prévia aparece após alguns segundos, como demonstração do fluxo.' : 'Resultado ilustrativo, não garante caimento, cor ou tamanho. O modelo prioriza a parte superior do traje.'}</p>
            </div>
            <div className="customer-tryon-result" aria-live="polite">
              {tryOnResult ? <><p className="customer-eyebrow">Sua prévia</p><div className="customer-tryon-result-image"><Image src={tryOnResult} alt={'Prévia virtual com ' + selected.title} fill unoptimized sizes="(max-width: 768px) 100vw, 480px" className="object-contain"/></div><p className="mt-3 text-xs leading-5 text-slate-500">{isPresentationMock ? 'Simulação para apresentação: resultado pré-gerado, não processado a partir da foto.' : 'A imagem fica disponível temporariamente nesta tela e não é salva pelo Suits.'}</p><a className="customer-link mt-3 inline-block" href={tryOnResult} download="previa-virtual">Salvar prévia no dispositivo</a></>
                : tryOnLoading ? <div className="customer-tryon-loading"><span className="customer-spinner customer-spinner-large" aria-hidden="true"/><p className="mt-4 font-serif text-xl">Criando sua prévia</p><p className="mt-2 text-center text-sm text-slate-500">O provador pode levar até um minuto. Mantenha esta tela aberta.</p></div>
                  : <div className="customer-tryon-empty"><FiCamera aria-hidden="true"/><p>Escolha uma foto para começar</p></div>}
            </div>
          </div>
        </div>}
      </dialog>
    </>
  );
}
