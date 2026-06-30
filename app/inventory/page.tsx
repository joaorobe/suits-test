"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { FiBell, FiBriefcase, FiUser, FiX } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import AuthGuard from "../components/AuthGuard";
import type { InventoryItem, PaymentRecord, ReturnOrder } from "../../lib/types";

const STORAGE_KEY = "suits-pending-inventory";

function loadPendingInventory() {
  if (typeof window === "undefined") return [] as InventoryItem[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InventoryItem[]) : [];
  } catch {
    return [] as InventoryItem[];
  }
}

function savePendingInventory(items: InventoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const RETURN_ORDERS_KEY = "suits-return-orders";

function loadReturnOrders() {
  if (typeof window === "undefined") return [] as ReturnOrder[];
  try {
    const raw = localStorage.getItem(RETURN_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as ReturnOrder[]) : [];
  } catch {
    return [] as ReturnOrder[];
  }
}

function saveReturnOrders(items: ReturnOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RETURN_ORDERS_KEY, JSON.stringify(items));
}

function StatusBadge({ status }: { status: InventoryItem["status"] }) {
  const map: Record<InventoryItem["status"], string> = {
    Disponível: "text-green-500",
    Costureira: "text-[var(--suit-gold)]",
    Alugado: "text-red-500",
    Lavanderia: "text-orange-400",
  };
  return <div className={`text-sm font-medium ${map[status] || "text-gray-300"}`}>{status}</div>;
}

