"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBriefcase, FiScissors, FiBarChart, FiRotateCcw, FiSettings } from "react-icons/fi";

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname() || "/";

  const items: { label: string; href: string; icon: React.ReactNode }[] = [
    { label: "Dashboard", href: "/dashboard", icon: <FiBarChart className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Inventário", href: "/inventory", icon: <FiBriefcase className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Costureira", href: "/costureira", icon: <FiScissors className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Devolução", href: "/devolucao", icon: <FiRotateCcw className="text-[var(--suit-gold)] text-2xl" /> },
  ];

  const resolvedActive = active || items.find((it) => pathname.startsWith(it.href))?.label || "Inventário";

  return (
    <aside className="w-72 bg-[var(--suit-muted)] border-r border-gray-200 shadow-sm text-gray-700">
      <div className="p-6 mb-4 flex items-center justify-center bg-[#17182b]">
        <Link href="/" className="flex items-center justify-center w-full">
          <img src="/logo.png" alt="Suits" className="h-16 w-auto object-contain" />
        </Link>
      </div>

      <div className="px-4">
        <p className="text-sm font-semibold text-gray-700 uppercase mb-4">Menu</p>
        <ul className="space-y-3">
          {items.map((it) => {
            const isActive = resolvedActive === it.label;
            return (
              <li key={it.label}>
                <Link href={it.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-[#17182b] text-white shadow-sm' : 'text-base text-gray-700 hover:bg-white/60'}`}>
                  {it.icon}
                  <span className="text-base font-medium">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 px-4 text-sm text-gray-600">
        <p className="mb-2 font-semibold text-gray-700">Geral</p>
        <Link href="/settings" className="flex items-center gap-2 text-gray-700"><FiSettings className="text-[var(--suit-gold)]" /> Settings</Link>
      </div>

      <div className="mt-auto p-4 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Notificações</span>
          <span className="text-sm text-gray-400">◯</span>
        </div>
      </div>
    </aside>
  );
}
