"use client";

import React from "react";
import Image from "next/image";
import { FiBell, FiUser, FiBriefcase, FiScissors, FiBarChart, FiRotateCcw, FiSettings } from "react-icons/fi";
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

function Card({ item }: { item: (typeof sample)[0] }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md bg-white border border-gray-100">
      <div className="relative h-64 w-full bg-gray-100">
        <Image src="/terno1.jpg" alt={item.title} fill className="object-cover" />
      </div>
      <div className="bg-[var(--suit-navy)] text-white p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-serif text-xl">{item.title}</h3>
            <p className="text-sm text-gray-200">{item.subtitle}</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs text-gray-300">ID - {item.id}</div>
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="flex justify-between text-sm mt-4 text-gray-200">
          <div>
            <div className="text-xs">Tamanho</div>
            <div className="font-medium">{item.size}</div>
          </div>
          <div>
            <div className="text-xs">Cor</div>
            <div className="font-medium">{item.color}</div>
          </div>
          <div>
            <div className="text-xs">Estoque</div>
            <div className="font-medium">1</div>
          </div>
        </div>

        <div className="mt-4 text-base text-[var(--suit-gold)] font-semibold">{item.action}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <div className="min-h-screen flex bg-[var(--background)] font-sans">
      <Sidebar active="Inventário" />

      <main className="flex-1 p-10">
        <header className="flex items-center justify-between mb-6 bg-[var(--suit-navy)] p-6 text-white">
          <div>
            <nav className="text-sm text-white/75 mb-2">Menu &gt; Inventory</nav>
            <h1 className="text-5xl font-serif flex items-center gap-3">
              <FiBriefcase className="text-[var(--suit-gold)] text-3xl" />
              <span className="font-semibold">Inventário</span>
            </h1>
            <p className="text-lg text-white/80 mt-1">Gerencie e rastreie localizações de seus trajes</p>
          </div>

          <div className="flex gap-3 items-center">
            <button className="px-4 py-2 bg-white border rounded-md text-[var(--suit-navy)] shadow-sm">Exportar</button>
            <button className="px-4 py-2 bg-[var(--suit-gold)] text-[var(--suit-navy)] rounded-md text-base shadow-sm">Adicionar Traje</button>
            <div className="flex items-center gap-3 ml-4 text-white/90">
              <FiBell className="text-[var(--suit-gold)] text-xl" />
              <div className="flex items-center gap-2">
                <FiUser className="text-[var(--suit-gold)] text-xl" />
                <span className="text-base">Ali Khamenei</span>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-[var(--suit-surface)] p-4 rounded-md mb-8 shadow-sm">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <input placeholder="Buscar por ID ou nome" className="w-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--suit-navy)]" />
            </div>
            <div className="col-span-2">
              <select className="w-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--suit-navy)]">
                <option>Todos os tipos</option>
              </select>
            </div>
            <div className="col-span-1">
              <select className="w-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--suit-navy)]">
                <option>Tamanho</option>
              </select>
            </div>
            <div className="col-span-1">
              <select className="w-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--suit-navy)]">
                <option>Cor</option>
              </select>
            </div>
            <div className="col-span-2">
              <input placeholder="Filtros Avançados" className="w-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--suit-navy)]" />
            </div>
          </div>
        </div>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {sample.map((s, idx) => (
              <Card key={idx} item={s as any} />
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
