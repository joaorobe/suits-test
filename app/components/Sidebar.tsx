"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBriefcase, FiScissors, FiBarChart, FiRotateCcw, FiSettings, FiMenu, FiX, FiUser, FiCreditCard } from "react-icons/fi";

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const readStoredUser = () => {
      const cookieValue = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("suits-auth-user="));

      if (cookieValue) {
        try {
          const encoded = cookieValue.slice("suits-auth-user=".length);
          const parsed = JSON.parse(decodeURIComponent(encoded)) as Record<string, unknown>;
          const directName = typeof parsed.name === "string" ? parsed.name : undefined;
          const nestedName = typeof parsed.user === "object" && parsed.user && typeof (parsed.user as Record<string, unknown>).name === "string"
            ? (parsed.user as Record<string, unknown>).name
            : undefined;
          const fallbackName = typeof parsed.fullName === "string" ? parsed.fullName : undefined;
          const name = directName || nestedName || fallbackName;

          if (typeof name === "string" && name.trim()) {
            setUserName(name);
            return;
          }
        } catch {
          // fallback to localStorage below
        }
      }

      const candidates = ["suits-auth-user", "suits-user", "suits-user-info"];
      for (const key of candidates) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const directName = typeof parsed.name === "string" ? parsed.name : undefined;
          const nestedName = typeof parsed.user === "object" && parsed.user && typeof (parsed.user as Record<string, unknown>).name === "string"
            ? (parsed.user as Record<string, unknown>).name
            : undefined;
          const fallbackName = typeof parsed.fullName === "string" ? parsed.fullName : undefined;
          const name = directName || nestedName || fallbackName;

          if (typeof name === "string" && name.trim()) {
            setUserName(name);
            return;
          }
        } catch {
          if (raw.trim()) {
            setUserName(raw);
            return;
          }
        }
      }

      setUserName("Usuário");
    };

    readStoredUser();
    window.addEventListener("storage", readStoredUser);
    return () => window.removeEventListener("storage", readStoredUser);
  }, []);

  const items: { label: string; href: string; icon: React.ReactNode }[] = [
    { label: "Dashboard", href: "/dashboard", icon: <FiBarChart className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Inventário", href: "/inventory", icon: <FiBriefcase className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Costureira", href: "/costureira", icon: <FiScissors className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Devolução", href: "/devolucao", icon: <FiRotateCcw className="text-[var(--suit-gold)] text-2xl" /> },
    { label: "Pagamentos", href: "/pagamentos", icon: <FiCreditCard className="text-[var(--suit-gold)] text-2xl" /> },
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

      <aside className={`fixed inset-y-0 left-0 z-50 w-full max-w-[18rem] transform overflow-y-auto bg-[var(--suit-muted)] border-r border-gray-200 shadow-sm text-gray-700 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:w-72 md:max-w-none md:translate-x-0 md:flex md:flex-shrink-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
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

          <div className="mt-auto border-t border-gray-200 bg-white/70 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#17182b] px-3 py-3 text-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--suit-gold)] text-base font-semibold text-[#17182b]">
                {userName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("") || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userName}</p>
                <p className="text-xs text-slate-300">Administrador</p>
              </div>
              <FiUser className="ml-auto text-lg text-[var(--suit-gold)]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
