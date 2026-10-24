import Link from 'next/link';
export default function NotFound(){return <section className="customer-card p-8"><h1 className="customer-title">Reserva não encontrada</h1><p className="my-5 text-sm text-slate-500">Confira o endereço ou consulte as reservas disponíveis na sua conta.</p><Link className="customer-link" href="/cliente/reservas">Voltar às minhas reservas</Link></section>;}
