"use client";

import React, { useMemo, useState } from "react";
import {
  Search, Filter, Plus, Pencil, X, CheckCircle2, Phone, Mail, MapPin, User, Users2, Building2, Trash2
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UID = string;
type CustomerType = "Dine-in" | "Takeaway" | "Delivery";

type Customer = {
  id: UID;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type: CustomerType;
  company?: string;
  loyaltyPoints?: number;
  active: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* Mock Data */
const MOCK: Customer[] = [
  { id: uid(), name: "John Doe", phone: "0321 456 789", email: "john@example.com", address: "Beirut Downtown", type: "Delivery", loyaltyPoints: 120, active: true },
  { id: uid(), name: "Sara Haddad", phone: "0344 555 777", email: "sara@workmail.com", type: "Dine-in", active: true },
  { id: uid(), name: "Ahmad Khalil", phone: "0377 999 111", address: "Hamra, Beirut", type: "Takeaway", company: "Khalil Bros", active: true },
  { id: uid(), name: "Rami Abbas", phone: "0399 101 222", email: "rami@outlook.com", address: "Tripoli", type: "Delivery", active: false },
];

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function POSCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK);
  const [filter, setFilter] = useState<"All" | CustomerType>("All");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; customer?: Customer | null }>({ open: false });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return customers.filter(c => {
      const txt = !t || c.name.toLowerCase().includes(t) || (c.phone || "").includes(t) || (c.email || "").toLowerCase().includes(t);
      const f = filter === "All" || c.type === filter;
      return txt && f;
    });
  }, [customers, filter, search]);

  const startNew = () =>
    setDrawer({
      open: true,
      customer: { id: uid(), name: "", type: "Dine-in", active: true },
    });

  const startEdit = (c: Customer) =>
    setDrawer({ open: true, customer: { ...c } });

  const saveCustomer = (c: Customer) => {
    setCustomers(arr => {
      const exist = arr.some(x => x.id === c.id);
      return exist ? arr.map(x => (x.id === c.id ? c : x)) : [c, ...arr];
    });
    setDrawer({ open: false, customer: null });
  };

  const deleteCustomer = (id: string) =>
    setCustomers(arr => arr.filter(x => x.id !== id));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">POS · F&B</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Customers
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Manage dine-in, takeaway, and delivery customers.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Customer
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, email..."
                className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", "Dine-in", "Takeaway", "Delivery"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-extrabold text-gray-900 flex items-center gap-1">
                      <User className="h-4 w-4 text-gray-500" /> {c.name}
                    </div>
                    <div className="text-xs text-gray-500">{c.type}</div>
                  </div>
                  <button
                    onClick={() => startEdit(c)}
                    className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 text-sm text-gray-700">
                  {c.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {c.phone}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {c.email}
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>

                {c.company && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" /> {c.company}
                  </div>
                )}

                {c.loyaltyPoints !== undefined && (
                  <div className="mt-1 text-[11px] font-semibold text-orange-600">
                    {c.loyaltyPoints} pts
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                    c.active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-gray-50 text-gray-600 ring-gray-200"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </div>
                <button
                  onClick={() => deleteCustomer(c.id)}
                  className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No customers found…
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — F&B Customers
        </p>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.customer && (
        <CustomerDrawer
          customer={drawer.customer}
          onClose={() => setDrawer({ open: false })}
          onSave={saveCustomer}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 * Customer Drawer (Add/Edit)
 * ───────────────────────────────────────── */
function CustomerDrawer({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>({ ...customer });
  const set = (p: Partial<Customer>) => setForm((f) => ({ ...f, ...p }));

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">
            {customer.name ? `Edit ${customer.name}` : "New Customer"}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Phone</label>
              <input
                value={form.phone || ""}
                onChange={(e) => set({ phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Email</label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => set({ email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Address</label>
            <textarea
              rows={2}
              value={form.address || ""}
              onChange={(e) => set({ address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <select
                value={form.type}
                onChange={(e) => set({ type: e.target.value as CustomerType })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                {["Dine-in", "Takeaway", "Delivery"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Company</label>
              <input
                value={form.company || ""}
                onChange={(e) => set({ company: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Loyalty Points</label>
            <input
              type="number"
              value={form.loyaltyPoints ?? 0}
              onChange={(e) =>
                set({ loyaltyPoints: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            Active Customer
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