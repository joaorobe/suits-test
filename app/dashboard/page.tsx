"use client";

import React from "react";
import { FiBriefcase, FiBarChart2, FiRotateCcw, FiTrendingUp, FiBell, FiUsers, FiClock } from "react-icons/fi";
import Sidebar from "../components/Sidebar";

const summaryCards = [
  { label: "Trajes no Estoque", value: "152", detail: "32 novas unidades", icon: <FiBriefcase className="text-2xl" />, color: "text-[#17182b]" },
  { label: "Devoluções Pendentes", value: "5", detail: "2 com atraso", icon: <FiRotateCcw className="text-2xl" />, color: "text-orange-600" },
  { label: "Ajustes em Andamento", value: "8", detail: "3 prioridades", icon: <FiBarChart2 className="text-2xl" />, color: "text-amber-600" },
  { label: "Clientes Ativos", value: "46", detail: "+12 este mês", icon: <FiUsers className="text-2xl" />, color: "text-slate-700" },
];

const activityItems = [
  { title: "Reserva confirmada", description: "Smoking para evento social", time: "Há 40 min", badge: "Em andamento" },
  { title: "Devolução agendada", description: "Terno preto retirado em 18/05", time: "Hoje, 09:15", badge: "Pendente" },
  { title: "Ajuste concluído", description: "Alfaiataria de paletó", time: "Ontem, 16:30", badge: "Finalizado" },
];

const overviewCards = [
  { title: "Taxa de Retorno", value: "4.2%", change: "+0.8%", color: "text-green-600" },
  { title: "Tempo Médio de Ajuste", value: "1h 20m", change: "-10m", color: "text-slate-700" },
  { title: "Multas em Aberto", value: "R$ 420", change: "+R$ 120", color: "text-red-600" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex bg-[#F3F5F8] font-sans">
      <Sidebar active="Dashboard" />

      <main className="flex-1 p-10">
        <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Painel</p>
              <h1 className="mt-2 text-4xl font-serif font-semibold">Visão geral do Suits</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200">Acompanhe estoque, devoluções e demandas de costura com métricas atualizadas e foco operacional.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17182b] shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:bg-slate-100">
                <FiBell className="mr-2 text-lg" /> Notificações
              </button>
              <button className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/20">
                <FiClock className="mr-2 text-lg" /> Atualizar
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-4 mb-8">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500 uppercase tracking-[0.18em]">{card.label}</div>
                  <div className={`mt-4 text-4xl font-semibold ${card.color}`}>{card.value}</div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">
                  {card.icon}
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">{card.detail}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
          <div className="col-span-2 rounded-[32px] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#17182b]">Resumo Operacional</h2>
                <p className="mt-2 text-sm text-slate-500">Principais indicadores para resultados e fluxo de processos.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                <FiTrendingUp className="text-base" /> Últimas 24h
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {overviewCards.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm text-slate-500">{item.title}</div>
                  <div className="mt-4 text-3xl font-semibold text-[#17182b]">{item.value}</div>
                  <div className={`mt-2 text-sm ${item.color}`}>{item.change}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17182b]">Atividades Recentes</h2>
                <p className="mt-2 text-sm text-slate-500">Ações e eventos mais recentes.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600">Topo</span>
            </div>

            <div className="space-y-4">
              {activityItems.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#17182b]">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                    </div>
                    <div className="text-xs text-slate-400">{item.time}</div>
                  </div>
                  <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#17182b]">{item.badge}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17182b]">Fluxo de Reservas</h2>
                <p className="mt-2 text-sm text-slate-500">Reservas e devoluções previstas.</p>
              </div>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">Ver relatórios</button>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-[#17182b] p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-[0.2em] text-slate-200">Reservas ativas</span>
                  <span className="text-2xl font-semibold">24</span>
                </div>
                <div className="mt-4 text-sm text-slate-200">5 devoluções agendadas, 3 pendentes de confirmação.</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm text-slate-500">Em retirada</div>
                  <div className="mt-3 text-2xl font-semibold text-[#17182b]">12</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm text-slate-500">Aguardando devolução</div>
                  <div className="mt-3 text-2xl font-semibold text-[#17182b]">8</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#17182b]">Resumo de Costura</h2>
              <p className="mt-2 text-sm text-slate-500">Tarefas pendentes e prazos de entrega.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Ajustes em andamento</span>
                  <span className="text-2xl font-semibold text-[#17182b]">8</span>
                </div>
                <div className="mt-3 text-sm text-slate-500">2 urgentes, 6 em fluxo normal.</div>
              </div>
              <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">Aguardando revisão</span>
                  <span className="text-2xl font-semibold text-orange-600">4</span>
                </div>
                <div className="mt-3 text-sm text-orange-600">Prioridade de entrega nas próximas 12h.</div>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700">Concluídos hoje</span>
                  <span className="text-2xl font-semibold text-emerald-700">5</span>
                </div>
                <div className="mt-3 text-sm text-emerald-700">Tudo pronto para entrega ou retirada.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
