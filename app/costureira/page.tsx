"use client";

import React, { useEffect, useState } from "react";
import { FiUser, FiSearch, FiFilter, FiChevronRight, FiEdit2, FiCheck } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import AuthGuard from "../components/AuthGuard";
import type { TailorOrder, InventoryItem } from "../../lib/types";

function SmallStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const defaultColor = label === "Novo" ? "text-blue-600" : label === "Iniciado" ? "text-amber-600" : label === "Finalizado" ? "text-emerald-600" : "text-slate-500";
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <div className={`text-sm uppercase tracking-[0.18em] mb-3 text-slate-500`}>{label}</div>
      <div className={`text-3xl font-semibold ${color || defaultColor}`}>{value}</div>
    </div>
  );
}

function OrderCard({ order, inventory, onUpdateStatus }: { order: TailorOrder; inventory: InventoryItem | null; onUpdateStatus: (id: string, status: TailorOrder["status"]) => void }) {
  const statusColors: Record<TailorOrder["status"], { bg: string; text: string; border: string }> = {
    "Novo": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "Iniciado": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    "Finalizado": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    "Observação": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  };

  const colors = statusColors[order.status];
  const nextStatus: Record<TailorOrder["status"], TailorOrder["status"] | null> = {
    "Novo": "Iniciado",
    "Iniciado": "Finalizado",
    "Finalizado": null,
    "Observação": "Iniciado",
  };

  const next = nextStatus[order.status];
  const canSetObservation = order.status !== "Observação";
  const actionLabel = order.status === "Novo" ? "Iniciar" : order.status === "Iniciado" ? "Finalizar" : order.status === "Observação" ? "Retomar" : "Concluir";

  return (
    <div className={`rounded-[28px] border-l-4 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${colors.bg} ${colors.border}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono">{order.id}</span>
            <span>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="mt-2 text-lg font-semibold text-[#17182b]">{order.adjustmentType}</div>
          <div className="text-sm text-slate-600 mt-2">{order.description}</div>
          {inventory && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-600">
              <div>
                <span className="font-semibold">Traje:</span> {inventory.title} {inventory.subtitle ? `- ${inventory.subtitle}` : ""}
              </div>
              <div>
                <span className="font-semibold">Tamanho:</span> {inventory.size} | <span className="font-semibold">Cor:</span> {inventory.color}
              </div>
            </div>
          )}
          {order.measurements && <div className="text-xs text-slate-500 mt-2 bg-white/50 p-2 rounded">📏 {order.measurements}</div>}
          {order.notes && <div className="text-sm text-slate-600 mt-3 bg-white/50 p-3 rounded border-l-2 border-slate-300">📝 {order.notes}</div>}
          <div className={`mt-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${colors.text} ${colors.border}`}>{order.status}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {next && (
            <button
              onClick={() => onUpdateStatus(order.id, next)}
              className="rounded-2xl bg-[#17182b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 flex items-center gap-2"
            >
              {order.status === "Novo" ? <FiEdit2 className="text-base" /> : <FiCheck className="text-base" />}
              {actionLabel}
            </button>
          )}
          {canSetObservation && (
            <button
              onClick={() => onUpdateStatus(order.id, "Observação")}
              className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Observação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CostureiraPage() {
  const [orders, setOrders] = useState<TailorOrder[]>([]);
  const [inventories, setInventories] = useState<Map<string, InventoryItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem("suits-auth-user");
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        setUser(currentUser);

        if (currentUser?.id) {
          const response = await fetch(`/api/tailor-orders?assignedTo=${currentUser.id}`);
          const data = await response.json();
          setOrders(Array.isArray(data) ? data : []);

          const inventoriesResponse = await fetch("/api/inventory");
          const inventoriesData = await inventoriesResponse.json();
          const map = new Map<string, InventoryItem>();
          if (Array.isArray(inventoriesData)) {
            inventoriesData.forEach((item: InventoryItem) => map.set(item.id, item));
          }
          setInventories(map);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleUpdateStatus(id: string, status: TailorOrder["status"]) {
    try {
      const response = await fetch("/api/tailor-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, completedAt: status === "Finalizado" ? new Date().toISOString() : null }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar");
      const updated = await response.json();
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  const novo = orders.filter((x) => x.status === "Novo").length;
  const iniciado = orders.filter((x) => x.status === "Iniciado").length;
  const finalizado = orders.filter((x) => x.status === "Finalizado").length;
  const observacao = orders.filter((x) => x.status === "Observação").length;

  return (
    <AuthGuard>
      <div className="flex min-h-screen overflow-hidden bg-[#F3F5F8] font-sans">
        <Sidebar active="Costureira" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Costureira</p>
                <h1 className="mt-2 text-4xl font-serif font-semibold">Seus Pedidos de Ajuste</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200">Acompanhe os trajes que chegaram para ajustes. Marque o status conforme você avança no trabalho.</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <FiUser className="text-lg" />
                <span className="text-sm font-medium">{user?.name || "Costureira"}</span>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-4 mb-8">
            <SmallStat label="Novo" value={novo} color="text-blue-600" />
            <SmallStat label="Iniciado" value={iniciado} color="text-amber-600" />
            <SmallStat label="Finalizado" value={finalizado} color="text-emerald-600" />
            <SmallStat label="Observação" value={observacao} color="text-purple-600" />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#17182b]">Seus Pedidos</h2>
              <button onClick={() => window.location.reload()} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#17182b] transition hover:bg-slate-50">
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array(3).fill(null).map((_, i) => (
                  <div key={i} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
                    <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
                    <div className="h-4 w-full bg-slate-100 rounded mb-3" />
                    <div className="h-4 w-2/3 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
                <FiFilter className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-semibold">Nenhum pedido de ajuste no momento</p>
                <p className="text-sm mt-1">Os trajes que chegarem para ajuste aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} inventory={inventories.get(order.inventoryId) || null} onUpdateStatus={handleUpdateStatus} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