function Card({ item, onAction }: { item: InventoryItem; onAction: (item: InventoryItem, plan: "Diário" | "Semanal") => void }) {
  const [plan, setPlan] = useState<"Diário" | "Semanal">("Diário");
  const price = item.price ?? 0;
  const estimate = plan === "Diário" ? price : Math.round(price * 7 * 0.7 * 100) / 100;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <div className="relative h-64 w-full bg-slate-100">
        <Image src={item.image} alt={item.title} fill className="object-cover" />
      </div>
      <div className="bg-[#17182b] text-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-serif text-2xl font-semibold">{item.title}</h3>
            <p className="text-sm text-slate-200 mt-1">{item.subtitle}</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs text-slate-300">ID - {item.id}</div>
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3 text-sm text-slate-200">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Tamanho</div>
            <div className="mt-2 text-lg font-semibold">{item.size}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Cor</div>
            <div className="mt-2 text-lg font-semibold">{item.color}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Estoque</div>
            <div className="mt-2 text-lg font-semibold">{item.stock}</div>
          </div>
        </div>
      </div>
      <div className="bg-white p-6">
        {item.action.includes("Reservar") ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">Plano de aluguel</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as "Diário" | "Semanal")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              >
                <option>Diário</option>
                <option>Semanal</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              {price > 0 ? `Estimativa: R$ ${estimate.toFixed(2)} ${plan === "Semanal" ? "para 7 dias (30% off)" : "por dia"}` : "Preço não definido para este traje."}
            </div>
          </div>
        ) : null}

        <button
          onClick={() => onAction(item, plan)}
          disabled={item.action.includes("Reservar") && price === 0}
          className="w-full rounded-2xl border border-[#17182b] bg-[#17182b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {item.action}
        </button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showForm, setShowForm] = useState(false);
  const priceOptions = [
    { label: "Terno novo", price: 290 },
    { label: "Terno semi novo", price: 249.9 },
    { label: "Smoking", price: 350 },
    { label: "Vestido acompanhante novo", price: 290 },
    { label: "Vestido acompanhante semi novo", price: 249.9 },
    { label: "Vestido de noiva", price: 350 },
  ];

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    size: 42,
    color: "",
    location: "Estoque Central",
    stock: 1,
    status: "Disponível" as InventoryItem["status"],
    priceCategory: priceOptions[0].label,
    price: priceOptions[0].price,
  });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [returnOrders, setReturnOrders] = useState<ReturnOrder[]>([]);
  const [reservationItem, setReservationItem] = useState<InventoryItem | null>(null);
  const [reservationPlan, setReservationPlan] = useState<"Diário" | "Semanal">("Diário");
  const [reservationForm, setReservationForm] = useState({ clientName: "", clientPhone: "", clientEmail: "" });
  const [viewedItem, setViewedItem] = useState<InventoryItem | null>(null);

  const savePayments = (records: PaymentRecord[]) => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify(records);
    window.localStorage.setItem("suits-payments", payload);
    window.localStorage.setItem("suit-payments", payload);
    window.dispatchEvent(new Event("payments-storage"));
  };

  const loadPayments = (): PaymentRecord[] => {
    if (typeof window === "undefined") return [];
    try {
      const keys = ["suits-payments", "suit-payments"];
      const combined = keys
        .map((key) => window.localStorage.getItem(key))
        .filter(Boolean)
        .map((raw) => JSON.parse(raw as string) as PaymentRecord[])
        .flat();

      const unique = combined.filter((record, index, array) => array.findIndex((item) => item.id === record.id) === index);
      return unique;
    } catch {
      return [];
    }
  };
  const [syncMessage, setSyncMessage] = useState("");

  const mergedItems = [...pendingItems, ...items];

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      try {
        const params = search ? `?search=${encodeURIComponent(search)}` : "";
        const response = await fetch(`/api/inventory${params}`);
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      }
      setLoading(false);
    }

    loadItems();
  }, [search]);

  useEffect(() => {
    setPendingItems(loadPendingInventory());
    setPayments(loadPayments());
    setReturnOrders(loadReturnOrders());
  }, []);

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
      setSyncMessage("");
    }
    function goOffline() {
      setIsOnline(false);
      setSyncMessage("Você está offline. Novos trajes serão salvos localmente e sincronizados quando a conexão voltar.");
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    async function syncPending() {
      if (!isOnline || pendingItems.length === 0) return;
      const remaining: InventoryItem[] = [];

      for (const item of pendingItems) {
        try {
          const response = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (!response.ok) {
            remaining.push(item);
            continue;
          }
          const created = await response.json();
          setItems((prev) => [created, ...prev]);
        } catch {
          remaining.push(item);
        }
      }

      setPendingItems(remaining);
      savePendingInventory(remaining);
      if (remaining.length === 0) {
        setSyncMessage("Todos os trajes offline foram sincronizados.");
      } else {
        setSyncMessage(`Ainda há ${remaining.length} traje(s) pendente(s) de sincronização.`);
      }
    }

    syncPending();
  }, [isOnline, pendingItems]);

  async function handleAddItem(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.title || !formData.subtitle || !formData.color) {
      setSyncMessage("Preencha título, subtítulo e cor antes de adicionar.");
      return;
    }

    const newItem: InventoryItem = {
      id: `INV-${Date.now()}`,
      title: formData.title,
      subtitle: formData.subtitle,
      sku: `SKU-${Date.now()}`,
      status: formData.status,
      size: formData.size,
      color: formData.color,
      location: formData.location,
      stock: formData.stock,
      image: "/terno1.jpg",
      action: "Reservar Traje",
      priceCategory: formData.priceCategory,
      price: formData.price,
    };

    if (!isOnline) {
      const nextPending = [newItem, ...pendingItems];
      setPendingItems(nextPending);
      savePendingInventory(nextPending);
      setSyncMessage("Sem conexão. Traje salvo localmente e será enviado quando online.");
    } else {
      try {
        const response = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        if (!response.ok) throw new Error("Falha no envio");
        const created = await response.json();
        setItems((prev) => [created, ...prev]);
        setSyncMessage("Traje enviado com sucesso.");
      } catch {
        const nextPending = [newItem, ...pendingItems];
        setPendingItems(nextPending);
        savePendingInventory(nextPending);
        setSyncMessage("Falha ao enviar. Traje salvo localmente e será sincronizado mais tarde.");
      }
    }

    setFormData({
      title: "",
      subtitle: "",
      size: 42,
      color: "",
      location: "Estoque Central",
      stock: 1,
      status: "Disponível",
      priceCategory: priceOptions[0].label,
      price: priceOptions[0].price,
    });
  }

  async function handleItemAction(item: InventoryItem, plan: "Diário" | "Semanal") {
    if (item.action.includes("Reservar")) {
      setReservationItem(item);
      setReservationPlan(plan);
      setReservationForm({ clientName: "", clientPhone: "", clientEmail: "" });
      setSyncMessage("Preencha os dados do cliente para confirmar a reserva.");
      return;
    }

    if (item.action.includes("Ver")) {
      const payment = payments.find((record) => record.itemId === item.id);
      setViewedItem(item);
      setSyncMessage(payment ? `Pedido ${item.id} carregado com os dados do cliente.` : `Pedido ${item.id} visualizado.`);
      return;
    }

    const isPending = pendingItems.some((pending) => pending.id === item.id);
    const nextItem = { ...item };

    if (item.action.includes("Editar")) {
      nextItem.status = "Disponível";
      nextItem.location = "Estoque Central";
      nextItem.action = "Reservar Traje";
    }

    if (isPending) {
      const nextPending = pendingItems.map((pending) => (pending.id === item.id ? nextItem : pending));
      setPendingItems(nextPending);
      savePendingInventory(nextPending);
      setSyncMessage("Alteração salva localmente e será sincronizada em breve.");
      return;
    }

    try {
      const response = await fetch(`/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextItem),
      });
      if (!response.ok) throw new Error("Falha ao atualizar item");
      const updated = await response.json();
      setItems((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
      setSyncMessage("Status atualizado com sucesso.");
    } catch {
      setSyncMessage("Erro ao atualizar. Tente novamente mais tarde.");
    }
  }

  async function confirmReservation() {
    if (!reservationItem) return;

    if (!reservationForm.clientName.trim()) {
      setSyncMessage("Informe o nome do cliente antes de confirmar a reserva.");
      return;
    }

    const item = reservationItem;
    const plan = reservationPlan;
    const isPending = pendingItems.some((pending) => pending.id === item.id);
    const nextItem = {
      ...item,
      status: "Alugado" as InventoryItem["status"],
      location: "Retirado",
      stock: Math.max(0, item.stock - 1),
      action: "Ver Pedido",
    };

    const basePrice = item.price ?? 0;
    const estimate = plan === "Diário" ? basePrice : Math.round(basePrice * 7 * 0.7 * 100) / 100;
    const newPayment: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      itemId: item.id,
      itemTitle: item.title,
      plan,
      amount: estimate,
      status: "Pendente",
      clientName: reservationForm.clientName.trim(),
      clientPhone: reservationForm.clientPhone.trim(),
      clientEmail: reservationForm.clientEmail.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);
    savePayments(nextPayments);

    const newReturnOrder: ReturnOrder = {
      order: `#ORD-${Date.now()}`,
      client: reservationForm.clientName.trim(),
      itemId: item.id,
      item: item.title,
      dueDate: plan === "Diário" ? "Hoje" : "Em 7 dias",
      status: "Aguardando",
      penalty: "-",
      action: "Confirmar",
      amountPaid: estimate,
      damageFee: 0,
      laundryStatus: "Pendente",
    };

    const nextReturns = [newReturnOrder, ...returnOrders];
    setReturnOrders(nextReturns);
    saveReturnOrders(nextReturns);

    if (isPending) {
      const nextPending = pendingItems.map((pending) => (pending.id === item.id ? nextItem : pending));
      setPendingItems(nextPending);
      savePendingInventory(nextPending);
      setSyncMessage(`Reserva confirmada para ${reservationForm.clientName.trim()} e salva localmente.`);
      setReservationItem(null);
      return;
    }

    try {
      const response = await fetch(`/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextItem),
      });
      if (!response.ok) throw new Error("Falha ao atualizar item");
      const updated = await response.json();
      setItems((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
      setSyncMessage(`Reserva confirmada para ${reservationForm.clientName.trim()}.`);
    } catch {
      setSyncMessage("Reserva salva, mas a atualização do inventário falhou. Verifique mais tarde.");
    }

    setReservationItem(null);
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen overflow-hidden bg-[#F3F5F8] font-sans">
        <Sidebar active="Inventário" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <nav className="text-sm text-slate-200/80 mb-3">Menu &gt; Inventário</nav>
              <h1 className="text-4xl sm:text-5xl font-serif font-semibold flex items-center gap-3">
                <FiBriefcase className="text-[var(--suit-gold)] text-3xl" />
                Inventário
              </h1>
              <p className="text-base text-slate-200/80 mt-2 max-w-2xl">Gerencie e rastreie localizações de seus trajes com visual limpo e foco em dados rápidos.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/15">Exportar</button>
              <button onClick={() => setShowForm((prev) => !prev)} className="inline-flex items-center justify-center rounded-2xl bg-[#17182b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 ring-1 ring-white/10 transition hover:bg-slate-900">
                Adicionar Traje
              </button>
              <div className="inline-flex items-center rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-slate-900/10">
                <FiBell className="text-[var(--suit-gold)] text-xl" />
              </div>
            </div>
          </div>
        </header>

        {syncMessage ? (
          <div className="mb-6 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-4 text-sm text-orange-800 shadow-sm">{syncMessage}</div>
        ) : null}

        {showForm ? (
          <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#17182b] mb-4">Novo traje</h2>
            <form onSubmit={handleAddItem} className="grid gap-4 lg:grid-cols-2">
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Subtítulo"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <input
                type="number"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: Number(e.target.value) })}
                placeholder="Tamanho"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Cor"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Localização"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                placeholder="Estoque"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InventoryItem["status"] })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              >
                <option>Disponível</option>
                <option>Costureira</option>
                <option>Alugado</option>
                <option>Lavanderia</option>
              </select>
              <select
                value={formData.priceCategory}
                onChange={(e) => {
                  const selected = priceOptions.find((option) => option.label === e.target.value);
                  setFormData({
                    ...formData,
                    priceCategory: e.target.value,
                    price: selected?.price ?? formData.price,
                  });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              >
                {priceOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label} - R$ {option.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <div className="text-sm text-slate-500 mt-2">Preço associado: R$ {formData.price.toFixed(2)}</div>
              <div className="lg:col-span-2 flex items-center gap-3">
                <button type="submit" className="rounded-2xl bg-[#17182b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">Salvar traje</button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-200 mb-8">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-6">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID ou nome"
                className="w-full border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
              />
            </div>
            <div className="col-span-6 sm:col-span-3 xl:col-span-2">
              <select className="w-full border border-slate-200 bg-slate-50 text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20">
                <option>Todos os tipos</option>
              </select>
            </div>
            <div className="col-span-6 sm:col-span-3 xl:col-span-2">
              <select className="w-full border border-slate-200 bg-slate-50 text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20">
                <option>Tamanho</option>
              </select>
            </div>
            <div className="col-span-12 xl:col-span-2">
              <input placeholder="Filtros Avançados" className="w-full border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20" />
            </div>
          </div>
        </div>

        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {Array(4)
                .fill(null)
                .map((_, idx) => (
                  <div key={idx} className="h-[36rem] rounded-[28px] bg-slate-100" />
                ))}
            </div>
          ) : mergedItems.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-8 py-12 text-center text-slate-500 shadow-sm">
              <p className="text-xl font-semibold">Nenhum traje encontrado.</p>
              <p className="mt-2 text-sm">Adicione um traje para começar a preencher seu inventário.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {mergedItems.map((item) => (
                <Card key={item.id} item={item} onAction={handleItemAction} />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-500">Mostrando {mergedItems.length} itens</p>
            <div className="flex items-center gap-2">
              <button className="p-2">◀</button>
              <div className="flex gap-1">
                <button className="w-8 h-8 bg-white rounded border">1</button>
                <button className="w-8 h-8 rounded border">2</button>
                <button className="w-8 h-8 rounded border">3</button>
              </div>
              <button className="p-2">▶</button>
            </div>
          </div>
        </section>
        </main>
      </div>

      {reservationItem ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Nova reserva</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#17182b]">{reservationItem.title}</h3>
              </div>
              <button onClick={() => setReservationItem(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Nome do cliente
                <input
                  value={reservationForm.clientName}
                  onChange={(e) => setReservationForm({ ...reservationForm, clientName: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
                  placeholder="Ex.: João da Silva"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                WhatsApp / telefone
                <input
                  value={reservationForm.clientPhone}
                  onChange={(e) => setReservationForm({ ...reservationForm, clientPhone: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600 sm:col-span-2">
                E-mail
                <input
                  value={reservationForm.clientEmail}
                  onChange={(e) => setReservationForm({ ...reservationForm, clientEmail: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
                  placeholder="cliente@email.com"
                />
              </label>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-[#17182b]">Plano selecionado</p>
              <p className="mt-2">{reservationPlan} • Valor estimado: R$ {((reservationItem.price ?? 0) * (reservationPlan === "Semanal" ? 7 * 0.7 : 1)).toFixed(2)}</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setReservationItem(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmReservation} className="rounded-2xl bg-[#17182b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">Confirmar reserva</button>
            </div>
          </div>
        </div>
      ) : null}

      {viewedItem ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pedido do cliente</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#17182b]">{viewedItem.title}</h3>
              </div>
              <button onClick={() => setViewedItem(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#17182b] text-white">
                  <FiUser className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#17182b]">Dados do cliente</p>
                  <p className="text-sm text-slate-500">{payments.find((record) => record.itemId === viewedItem.id)?.clientName || "Cliente ainda não informado"}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-3 text-sm text-slate-600">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Telefone</p>
                  <p className="mt-2 font-medium text-[#17182b]">{payments.find((record) => record.itemId === viewedItem.id)?.clientPhone || "-"}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-sm text-slate-600">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">E-mail</p>
                  <p className="mt-2 font-medium text-[#17182b]">{payments.find((record) => record.itemId === viewedItem.id)?.clientEmail || "-"}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valor de entrada</p>
                <p className="mt-2 text-2xl font-semibold text-[#17182b]">R$ {((payments.find((record) => record.itemId === viewedItem.id)?.amount ?? 0)).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewedItem(null)} className="rounded-2xl bg-[#17182b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthGuard>
  );
}
