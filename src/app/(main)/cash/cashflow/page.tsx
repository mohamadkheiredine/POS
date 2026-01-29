"use client";

import { api } from "@/lib/api";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------ helpers ------------------ */
type UID = string | number;
const money = (n: unknown, d = 2) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

interface CashRow {
  id: UID;
  t: string;
  type: "in" | "out";
  method?: string;
  amount: number;
  note?: string;
  user?: string;
}

interface Account {
  aa_id: number;
  aa_account: string;
  aa_account_label: string;
}

interface Currency {
  currency_id: number;
  currency_code: string;
  currency_name: string;
}

/* ------------------ page ------------------ */
export default function CashflowPOS() {
  const API_BASE = process.env.NEXT_PUBLIC_API_LINK;
  const [currency, setCurrency] = useState<string>("");
  useEffect(() => {
    setCurrency(localStorage.getItem("currency_symbol") || "USD");
  }, []);

  const router = useRouter();

  // filters
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");

  // data
  const [rows, setRows] = useState<CashRow[]>([]);
  const [sumIn, setSumIn] = useState(0);
  const [sumOut, setSumOut] = useState(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // paging
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const pageSize = 10;

  // modals
  const [showCredit, setShowCredit] = useState(false);
  const [showDebit, setShowDebit] = useState(false);

  // form fields (shared)
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const fetchCashflow = async (p = 1) => {
    const url = `${API_BASE}/request/api/cash/list`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const params = {
      user_id,
      g_hash,
      q,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      user: userFilter || undefined,
      page: p,
      page_size: pageSize,
    };

    try {
      const res = await api.get(url, { params });
      if (res.data?.is_error === 1) {
        alert(res.data.error_message);
        return;
      }
      const items: CashRow[] = res.data?.rows || [];
      setRows(items);
      setSumIn(Number(res.data?.sum_in || 0));
      setSumOut(Number(res.data?.sum_out || 0));
      setPage(Number(res.data?.page || 1));
      setPages(Number(res.data?.total_pages || 1));
    } catch {
      setRows([]);
      setSumIn(0);
      setSumOut(0);
      setPage(1);
      setPages(1);
    }
  };

  const exportCSV = async () => {
    const url = `${API_BASE}/request/api/cash/export`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");
    try {
      const res = await api.get(url, {
        params: {
          user_id,
          g_hash,
          q,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          user: userFilter || undefined,
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `cashflow_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      alert("Export failed.");
    }
  };

  useEffect(() => {
    setPage(1);
    fetchCashflow(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromDate, toDate, userFilter]);

  const net = sumIn - sumOut;

  const fetchAccounts = async () => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const res = await api.get(`${API_BASE}/request/api/cash/getaccounts`, {
      params: { user_id, g_hash },
    });

    if (res.data?.is_error === 1) {
      alert(res.data.error_message);
      return;
    }

    setAccounts(res.data.lst_accounts || []);
  };

  const fetchCurrencies = async () => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const res = await api.post(`${API_BASE}/request/api/getlistcurrency`, {
      user_id,
      g_hash,
    });

    const list = res.data?.currencies || {};

    setCurrencies(Object.values(list));
  };

  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
  }, []);

  /* ------------------ ui ------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-fuchsia-50">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold leading-5">Cashflow</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => router.push("/opencash")}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              💰 Open Cash
            </button>

            <button
              onClick={exportCSV}
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sky-700 hover:bg-sky-100"
            >
              ⬇️ Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
        {/* KPIs */}
        <section className="col-span-12 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI
              title="Cash In"
              value={`${money(sumIn)} ${currency}`}
              tone="emerald"
            />
            <KPI
              title="Cash Out"
              value={`${money(sumOut)} ${currency}`}
              tone="rose"
            />
            <KPI
              title="Net"
              value={`${money(net)} ${currency}`}
              tone={net >= 0 ? "sky" : "amber"}
            />
          </div>
        </section>

        {/* filters */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
            <div className="mb-2 font-semibold">Filters</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Search</label>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Note, method, user…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">User</label>
                <input
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                  placeholder="Username (optional)"
                />
              </div>

              <button
                onClick={() => {
                  setQ("");
                  setFromDate("");
                  setToDate("");
                  setUserFilter("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
            <div className="mb-2 font-semibold">Add Entry</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowCredit(true)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
              >
                + Cash In
              </button>

              <button
                onClick={() => setShowDebit(true)}
                className="rounded-xl bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
              >
                − Cash Out
              </button>
            </div>
          </div>
        </aside>

        {/* table */}
        <section className="col-span-12 lg:col-span-9 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow backdrop-blur">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <div className="font-semibold">Movements</div>
              <div className="text-xs text-slate-500">
                Page {page} / {pages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-sky-50/70 text-left">
                  <tr>
                    <th className="px-4 py-2">When</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Method</th>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Note</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((r) => (
                      <tr
                        key={String(r.id)}
                        className="border-t border-black/5"
                      >
                        <td className="px-4 py-2">
                          {new Date(r.t).toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-2 font-medium ${r.type === "in" ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          {r.type === "in" ? "In" : "Out"}
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {r.method || "cash"}
                        </td>
                        <td className="px-4 py-2">{r.user || "-"}</td>
                        <td
                          className="px-4 py-2 max-w-[320px] truncate"
                          title={r.note}
                        >
                          {r.note || ""}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {money(r.amount)} {currency}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-slate-500"
                        colSpan={6}
                      >
                        No movements found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm">
              <div>Showing {rows.length} items</div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchCashflow(newPage);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="px-2">{page}</span>
                <button
                  disabled={page >= pages}
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    fetchCashflow(newPage);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add entry modal */}
      {showCredit && (
        <Modal title="Cash In (Credit)" onClose={() => setShowCredit(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowCredit(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-slate-500">Source Account</label>
              <select
                required
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              >
                <option value="">Select source account</option>
                {accounts.map((acc) => (
                  <option key={acc.aa_id} value={acc.aa_id}>
                    {acc.aa_account} - {acc.aa_account_label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Destination Account
              </label>
              <select
                required
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              >
                <option value="">Select destination account</option>
                {accounts.map((acc) => (
                  <option key={acc.aa_id} value={acc.aa_id}>
                    {acc.aa_account} - {acc.aa_account_label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500">Currency</label>
                <select
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.currency_id} value={c.currency_id}>
                      {c.currency_code} - {c.currency_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-slate-500">Amount</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-right"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCredit(false)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                Save Credit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDebit && (
        <Modal title="Cash Out (Debit)" onClose={() => setShowDebit(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowDebit(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-slate-500">Source Account</label>
              <select
                required
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              >
                <option value="">Select source account</option>
                {accounts.map((acc) => (
                  <option key={acc.aa_id} value={acc.aa_id}>
                    {acc.aa_account} - {acc.aa_account_label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Destination Account
              </label>
              <select
                required
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              >
                <option value="">Select destination account</option>
                {accounts.map((acc) => (
                  <option key={acc.aa_id} value={acc.aa_id}>
                    {acc.aa_account} - {acc.aa_account_label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500">Currency</label>
                <select
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.currency_id} value={c.currency_id}>
                      {c.currency_code} - {c.currency_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-slate-500">Amount</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-right"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDebit(false)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-rose-600 px-4 py-2 text-white hover:bg-rose-700">
                Save Debit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------ small components ------------------ */
function KPI({
  title,
  value,
  tone = "sky",
}: {
  title: string;
  value: string;
  tone?: "emerald" | "rose" | "sky" | "indigo" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500 to-lime-500",
    rose: "from-rose-500 to-pink-500",
    sky: "from-sky-500 to-indigo-500",
    indigo: "from-indigo-500 to-fuchsia-500",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
      <div className="text-xs text-slate-500">{title}</div>
      <div
        className={`mt-1 inline-flex rounded-xl bg-gradient-to-r ${tones[tone]} px-3 py-1 text-white`}
      >
        <span className="text-lg font-bold">{value}</span>
      </div>
    </div>
  );
}

/* ------------------ tailwind modal ------------------ */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full sm:w-[620px] rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-lg outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between border-b border-black/5 pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 hover:bg-slate-100"
            aria-label="Close"
          >
            ✖
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
