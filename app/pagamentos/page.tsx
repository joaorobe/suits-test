"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import AuthGuard from "../components/AuthGuard";
import { FiCreditCard, FiCheckCircle, FiClock, FiDownload, FiSearch } from "react-icons/fi";
import type { PaymentRecord } from "../../lib/types";

const storageKeys = ["suits-payments", "suit-payments"];

function savePayments(records: PaymentRecord[]) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(records);
  storageKeys.forEach((key) => window.localStorage.setItem(key, payload));
  window.dispatchEvent(new Event("payments-storage"));
}

function loadPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const combined = storageKeys
      .map((key) => window.localStorage.getItem(key))
      .filter(Boolean)
      .map((raw) => JSON.parse(raw as string) as PaymentRecord[])
      .flat();

    return combined.filter((record, index, array) => array.findIndex((item) => item.id === record.id) === index);
  } catch {
    return [];
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  useEffect(() => {
    const syncPayments = () => setPayments(loadPayments());
    syncPayments();
    window.addEventListener("payments-storage", syncPayments);
    return () => window.removeEventListener("payments-storage", syncPayments);
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) =>
      [payment.id, payment.itemTitle, payment.plan, payment.status]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [payments, search]);

  const totalDue = useMemo(
    () => payments.filter((payment) => payment.status === "Pendente").reduce((sum, record) => sum + record.amount, 0),
    [payments]
  );

  const totalCollected = useMemo(
    () => payments.filter((payment) => payment.status === "Pago").reduce((sum, record) => sum + record.amount, 0),
    [payments]
  );

  const activePayment = payments.find((payment) => payment.id === activePaymentId);

  function handleMarkPaid(paymentId: string) {
    const nextPayments = payments.map((record) =>
      record.id === paymentId ? { ...record, status: "Pago" as const } : record
    );
    setPayments(nextPayments);
    savePayments(nextPayments);
  }

  function renderPaymentStatus(record: PaymentRecord) {
    if (record.status === "Pago") {
      return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Pago</span>;
    }
    return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Pendente</span>;
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen overflow-hidden bg-[#F3F5F8] font-sans">
        <Sidebar active="Pagamentos" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <header className="mb-8 rounded-[32px] bg-[#17182b] p-8 shadow-[0_30px_90px_rgba(23,24,43,0.14)] text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <nav className="text-sm text-slate-200/80 mb-3">Menu &gt; Pagamentos</nav>
                <h1 className="text-4xl sm:text-5xl font-serif font-semibold flex items-center gap-3">
                  <FiCreditCard className="text-[var(--suit-gold)] text-3xl" />
                  Pagamentos
                </h1>
                <p className="text-base text-slate-200/80 mt-2 max-w-2xl">
                  Gerencie cobranças, visualize pedidos e gere comprovantes rápidos para trajes alugados.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-max">
                <button className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/15">
                  <FiDownload className="mr-2 text-lg" /> Exportar relatorio
                </button>
                <button className="inline-flex items-center justify-center rounded-2xl bg-[#17182b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 ring-1 ring-white/10 transition hover:bg-slate-900">
                  Novo pagamento
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section>
              <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Resumo</p>
                    <h2 className="text-3xl font-semibold text-slate-900">Fluxo de pagamentos</h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">A receber</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">R$ {totalDue.toFixed(2)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recebido</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">R$ {totalCollected.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-white shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Pedidos de pagamento</h3>
                    <p className="text-sm text-slate-500">Veja todos os pedidos criados a partir das reservas de trajes.</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar pagamento"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-700 outline-none focus:border-[#17182b] focus:ring-2 focus:ring-[#17182b]/20"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {filteredPayments.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                      Nenhum pagamento encontrado. Faça uma reserva no inventário para criar pedidos.
                    </div>
                  ) : (
                    filteredPayments.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setActivePaymentId(record.id)}
                        className="w-full text-left px-6 py-5 transition hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{record.itemTitle}</p>
                            <p className="text-sm text-slate-500">Pedido {record.id} • Plano {record.plan}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {renderPaymentStatus(record)}
                            <span className="text-lg font-semibold text-slate-900">R$ {record.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[28px] bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Detalhes rápidos</h3>
                {activePayment ? (
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pagamento</p>
                      <p className="mt-2 text-sm text-slate-900">{activePayment.id}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Item</p>
                      <p className="font-semibold text-slate-900">{activePayment.itemTitle}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Valor</p>
                      <p className="text-2xl font-semibold text-slate-900">R$ {activePayment.amount.toFixed(2)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Status</p>
                      {renderPaymentStatus(activePayment)}
                    </div>
                    <div className="rounded-3xl bg-slate-100 p-4">
                      <p className="text-sm text-slate-500">Cliente</p>
                      <p className="mt-2 font-semibold text-slate-900">{activePayment.clientName || "Não informado"}</p>
                      <p className="mt-1 text-sm text-slate-600">{activePayment.clientPhone || "-"}</p>
                      <p className="mt-1 text-sm text-slate-600">{activePayment.clientEmail || "-"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-100 p-4">
                      <p className="text-sm text-slate-500">QR de pagamento</p>
                      <div className="mt-3 flex h-40 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                        <span className="text-sm">QR placeholder</span>
                      </div>
                    </div>
                    {activePayment.status === "Pendente" ? (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(activePayment.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17182b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                      >
                        <FiCheckCircle className="text-lg" /> Marcar como pago
                      </button>
                    ) : (
                      <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Recebimento confirmado</div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                    Selecione um pedido para ver detalhes, gerar QR e marcar pagamento.
                  </div>
                )}
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Instruções</h3>
                <p className="text-sm text-slate-500">Os pedidos de pagamento são gerados automaticamente na reserva de trajes no inventário. Use esta área para acompanhar cobranças e marcar pagamentos recebidos.</p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
