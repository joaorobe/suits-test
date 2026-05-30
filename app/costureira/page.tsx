"use client";

import React from "react";
import Image from "next/image";
import { FiUser, FiClock, FiCheckCircle, FiSearch, FiFilter } from "react-icons/fi";
import { FiBriefcase, FiScissors, FiBarChart, FiRotateCcw, FiSettings, FiBell } from "react-icons/fi";
import Sidebar from "../components/Sidebar";

const tasks = [
  { id: "ORD-1234", title: "Terno Preto Alfaiataria", note: "Ajustar barra da manga (2cm) e acinturamento", who: "Gladimir", when: "Hoje - 14:00", status: "Aguardando" },
  { id: "ORD-1256", title: "Terno Preto Alfaiataria", note: "Ajustar barra da manga (3cm) e encurtamento", who: "Gladimir", when: "Amanhã - 14:00", status: "Aguardando" },
  { id: "ORD-1299", title: "Smoking Veludo", note: "Ajuste completo de ombros. Prioridade para evento.", who: "Gladimir", when: "Em andamento", status: "Em execução" },
  { id: "ORD-1301", title: "Terno Preto Alfaiataria", note: "Ajustar barra da manga (2cm)", who: "Gladimir", when: "Hoje - 09:00", status: "Finalizado" },
];

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-md p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-[var(--suit-navy)]">{value}</div>
      </div>
      <div className="text-2xl text-gray-400">●</div>
    </div>
  );
}

function TaskCard({ t, actionLabel }: { t: (typeof tasks)[0]; actionLabel: string }) {
  const accent = t.status === "Aguardando" ? "border-l-4 border-green-200" : t.status === "Em execução" ? "border-l-4 border-yellow-200" : "border-l-4 border-gray-200";
  return (
    <div className={`bg-white rounded-md border border-gray-100 p-4 shadow-sm mb-4 ${accent}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">{t.id}</div>
            <div className="text-xs text-gray-500">{t.when}</div>
          </div>
          <div className="font-medium text-[var(--suit-navy)] mt-1">{t.title}</div>
          <div className="text-sm text-gray-600 mt-2">{t.note}</div>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100"><FiUser className="text-gray-500" /></span>
              {t.who}
            </div>
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          <button className="bg-[var(--suit-navy)] text-[var(--suit-gold)] px-3 py-1 rounded text-sm">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function CostureiraPage() {
  const aguardando = tasks.filter((x) => x.status === "Aguardando");
  const execucao = tasks.filter((x) => x.status === "Em execução");
  const finalizado = tasks.filter((x) => x.status === "Finalizado");

  return (
    <div className="min-h-screen flex bg-[var(--background)] font-sans">
      <Sidebar active="Costureira" />

      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-6 bg-[var(--suit-navy)] p-6 text-white rounded-md">
          <div>
            <h1 className="text-4xl font-serif">Gestão de Demandas</h1>
            <p className="text-sm text-white/80 mt-1">Acompanhe e gerencie os ajustes de alfaiataria em andamento</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-md px-3 py-2 shadow-sm">
              <FiSearch className="text-gray-400 mr-2" />
              <input placeholder="Buscar pedido ou cliente" className="outline-none text-sm" />
            </div>
            <button className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-md border border-white/10"><FiFilter /> Filtrar</button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <SmallStat label="Total Atribuído" value={2} />
          <SmallStat label="Aguardando" value={2} />
          <SmallStat label="Em execução" value={1} />
          <SmallStat label="Finalizados (Hoje)" value={1} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Aguardando</h3>
              <div className="text-sm text-gray-500">{aguardando.length}</div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
              {aguardando.map((t) => (
                <TaskCard key={t.id} t={t} actionLabel="Iniciar" />
              ))}
            </div>
          </div>

          <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Em execução</h3>
              <div className="text-sm text-gray-500">{execucao.length}</div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
              {execucao.map((t) => (
                <TaskCard key={t.id} t={t} actionLabel="Concluir" />
              ))}
            </div>
          </div>

          <div className="flex flex-col bg-white rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Finalizado</h3>
              <div className="text-sm text-gray-500">{finalizado.length}</div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[65vh]">
              {finalizado.map((t) => (
                <TaskCard key={t.id} t={t} actionLabel="Ver detalhes" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
