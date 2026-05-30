"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FiSearch, FiFilter, FiCheckCircle, FiClock, FiAlertTriangle, FiUser } from "react-icons/fi";
import Sidebar from "../components/Sidebar";

const sample = [
  { order: "#ORD-1234", client: "Robinson Abraham", itemId: "ID-123", item: "Smoking Preto Slim", dateLabel: "Hoje, 18:00", dateNote: "Retirado em 15/05", status: "Aguardando", penalty: "-", action: "Confirmar" },
  { order: "#ORD-1235", client: "Edecinho Jepsen", itemId: "ID-124", item: "Smoking Preto Slim", dateLabel: "Ontem", dateNote: "1 dia de atraso", status: "Atrasado", penalty: "R$ 50,00", action: "Confirmar" },
  { order: "#ORD-1236", client: "Anthonio Escobar", itemId: "ID-125", item: "Smoking Preto Slim", dateLabel: "25/04/2026 10:30", dateNote: "", status: "Devolvido", penalty: "Avaria Reportada", action: "Entregue" },
];

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-[var(--suit-surface)] rounded-md p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-[var(--suit-navy)]">{value}</div>
      {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Aguardando: "text-[var(--suit-gold)]",
    Atrasado: "text-red-500",
    Devolvido: "text-green-500",
  };
  return <div className={`text-sm font-medium ${map[status] || "text-gray-500"}`}>{status}</div>;
}

export default function DevolucaoPage() {
  const [tab, setTab] = useState("Todas");

  return (
    <div className="min-h-screen flex bg-[var(--background)] font-sans">
      <Sidebar active="Devolução" />

      <main className="flex-1 p-10">
        <header className="flex items-center justify-between mb-6 bg-[var(--suit-navy)] p-6 text-white rounded-md">
          <div>
            <h1 className="text-4xl font-serif">Gestão de Devoluções</h1>
            <p className="text-sm text-white/80 mt-1">Acompanhe e gerencie as devoluções em andamento</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-md px-3 py-2 shadow-sm border border-gray-200">
              <FiSearch className="text-[var(--suit-navy)] mr-2" />
              <input placeholder="Buscar pedido ou cliente" className="outline-none text-sm text-[var(--suit-navy)] placeholder-gray-400" />
            </div>
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-md border shadow-sm text-[var(--suit-navy)]"><FiFilter /> Filtrar</button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <StatCard label="Devoluções Hoje" value={1} hint="110% vs ontem" />
          <StatCard label="Atrasados" value={2} hint="12 novos hoje" />
          <StatCard label="Itens Danificados" value={3} hint="Requer atenção" />
          <StatCard label="Taxas de multas" value={`R$ 120`} hint={`5% vs mês passado`} />
        </div>

        <div className="bg-[var(--suit-surface)] p-4 rounded-md mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <nav className="flex gap-6 items-center">
              {['Todas','Pendentes','Atrasadas','Concluídas'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab===t? 'text-[var(--suit-navy)] border-b-2 border-[var(--suit-gold)]' : 'text-gray-500'}`}>
                  {t}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 bg-[var(--suit-surface)] border rounded-md text-sm">12 Mai - 19 Mai</button>
              <button className="px-3 py-2 bg-white border rounded-md text-sm"><FiFilter /> Filtros</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="min-w-full table-fixed">
            <thead className="bg-[var(--suit-surface)]">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" /></th>
                <th className="p-4 text-left">Pedido/Cliente</th>
                <th className="p-4 text-left">Itens</th>
                <th className="p-4 text-left">Data Prevista</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Multas/Avarias</th>
                <th className="p-4 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((s) => (
                <tr key={s.order} className="border-t">
                  <td className="p-4"><input type="checkbox" /></td>
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><FiUser className="text-gray-400" /></div>
                      <div>
                        <div className="text-xs text-gray-400">{s.order}</div>
                        <div className="font-medium text-[var(--suit-navy)]">{s.client}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="text-xs text-gray-400">{s.itemId}</div>
                    <div className="text-sm">{s.item}</div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-medium">{s.dateLabel}</div>
                    {s.dateNote ? <div className="text-xs text-red-500">{s.dateNote}</div> : null}
                  </td>
                  <td className="p-4 align-top"><StatusBadge status={s.status} /></td>
                  <td className="p-4 align-top"><div className="text-sm text-gray-600">{s.penalty}</div></td>
                  <td className="p-4 align-top">
                    {s.action === 'Confirmar' ? (
                      <button className="px-3 py-2 bg-[var(--suit-navy)] text-[var(--suit-gold)] rounded-md">Confirmar</button>
                    ) : (
                      <button className="px-3 py-2 bg-gray-100 rounded-md text-sm" disabled>Entregue</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">Mostrando 1 a 10 de 20 devoluções</div>
            <div className="flex items-center gap-2">
              <button className="p-2">◀</button>
              <div className="flex gap-1">
                <button className="w-8 h-8 bg-[var(--suit-navy)] text-white rounded">1</button>
                <button className="w-8 h-8 rounded border">2</button>
                <button className="w-8 h-8 rounded border">3</button>
              </div>
              <button className="p-2">▶</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
