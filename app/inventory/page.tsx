"use client";

import React from "react";
import Image from "next/image";
import { FiBell, FiUser, FiBriefcase } from "react-icons/fi";
import Sidebar from "../components/Sidebar";

const sample = [
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Disponível", size: 42, color: "Black", action: "Reservar Traje" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Disponível", size: 42, color: "Black", action: "Reservar Traje" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Costureira", size: 42, color: "Black", action: "Editar Status" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Costureira", size: 42, color: "Black", action: "Editar Status" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Alugado", size: 42, color: "Black", action: "Ver Pedido" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Alugado", size: 42, color: "Black", action: "Ver Pedido" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Lavanderia", size: 42, color: "Black", action: "Ver Pedido" },
  { title: "Midnight Black", subtitle: "Paletó e calça", id: "743G", status: "Lavanderia", size: 42, color: "Black", action: "Ver Pedido" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Disponível: "text-green-500",
    Costureira: "text-[var(--suit-gold)]",
    Alugado: "text-red-500",
    Lavanderia: "text-orange-400",
  };
  return <div className={`text-sm font-medium ${map[status] || "text-gray-300"}`}>{status}</div>;
}

function Card({ item }: { item: (typeof sample)[number] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <div className="relative h-64 w-full bg-slate-100">
        <Image src="/terno1.jpg" alt={item.title} fill className="object-cover" />
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
            <div className="mt-2 text-lg font-semibold">1</div>
          </div>
        </div>
      </div>
      <div className="bg-white p-6">
        <button className="w-full rounded-2xl border border-[#17182b] bg-[#17182b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">{item.action}</button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
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
              <button className="inline-flex items-center justify-center rounded-2xl bg-[#17182b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 ring-1 ring-white/10 transition hover:bg-slate-900">Adicionar Traje</button>
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

        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-200 mb-8">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-6">
              <input placeholder="Buscar por ID ou nome" className="w-full border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {sample.map((s, idx) => (
              <Card key={idx} item={s} />
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-500">Mostrando 1 a 8 de 768</p>
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
