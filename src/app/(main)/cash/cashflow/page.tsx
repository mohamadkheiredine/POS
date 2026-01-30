"use client";

import { api } from "@/lib/api";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CashMovementModal from "@/components/shared/cash-movements-modal";

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

  const [currencySymbol, setCurrencySymbol] = useState<string>("USD");

  const [companyId, setCompanyId] = useState<number>(0);
  const [storeId, setStoreId] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setCurrencySymbol(localStorage.getItem("currency_symbol") || "USD");

    const compId = Number(localStorage.getItem("company_id") || 1);
    const storId = Number(localStorage.getItem("store_id") || 1);
    setCompanyId(Number.isFinite(compId) && compId > 0 ? compId : 0);
    setStoreId(Number.isFinite(storId) && storId > 0 ? storId : 0);
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

  const saveCashMovement = async (payload: {
    code: "in" | "out";
    source_account: number;
    destination_account: number;
    amount: number;
    currency_id: number;
    description: string;
    company_id: number;
    store_id: number;
  }) => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const res = await api.post(
      `${API_BASE}/request/api/cash/savecashmovements`,
      {
        user_id,
        g_hash,
        ...payload,
      },
    );

    if (res.data?.is_error === 1) {
      alert(res.data.error_message);
      return;
    }

    fetchCashflow(1);
  };

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
              value={`${money(sumIn)} ${currencySymbol}`}
              tone="emerald"
            />
            <KPI
              title="Cash Out"
              value={`${money(sumOut)} ${currencySymbol}`}
              tone="rose"
            />
            <KPI
              title="Net"
              value={`${money(net)} ${currencySymbol}`}
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
                          {money(r.amount)} {currencySymbol}
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
        <CashMovementModal
          title="Cash In (Credit)"
          code="in"
          accounts={accounts}
          currencies={currencies}
          companyId={companyId}
          storeId={storeId}
          onClose={() => setShowCredit(false)}
          onSave={saveCashMovement}
        />
      )}

      {showDebit && (
        <CashMovementModal
          title="Cash Out (Debit)"
          code="out"
          accounts={accounts}
          currencies={currencies}
          companyId={companyId}
          storeId={storeId}
          onClose={() => setShowDebit(false)}
          onSave={saveCashMovement}
        />
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
