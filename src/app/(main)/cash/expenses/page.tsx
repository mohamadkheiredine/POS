"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

/** -----------------------------
 * helpers
 * ----------------------------- */
type UID = string | number;
const money = (n: unknown, d = 2) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

interface Expense {
  ref: number;
  date: string;
  category: string;
  category_id: number;
  payment: string;
  payment_id: number;
  amount: number;
  note?: string;
}



interface Category {
  id: UID;
  name: string;
}

const normalizeNote = (note?: string) => {
  if (!note) return "";
  return note.replace(/<\/?[^>]+(>|$)/g, "").trim();
};


/** -----------------------------
 * page
 * ----------------------------- */
export default function ExpensesPOS() {
  const API_BASE = process.env.NEXT_PUBLIC_API_LINK;
  const [currency, setCurrency] = useState<string | null>("");
  useEffect(() => {
    setCurrency(localStorage.getItem("currency_symbol"));
  }, []);

  // filters
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [payType, setPayType] = useState<string>("");

  // lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Expense[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [lstpaymenttypes, setLstPaymentTypes] = useState<any[]>([]);

  // paging
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const pageSize = 12;

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // form
  const [fDate, setFDate] = useState<string>("");
  const [fCategory, setFCategory] = useState<string>("");
  const [fPayType, setFPayType] = useState<string>("1");
  const [fAmount, setFAmount] = useState<string>("");
  const [fNote, setFNote] = useState<string>("");
  const [fFile, setFFile] = useState<File | null>(null);

  const resetForm = () => {
    setEditing(null);
    setFDate(new Date().toISOString().slice(0, 10));
    setFCategory(categories?.[0]?.id ? String(categories[0].id) : "");
    setFPayType("1");
    setFAmount("");
    setFNote("");
    setFFile(null);
  };

  /** -----------------------------
   * api calls
   * ----------------------------- */
  const fetchCategories = async () => {
    const url = `${API_BASE}/request/api/getlistexpensecategories`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");
    try {
      const res = await api.get(url, { params: { user_id, g_hash } });
      setCategories(res?.data?.categories_array || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchExpenses = async (p = 1) => {
    const url = `${API_BASE}/request/api/expense/list`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const params = {
      user_id,
      g_hash,
      q,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      category_id: categoryId || undefined,
      payment_type: payType || undefined,
      page: p,
      page_size: pageSize,
    };

    try {
      const res = await api.get(url, { params });
      if (res.data?.is_error === 1) {
        alert(res.data.error_message);
        return;
      }
  
      setRows(res.data?.rows || []);
      setTotal(Number(res.data?.total || 0));
      setPage(Number(res.data?.page || 1));
      setPages(Number(res.data?.total_pages || 1));
    } catch {
      setRows([]);
      setTotal(0);
      setPage(1);
      setPages(1);
    }
  };

  const saveExpense = async () => {
    const url = `${API_BASE}/request/api/submitnewexpense`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");
    const company_currency = localStorage.getItem("company_currency") || "248";

    const form = new FormData();
    form.append("user_id", String(user_id || ""));
    form.append("g_hash", String(g_hash || ""));
    if (editing?.ref) form.append("expense_id", String(editing.ref));
    form.append("date", fDate);
    form.append("category_id", fCategory);
    form.append("payment_type", fPayType);
    form.append("currency_id", company_currency);
    form.append("amount", fAmount || "0");
    form.append("note", fNote || "");
    if (fFile) form.append("attachment", fFile);

    try {
      const res = await api.post(url, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.is_error === 1) {
        alert(res.data.error_message);
        return;
      }
      setShowModal(false);
      await fetchExpenses(page);
    } catch {
      alert("Failed to save expense.");
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    const url = `${API_BASE}/request/api/expense/delete`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");
    try {
      const res = await api.delete(url, { params: { user_id, g_hash, expense_id: id } });
      if (res.data?.is_error === 1) {
        alert(res.data.error_message);
        return;
      }
      await fetchExpenses(page);
    } catch {
      alert("Failed to delete.");
    }
  };

  const exportCSV = async () => {
    const url = `${API_BASE}/request/api/expense/export`;
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
          category_id: categoryId || undefined,
          payment_type: payType || undefined,
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      alert("Export failed.");
    }
  };


  const fetchPaymentTypes = async () => {
   const url = `${API_BASE}/request/api/general/listpaymenttypes`;
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const res = await api.get(url, {});
      if (res.data?.is_error === 1) {
        alert(res.data.error_message);
        return;
      }

      setLstPaymentTypes(res.data?.payment_types || []);
      
  }

  /** -----------------------------
   * effects
   * ----------------------------- */
  useEffect(() => {
    fetchCategories();
    fetchPaymentTypes();
  }, []);

  useEffect(() => {
    fetchExpenses(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [q, fromDate, toDate, categoryId, payType]);
  
  /** -----------------------------
   * ui
   * ----------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-fuchsia-50">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-pink-500 text-white shadow">
            💸
          </div>
          <div>
            <h1 className="text-lg font-bold leading-5">Expenses</h1>
            <p className="text-xs text-slate-500">Retail POS • Track & Control</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              ➕ Add Expense
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
      <main className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        {/* filters */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
            <div className="mb-2 font-semibold">Filters</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Search</label>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Reference, note…"
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
                <label className="text-xs text-slate-500">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                  <option value="">All</option>
                  {(categories || []).map((c:any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.category_label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Payment Type</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                   <option value="0">All</option>
                  {(lstpaymenttypes || []).map((c:any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setQ("");
                  setFromDate("");
                  setToDate("");
                  setCategoryId("");
                  setPayType("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
            <div className="text-sm text-slate-600">Total (filtered)</div>
            <div className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-rose-600">
              {money(total)} {currency}
            </div>
          </div>
        </aside>

        {/* table */}
        <section className="col-span-12 lg:col-span-9 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow backdrop-blur">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <div className="font-semibold">Expenses</div>
              <div className="text-xs text-slate-500">
                Page {page} / {pages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-sky-50/70 text-left">
                  <tr>
                    <th className="px-4 py-2">Ref</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2">Note</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((r:any) => (
                      <tr key={String(r.ref)} className="border-t border-black/5">
                        <td className="px-4 py-2">{r.ref || "-"}</td>
                        <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{r.category}</td>
                        <td className="px-4 py-2 capitalize">
                          {r.payment}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {money(r.Amount)} {currency}
                        </td>
                        <td className="px-4 py-2 max-w-[280px] truncate" title={normalizeNote(r.note)}>
                          {normalizeNote(r.note)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex gap-2">
                            {r.attachment_url ? (
                              <a
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                                href={r.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                📎 Receipt
                              </a>
                            ) : null}
                            <button
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                              onClick={() => {
                                setEditing(r);
                                setFDate(r.date.slice(0, 10));
                                setFCategory(String(r.category_id));
                                setFPayType(r.payment_id);
                                setFAmount(String(r.Amount));
                                setFNote(r.note || "");
                                setFFile(null);
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                              onClick={() => deleteExpense(r.ref)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                        No expenses found.
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
                  onClick={() => fetchExpenses(page - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="px-2">{page}</span>
                <button
                  disabled={page >= pages}
                  onClick={() => fetchExpenses(page + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editing ? "Edit Expense" : "Add Expense"}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Category</label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {(categories || []).map((c:any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.category_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Payment Type</label>
                <select
                  value={fPayType}
                  onChange={(e) => setFPayType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                >
                   <option value="0">All</option>
                  {(lstpaymenttypes || []).map((c:any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Amount ({currency})</label>
                <input
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-right"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Receipt (optional)</label>
              <input
                type="file"
                onChange={(e) => setFFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Note</label>
              <textarea
                value={fNote}
                onChange={(e) => setFNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="Optional note…"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveExpense}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                {editing ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** -----------------------------
 * Tailwind modal
 * ----------------------------- */
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
          <button onClick={onClose} className="rounded-lg px-2 py-1 hover:bg-slate-100" aria-label="Close">
            ✖
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}