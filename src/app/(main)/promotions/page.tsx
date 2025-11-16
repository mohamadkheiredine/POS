"use client";

import React, { useMemo, useState } from "react";
import {
  Search, Plus, Percent, Calendar, Clock, X, CheckCircle2, Pencil, Trash2, Sparkles, Timer, Gift
} from "lucide-react";

/* ───────────────────────────────
 * Types
 * ─────────────────────────────── */
type UID = string;
type PromoType = "Discount" | "Happy Hour" | "Voucher";

type Promotion = {
  id: UID;
  name: string;
  type: PromoType;
  value: number;
  startDate: string;
  endDate: string;
  active: boolean;
  description?: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: Promotion[] = [
  {
    id: uid(),
    name: "Happy Hour Drinks",
    type: "Happy Hour",
    value: 30,
    startDate: "2025-10-01",
    endDate: "2025-10-31",
    active: true,
    description: "30% off beverages from 5–8 PM daily",
  },
  {
    id: uid(),
    name: "Weekend Combo Deal",
    type: "Discount",
    value: 15,
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    active: true,
    description: "15% off all food combos on weekends",
  },
  {
    id: uid(),
    name: "Welcome Voucher",
    type: "Voucher",
    value: 10,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    active: false,
    description: "$10 voucher for new loyalty members",
  },
];

/* ───────────────────────────────
 * Page
 * ─────────────────────────────── */
export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>(MOCK);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; promo?: Promotion | null }>({ open: false });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return promotions.filter((p) =>
      !t ||
      p.name.toLowerCase().includes(t) ||
      p.type.toLowerCase().includes(t)
    );
  }, [promotions, search]);

  const startNew = () =>
    setDrawer({
      open: true,
      promo: {
        id: uid(),
        name: "",
        type: "Discount",
        value: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        active: true,
      },
    });

  const startEdit = (p: Promotion) => setDrawer({ open: true, promo: { ...p } });

  const savePromo = (p: Promotion) => {
    setPromotions((arr) => {
      const exists = arr.some((x) => x.id === p.id);
      return exists ? arr.map((x) => (x.id === p.id ? p : x)) : [p, ...arr];
    });
    setDrawer({ open: false });
  };

  const deletePromo = (id: string) =>
    setPromotions((arr) => arr.filter((x) => x.id !== id));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6 relative overflow-hidden">
      {/* Ambient light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-orange-300/30 to-amber-200/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-gradient-to-tr from-teal-200/30 to-orange-100/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">POS · F&B</div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Promotions
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Manage discounts, vouchers, and happy hours.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Promotion
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search promotions..."
            className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </div>

        {/* Promotions List */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1 font-extrabold text-gray-900">
                      {p.type === "Discount" && <Percent className="h-4 w-4 text-orange-500" />}
                      {p.type === "Happy Hour" && <Clock className="h-4 w-4 text-amber-500" />}
                      {p.type === "Voucher" && <Gift className="h-4 w-4 text-teal-500" />}
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500">{p.type}</div>
                  </div>
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-gray-700">{p.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {p.startDate}
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" /> {p.endDate}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                    p.active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-gray-50 text-gray-600 ring-gray-200"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>

                <button
                  onClick={() => deletePromo(p.id)}
                  className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No promotions found…
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Promotions
        </p>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.promo && (
        <PromotionDrawer
          promo={drawer.promo}
          onClose={() => setDrawer({ open: false })}
          onSave={savePromo}
        />
      )}
    </div>
  );
}

/* ───────────────────────────────
 * Drawer
 * ─────────────────────────────── */
function PromotionDrawer({
  promo,
  onClose,
  onSave,
}: {
  promo: Promotion;
  onClose: () => void;
  onSave: (p: Promotion) => void;
}) {
  const [form, setForm] = useState<Promotion>({ ...promo });
  const set = (p: Partial<Promotion>) => setForm((f) => ({ ...f, ...p }));

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">
            {promo.name ? `Edit ${promo.name}` : "New Promotion"}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs text-gray-600">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Type</label>
            <select
              value={form.type}
              onChange={(e) => set({ type: e.target.value as PromoType })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              {["Discount", "Happy Hour", "Voucher"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Value (%) or Amount</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => set({ value: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Description</label>
            <textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) => set({ description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            Active Promotion
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!canSave}
              onClick={() => onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}