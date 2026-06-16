"use client";

import React, { useEffect, useState } from "react";
import { FiSearch, FiFilter, FiUser } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import type { ReturnOrder } from "../../lib/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  const labelColor =
    label === "Aguardando"
      ? "text-orange-600"
      : label === "Atrasados"
        ? "text-red-600"
        : label === "Finalizados (Hoje)"
          ? "text-slate-500"
          : label === "Total Atribuído"
            ? "text-emerald-600"
            : "text-slate-500";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <div className={`text-sm uppercase tracking-[0.2em] ${labelColor} mb-3`}>{label}</div>
      <div className={`text-3xl font-semibold ${labelColor}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnOrder["status"] }) {
  const statusStyles: Record<ReturnOrder["status"], string> = {
    Aguardando: "bg-amber-100 text-amber-700 border border-amber-200",
    Atrasado: "bg-red-100 text-red-700 border border-red-200",
    Devolvido: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function DevolucaoPage() {
  const [tab, setTab] = useState("Todas");
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const response = await fetch("/api/devolucao");
      const data = await response.json();
      setOrders(data);
      setLoading(false);
    }
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (tab === "Pendentes") return order.status === "Aguardando";
    if (tab === "Atrasadas") return order.status === "Atrasado";
    if (tab === "Concluídas") return order.status === "Devolvido";
    return true;
  });

  async function handleConfirm(order: ReturnOrder) {
    const response = await fetch("/api/devolucao", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: order.order, status: "Devolvido", returnedDate: new Date().toLocaleString(), penalty: order.penalty }),
    });
    if (!response.ok) return;
    const updated = await response.json();
    setOrders((prev) => prev.map((item) => (item.order === updated.order ? updated : item)));
  }

  return (
    <div className="min-h-screen flex bg-[#F3F5F8] font-sans">
      <Sidebar active="Devolução" />

      <main className="flex-1 p-10">
        <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-serif font-semibold">Gestão de Devoluções</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">Acompanhe e gerencie devoluções, multas e itens em atraso com clareza e controle.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
                <FiSearch className="text-slate-400" />
                <input placeholder="Buscar pedido ou cliente" className="w-full bg-transparent text-sm text-[#17182b] outline-none" />
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17182b] shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:bg-slate-100">
                <FiFilter /> Filtrar
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-4">
          <StatCard label="Total Atribuído" value={loading ? "..." : orders.length} />
          <StatCard label="Aguardando" value={loading ? "..." : orders.filter((order) => order.status === "Aguardando").length} />
          <StatCard label="Atrasados" value={loading ? "..." : orders.filter((order) => order.status === "Atrasado").length} />
          <StatCard label="Finalizados (Hoje)" value={loading ? "..." : orders.filter((order) => order.status === "Devolvido").length} />
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] mb-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <nav className="flex flex-wrap gap-3">
              {["Todas", "Pendentes", "Atrasadas", "Concluídas"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-[#17182b] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {t}
                </button>
              ))}
            </nav>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">12 Mai - 19 Mai</button>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-[#17182b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                <FiFilter /> Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-[0.15em]">
                <tr>
                  <th className="px-6 py-4 w-12"><input type="checkbox" /></th>
                  <th className="px-6 py-4">Pedido/Cliente</th>
                  <th className="px-6 py-4">Itens</th>
                  <th className="px-6 py-4">Data Prevista</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Multas/Avarias</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                  {loading ? (
                  Array(3).fill(null).map((_, index) => (
                    <tr key={index} className="border-t last:border-b">
                      <td className="px-6 py-5 align-top"><div className="h-4 w-4 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-3 w-32 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-3 w-24 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-3 w-20 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-3 w-16 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-3 w-20 rounded bg-slate-100" /></td>
                      <td className="px-6 py-5 align-top"><div className="h-9 w-24 rounded-2xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      Nenhuma devolução encontrada. Quando houver dados na API, eles aparecerão aqui.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((s) => (
                    <tr key={s.order} className="border-t last:border-b">
                      <td className="px-6 py-5 align-top"><input type="checkbox" className="h-4 w-4 text-[#17182b]" /></td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><FiUser /></div>
                          <div>
                            <div className="text-xs text-slate-400">{s.order}</div>
                            <div className="font-semibold text-[#17182b]">{s.client}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="text-xs text-slate-400">{s.itemId}</div>
                        <div className="text-sm text-slate-700">{s.item}</div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="font-medium text-slate-700">{s.dueDate}</div>
                        {s.returnedDate ? <div className="text-xs text-red-500 mt-1">{s.returnedDate}</div> : null}
                      </td>
                      <td className="px-6 py-5 align-top"><StatusBadge status={s.status} /></td>
                      <td className="px-6 py-5 align-top"><div className="text-sm text-slate-600">{s.penalty}</div></td>
                      <td className="px-6 py-5 align-top">
                        {s.action === "Confirmar" ? (
                          <button onClick={() => handleConfirm(s)} className="rounded-2xl bg-[#17182b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">{s.action}</button>
                        ) : (
                          <button className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-600" disabled>{s.action}</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 items-center justify-between border-t border-slate-200 p-5 sm:flex-row">
            <div className="text-sm text-slate-500">Mostrando {filteredOrders.length} de {orders.length} devoluções</div>
            <div className="flex items-center gap-2">
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">◀</button>
              <div className="flex gap-2">
                <button className="w-10 rounded-2xl bg-[#17182b] px-2 py-2 text-sm font-semibold text-white">1</button>
                <button className="w-10 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-600">2</button>
                <button className="w-10 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-600">3</button>
              </div>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">▶</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
