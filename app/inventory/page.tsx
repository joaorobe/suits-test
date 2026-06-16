"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { FiBell, FiUser, FiBriefcase } from "react-icons/fi";
import Sidebar from "../components/Sidebar";
import type { InventoryItem } from "../../lib/types";

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

function StatusBadge({ status }: { status: InventoryItem["status"] }) {
  const map: Record<InventoryItem["status"], string> = {
    Disponível: "text-green-500",
    Costureira: "text-[var(--suit-gold)]",
    Alugado: "text-red-500",
    Lavanderia: "text-orange-400",
  };
  return <div className={`text-sm font-medium ${map[status] || "text-gray-300"}`}>{status}</div>;
}

function Card({ item, onAction }: { item: InventoryItem; onAction: (item: InventoryItem) => void }) {
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
        <button onClick={() => onAction(item)} className="w-full rounded-2xl border border-[#17182b] bg-[#17182b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">{item.action}</button>
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
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    size: 42,
    color: "",
    location: "Estoque Central",
    stock: 1,
    status: "Disponível" as InventoryItem["status"],
  });
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
    });
  }

  async function handleItemAction(item: InventoryItem) {
    const isPending = pendingItems.some((pending) => pending.id === item.id);
    const nextItem = { ...item };

    if (item.action.includes("Reservar")) {
      nextItem.status = "Alugado";
      nextItem.location = "Retirado";
      nextItem.stock = Math.max(0, item.stock - 1);
      nextItem.action = "Ver Pedido";
    } else if (item.action.includes("Editar")) {
      nextItem.status = "Disponível";
      nextItem.location = "Estoque Central";
      nextItem.action = "Reservar Traje";
    } else if (item.action.includes("Ver")) {
      setSyncMessage(`Pedido ${item.id} visualizado.`);
      return;
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

  return (
    <div className="min-h-screen flex bg-[#F3F5F8] font-sans">
      <Sidebar active="Inventário" />

      <main className="flex-1 p-10">
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
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-slate-900/10">
                <FiBell className="text-[var(--suit-gold)] text-xl" />
                <div className="flex items-center gap-2">
                  <FiUser className="text-[var(--suit-gold)] text-xl" />
                  <span>Ali Khamenei</span>
                </div>
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
  );
}
