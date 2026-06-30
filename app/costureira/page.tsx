"use client";

import React, { useEffect, useState } from "react";
import { FiUser, FiSearch, FiFilter } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import AuthGuard from "../components/AuthGuard";
import type { TailorTask } from "../../lib/types";

function SmallStat({ label, value }: { label: string; value: string | number }) {
  const valueColor = label === "Total Atribuído"
    ? "text-emerald-600"
    : label === "Aguardando"
      ? "text-orange-600"
      : label === "Em execução"
        ? "text-amber-600"
        : label === "Finalizados (Hoje)"
          ? "text-slate-500"
          : "text-[#17182b]";
  const labelColor = label === "Aguardando"
    ? "text-orange-600"
    : label === "Em execução"
      ? "text-amber-600"
      : label === "Finalizados (Hoje)"
        ? "text-slate-500"
        : "text-slate-500";
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <div className={`text-sm uppercase tracking-[0.18em] mb-3 ${labelColor}`}>{label}</div>
      <div className={`text-3xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function TaskCard({ t, actionLabel, onAction }: { t: TailorTask; actionLabel: string; onAction: () => void }) {
  const accent = t.status === "Aguardando" ? "border-l-4 border-orange-300" : t.status === "Em execução" ? "border-l-4 border-amber-300" : "border-l-4 border-slate-300";
  const statusTextClass = t.status === "Aguardando" ? "text-orange-600" : t.status === "Em execução" ? "text-amber-600" : "text-slate-500";
  return (
    <div className={`bg-white rounded-[28px] border border-slate-200 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${accent}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.id}</span>
            <span>{t.when}</span>
          </div>
          <div className="mt-3 text-lg font-semibold text-[#17182b]">{t.title}</div>
          <div className="text-sm text-slate-600 mt-2">{t.note}</div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><FiUser /></span>
            {t.assignedTo}
          </div>
          <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTextClass} border-current`}>{t.status}</div>
        </div>
        <div className="flex items-center justify-end">
          <button onClick={onAction} className="rounded-2xl bg-[#17182b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function CostureiraPage() {
  const [tasks, setTasks] = useState<TailorTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      const response = await fetch("/api/costureira");
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    }
    loadTasks();
  }, []);

  async function handleAction(task: TailorTask) {
    const nextStatus = task.status === "Aguardando" ? "Em execução" : task.status === "Em execução" ? "Finalizado" : task.status;
    if (nextStatus === task.status) return;

    const response = await fetch("/api/costureira", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
    if (!response.ok) return;
    const updated = await response.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const aguardando = tasks.filter((x) => x.status === "Aguardando");
  const execucao = tasks.filter((x) => x.status === "Em execução");
  const finalizado = tasks.filter((x) => x.status === "Finalizado");

  return (
    <AuthGuard>
      <div className="flex min-h-screen overflow-hidden bg-[#F3F5F8] font-sans">
        <Sidebar active="Costureira" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-serif font-semibold">Gestão de Demandas</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">Acompanhe e gerencie os ajustes de alfaiataria em andamento com clareza e fluidez.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
                <FiSearch className="text-slate-400" />
                <input placeholder="Buscar pedido ou cliente" className="w-full bg-transparent text-sm text-[#17182b] outline-none" />
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17182b] shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:bg-slate-100"><FiFilter /> Filtrar</button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-4">
          <SmallStat label="Total Atribuído" value={loading ? "..." : tasks.length} />
          <SmallStat label="Aguardando" value={loading ? "..." : aguardando.length} />
          <SmallStat label="Em execução" value={loading ? "..." : execucao.length} />
          <SmallStat label="Finalizados (Hoje)" value={loading ? "..." : finalizado.length} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(null).map((_, index) => (
              <div key={index} className="h-[32rem] rounded-[28px] bg-slate-100" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-8 py-12 text-center text-slate-500 shadow-sm">
            <p className="text-xl font-semibold">Nenhuma tarefa encontrada.</p>
            <p className="mt-2 text-sm">Quando houver demandas na API, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-orange-600">Aguardando</h3>
                <div className="text-sm text-orange-600">{aguardando.length}</div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
                {aguardando.map((t) => (
                  <TaskCard key={t.id} t={t} actionLabel="Iniciar" onAction={() => handleAction(t)} />
                ))}
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-amber-600">Em execução</h3>
                <div className="text-sm text-amber-600">{execucao.length}</div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
                {execucao.map((t) => (
                  <TaskCard key={t.id} t={t} actionLabel="Concluir" onAction={() => handleAction(t)} />
                ))}
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-500">Finalizado</h3>
                <div className="text-sm text-slate-500">{finalizado.length}</div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
                {finalizado.map((t) => (
                  <TaskCard key={t.id} t={t} actionLabel="Ver detalhes" onAction={() => {}} />
                ))}
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </AuthGuard>
  );
}
