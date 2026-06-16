"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBriefcase, FiScissors, FiBarChart, FiRotateCcw, FiSettings, FiMenu, FiX } from "react-icons/fi";

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const items: { label: string; href: string; icon: React.ReactNode }[] = [
    { label: "Dashboard", href: "/dashboard", icon: <FiBarChart className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Inventário", href: "/inventory", icon: <FiBriefcase className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Costureira", href: "/costureira", icon: <FiScissors className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Devolução", href: "/devolucao", icon: <FiRotateCcw className="text-[var(--suit-gold)] text-2xl" /> },
  ];

  const resolvedActive = active || items.find((it) => pathname.startsWith(it.href))?.label || "Inventário";

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#17182b]/90 text-white shadow-lg backdrop-blur-md md:hidden">
        <FiMenu className="text-2xl" />
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`fixed inset-y-0 left-0 z-50 w-full max-w-[18rem] transform overflow-y-auto bg-[var(--suit-muted)] border-r border-gray-200 shadow-sm text-gray-700 transition-transform duration-300 md:static md:translate-x-0 md:flex md:w-72 md:flex-shrink-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="relative flex min-h-screen flex-col">
          <div className="p-6 mb-4 flex h-24 items-center justify-center bg-[#17182b] w-full">
            <Link href="/" className="flex items-center justify-center w-full">
              <img src="/logo.png" alt="Suits" className="h-auto w-auto object-contain" />
            </Link>
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:hidden">
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="px-4">
            <p className="text-sm font-semibold text-gray-700 uppercase mb-4">Menu</p>
            <ul className="space-y-3">
              {items.map((it) => {
                const isActive = resolvedActive === it.label;
                return (
                  <li key={it.label}>
                    <Link href={it.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-[#17182b] text-white shadow-sm' : 'text-base text-gray-700 hover:bg-white/60'}`}>
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
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><FiSettings className="text-[var(--suit-gold)]" /> Configurações</Link>
          </div>

          <div className="mt-auto p-4 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Notificações</span>
              <span className="text-sm text-gray-400">◯</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
