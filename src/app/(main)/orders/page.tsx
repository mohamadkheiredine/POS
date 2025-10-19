"use client";

import React, { useMemo, useState } from "react";
import {
  Search, Filter, FileSpreadsheet, FileText, Edit3, Eye, Trash2,
  Download, X, CheckCircle2, Printer
} from "lucide-react";

// ───────────────────────────────
// Types
// ───────────────────────────────
type UID = string;
type Status = "open" | "in-progress" | "served" | "paid" | "void";

type OrderItem = {
  id: UID;
  name: string;
  qty: number;
  price: number;
  notes?: string;
};

type Order = {
  id: UID;
  code: string;
  table: string;
  server: string;
  status: Status;
  items: OrderItem[];
  createdAt: string;
};

// Mock
const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: Order[] = [
  {
    id: uid(),
    code: "ORD-1001",
    table: "T3",
    server: "A. Haddad",
    status: "in-progress",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    items: [
      { id: uid(), name: "Margherita Pizza", qty: 1, price: 9 },
      { id: uid(), name: "Mango Juice", qty: 2, price: 3.5 },
    ],
  },
  {
    id: uid(),
    code: "ORD-1002",
    table: "T5",
    server: "M. Karam",
    status: "served",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    items: [{ id: uid(), name: "Caesar Salad", qty: 1, price: 7 }],
  },
  {
    id: uid(),
    code: "ORD-1003",
    table: "Bar-1",
    server: "L. Saad",
    status: "open",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    items: [
      { id: uid(), name: "Chicken Shawarma", qty: 2, price: 8.5 },
      { id: uid(), name: "Pepsi Can", qty: 2, price: 2 },
    ],
  },
];

// Utils
const money = (n: number) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// ───────────────────────────────
// Page
// ───────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "All">("All");
  const [drawer, setDrawer] = useState<{ open: boolean; order?: Order | null }>({ open: false, order: null });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter((o) => {
      const txt =
        !t ||
        o.code.toLowerCase().includes(t) ||
        o.table.toLowerCase().includes(t) ||
        o.server.toLowerCase().includes(t);
      const st = status === "All" || o.status === status;
      return txt && st;
    });
  }, [orders, q, status]);

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(
      filtered.map((o) => ({
        Code: o.code,
        Table: o.table,
        Server: o.server,
        Status: o.status,
        Total: o.items.reduce((s, i) => s + i.qty * i.price, 0),
        Created: o.createdAt,
      }))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Orders");
    writeFile(wb, "orders.xlsx");
  };

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Orders Report", 14, 20);
    let y = 30;
    filtered.forEach((o) => {
      doc.text(
        `${o.code} | ${o.table} | ${o.server} | ${o.status} | ${money(
          o.items.reduce((s, i) => s + i.qty * i.price, 0)
        )}`,
        14,
        y
      );
      y += 8;
    });
    doc.save("orders.pdf");
  };

  const startEdit = (o: Order) => setDrawer({ open: true, order: { ...o } });

  const saveOrder = (o: Order) => {
    setOrders((arr) => arr.map((x) => (x.id === o.id ? o : x)));
    setDrawer({ open: false, order: null });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-600">List of restaurant orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code, table, server…"
              className="w-72 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {["All", "open", "in-progress", "served", "paid", "void"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl shadow ring-1 ring-white/60">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>Code</th>
                <th>Table</th>
                <th>Server</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o) => (
                <tr key={o.id} className="[&>td]:px-3 [&>td]:py-3">
                  <td className="font-semibold text-gray-900">{o.code}</td>
                  <td>{o.table}</td>
                  <td>{o.server}</td>
                  <td className="capitalize">{o.status}</td>
                  <td className="text-right font-semibold">
                    {money(o.items.reduce((s, i) => s + i.qty * i.price, 0))}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="text-right">
                    <button
                      onClick={() => startEdit(o)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No orders found…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.order && (
        <OrderDrawer
          order={drawer.order}
          onClose={() => setDrawer({ open: false })}
          onSave={saveOrder}
        />
      )}
    </div>
  );
}

// ───────────────────────────────
// Order Drawer
// ───────────────────────────────
function OrderDrawer({
  order,
  onClose,
  onSave,
}: {
  order: Order;
  onClose: () => void;
  onSave: (o: Order) => void;
}) {
  const [form, setForm] = useState<Order>({ ...order });

  const updateItem = (id: string, patch: Partial<OrderItem>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const total = form.items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold">Edit {form.code}</div>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label className="text-xs text-gray-600">Table</label>
            <input
              value={form.table}
              onChange={(e) => setForm({ ...form, table: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Server</label>
            <input
              value={form.server}
              onChange={(e) => setForm({ ...form, server: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Status })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              {["open", "in-progress", "served", "paid", "void"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="font-semibold text-gray-800">Items</div>
            {form.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-2"
              >
                <input
                  value={it.name}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  value={it.qty}
                  onChange={(e) =>
                    updateItem(it.id, { qty: Number(e.target.value) })
                  }
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                />
                <input
                  type="number"
                  value={it.price}
                  onChange={(e) =>
                    updateItem(it.id, { price: Number(e.target.value) })
                  }
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                />
              </div>
            ))}
          </div>

          <div className="text-right font-bold text-gray-900">
            Total: {money(total)}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
