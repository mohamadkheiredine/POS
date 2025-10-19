"use client";

import React, { useMemo, useState } from "react";

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */
const money = (n: number, c = 2) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: c, maximumFractionDigits: c });

type TenderKey = "cash" | "card" | "wallet" | "voucher";

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function CloseShiftDesignPage() {
  // Mock context
  const [location] = useState("Hamra");
  const [register] = useState("Front-1");
  const [cashier]  = useState("A. Haddad");

  // Currency & denominations
  const [currency, setCurrency] = useState("USD");
  const DENOMS: Record<string, number[]> = {
    USD: [100, 50, 20, 10, 5, 1, 0.25, 0.1, 0.05, 0.01],
    EUR: [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05],
    LBP: [1000000, 500000, 100000, 50000, 20000, 10000, 5000, 1000],
  };
  const [counts, setCounts] = useState<Record<number, number>>({});

  // Expected from sales engine (placeholder)
  const [expected] = useState<Record<TenderKey, number>>({
    cash: 450,
    card: 1280,
    wallet: 220,
    voucher: 60,
  });

  // Counted (card/wallet/voucher input; cash derived)
  const [nonCash, setNonCash] = useState<Record<Exclude<TenderKey, "cash">, number>>({
    card: 0, wallet: 0, voucher: 0,
  });

  // Extras
  const [tips, setTips]       = useState(85);
  const [payouts, setPayouts] = useState(20);
  const [cashDrop, setCashDrop] = useState(0);
  const [notes, setNotes] = useState("");
  const [discrepancy, setDiscrepancy] = useState("");

  // Derived
  const countedCash = useMemo(
    () => (DENOMS[currency] || []).reduce((s, d) => s + d * (counts[d] || 0), 0),
    [counts, currency]
  );
  const totalExpected = expected.cash + expected.card + expected.wallet + expected.voucher;
  const totalCounted  = countedCash + nonCash.card + nonCash.wallet + nonCash.voucher;
  const deltaCash     = countedCash - expected.cash;
  const deltaTotal    = totalCounted - totalExpected;
  const remainingInDrawer = Math.max(0, countedCash - tips - payouts - cashDrop);

  // UI-only handlers (design focus)
  const bump = (d: number, k: 1 | -1) =>
    setCounts((p) => ({ ...p, [d]: Math.max(0, (p[d] || 0) + k) }));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-3">
        {/* Left / Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_20px_60px_rgba(17,24,39,0.12)]">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Close Shift</h1>
                  <p className="text-sm text-gray-600">Count drawer, reconcile tenders, drop cash, finalize.</p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
                  {location} · {register} · {cashier}
                </div>
              </div>
            </div>

            {/* Progress steps (visual only) */}
            <div className="px-6 pb-4 pt-3">
              <ol className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <Step done>Cash Count</Step>
                <Step done>Reconcile</Step>
                <Step>Drop</Step>
                <Step>Notes</Step>
                <Step>Print Z</Step>
                <Step>Close</Step>
              </ol>
            </div>
          </div>

          {/* Cash Count */}
          <section className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cash Count</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => { setCounts({}); setCurrency(e.target.value); }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {Object.keys(DENOMS).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(DENOMS[currency] || []).map((d) => {
                const q = counts[d] || 0;
                const line = d * q;
                return (
                  <div key={d} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">
                        {currency} {money(d, d < 1 ? 2 : 0)}
                      </span>
                      <span className="text-xs text-gray-500">× Qty</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bump(d, -1)}
                        className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      >−</button>
                      <input
                        inputMode="numeric"
                        value={q}
                        onChange={(e) =>
                          setCounts((p) => ({ ...p, [d]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                      <button
                        type="button"
                        onClick={() => bump(d, +1)}
                        className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      >+</button>
                    </div>
                    <div className="mt-2 text-right text-sm font-semibold text-gray-900">
                      {currency} {money(line)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Pill label="Counted Cash" value={`${currency} ${money(countedCash)}`} accent />
              <InlineNumber
                label="Tips (paid out)"
                value={tips}
                onChange={(v) => setTips(Math.max(0, v))}
                currency={currency}
              />
              <InlineNumber
                label="Petty payouts"
                value={payouts}
                onChange={(v) => setPayouts(Math.max(0, v))}
                currency={currency}
              />
            </div>
          </section>

          {/* Reconcile */}
          <section className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Reconcile Tenders</h2>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                Compare expected vs counted
              </span>
            </div>

            <TenderRow label="Cash"   expected={expected.cash}   counted={countedCash} readOnly currency={currency} />
            <TenderRow label="Card"   expected={expected.card}   counted={nonCash.card}
              onChange={(v) => setNonCash((p) => ({ ...p, card: Math.max(0, v) }))} currency={currency} />
            <TenderRow label="Wallet" expected={expected.wallet} counted={nonCash.wallet}
              onChange={(v) => setNonCash((p) => ({ ...p, wallet: Math.max(0, v) }))} currency={currency} />
            <TenderRow label="Voucher" expected={expected.voucher} counted={nonCash.voucher}
              onChange={(v) => setNonCash((p) => ({ ...p, voucher: Math.max(0, v) }))} currency={currency} />

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <SummaryMini label="Total Expected" value={`${currency} ${money(totalExpected)}`} />
              <SummaryMini label="Total Counted"  value={`${currency} ${money(totalCounted)}`} />
              <SummaryMini
                label="Difference"
                value={`${currency} ${money(deltaTotal)}`}
                tone={deltaTotal === 0 ? "ok" : "warn"}
              />
            </div>
          </section>

          {/* Cash Drop + Notes */}
          <section className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cash Drop & Notes</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InlineNumber
                label="Cash drop to safe"
                value={cashDrop}
                onChange={(v) => setCashDrop(Math.max(0, v))}
                currency={currency}
                highlight
              />
              <Pill label="Remaining in drawer" value={`${currency} ${money(remainingInDrawer)}`} />
              <Pill
                label="Cash difference"
                value={`${currency} ${money(deltaCash)}`}
                tone={deltaCash === 0 ? "ok" : "warn"}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Discrepancy reason</label>
                <textarea
                  rows={4}
                  value={discrepancy}
                  onChange={(e) => setDiscrepancy(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Explain over/short (e.g., missed drop, wrong change, batch delay)."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Shift notes (optional)</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Anything the next shift or manager should know."
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right / Sticky Summary */}
        <aside className="space-y-6 lg:sticky lg:top-6 self-start">
          <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">Shift Summary</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-600">Location</span><span className="font-semibold">{location}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Register</span><span className="font-semibold">{register}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Cashier</span><span className="font-semibold">{cashier}</span>
              </li>
              <li className="mt-2 h-px bg-gray-100" />
              <li className="flex justify-between">
                <span className="text-gray-600">Counted Cash</span>
                <span className="font-semibold">{currency} {money(countedCash)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Non-cash</span>
                <span className="font-semibold">{currency} {money(nonCash.card + nonCash.wallet + nonCash.voucher)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Total Counted</span>
                <span className="font-extrabold text-gray-900">{currency} {money(totalCounted)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Total Expected</span>
                <span className="font-extrabold text-gray-900">{currency} {money(totalExpected)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Difference</span>
                <span className={`font-extrabold ${deltaTotal === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {currency} {money(deltaTotal)}
                </span>
              </li>
              <li className="mt-2 h-px bg-gray-100" />
              <li className="flex justify-between">
                <span className="text-gray-600">Tips (paid)</span><span className="font-semibold">{currency} {money(tips)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Payouts</span><span className="font-semibold">{currency} {money(payouts)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Cash Drop</span><span className="font-semibold">{currency} {money(cashDrop)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Remain in Drawer</span>
                <span className="font-extrabold text-gray-900">{currency} {money(remainingInDrawer)}</span>
              </li>
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Print Z-Report
              </button>
              <button
                type="button"
                className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
              >
                Close Shift 🚀
                <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
              </button>
            </div>
          </div>

          {/* Tip: brand card */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50/60 to-emerald-50/60 p-5 ring-1 ring-white">
            <p className="text-sm text-gray-700">
              Pro tip: ensure **card batches** are settled before closing to avoid next-day adjustments.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Components (UI-focused)
 * ───────────────────────────────────────── */
function Step({ children, done = false }: { children: React.ReactNode; done?: boolean }) {
  return (
    <li className={`flex items-center gap-2 rounded-full px-3 py-1 ${done ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"}`}>
      <span className={`h-2 w-2 rounded-full ${done ? "bg-emerald-500" : "bg-gray-300"}`} />
      {children}
    </li>
  );
}

function Pill({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "ok" | "warn";
}) {
  const toneCls =
    tone === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
    tone === "warn" ? "bg-amber-50 text-amber-800 border-amber-200" :
    accent ? "bg-orange-50 text-orange-800 border-orange-200" : "bg-white text-gray-800 border-gray-200";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneCls}`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}

function InlineNumber({
  label,
  value,
  onChange,
  currency,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${highlight ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"} p-4`}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{currency}</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </div>
    </div>
  );
}

function SummaryMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const cls = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className={`text-lg font-extrabold ${cls}`}>{value}</div>
    </div>
  );
}

function TenderRow({
  label,
  expected,
  counted,
  onChange,
  currency,
  readOnly = false,
}: {
  label: string;
  expected: number;
  counted: number;
  onChange?: (v: number) => void;
  currency: string;
  readOnly?: boolean;
}) {
  const diff = counted - expected;
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="w-28 text-sm font-semibold text-gray-800">{label}</div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <span className="w-36 text-right text-sm text-gray-600">
          Exp: {currency} {money(expected)}
        </span>

        <div className="w-44">
          {readOnly ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-gray-900">
              {currency} {money(counted)}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">{currency}</span>
              <input
                type="number"
                step="0.01"
                value={counted}
                onChange={(e) => onChange?.(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          )}
        </div>

        <span className={`w-36 text-right text-sm font-semibold ${diff === 0 ? "text-emerald-700" : "text-amber-700"}`}>
          Δ {currency} {money(diff)}
        </span>
      </div>
    </div>
  );
}