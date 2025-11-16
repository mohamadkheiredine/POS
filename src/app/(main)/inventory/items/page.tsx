"use client";

import React, { useMemo, useState } from "react";
import {
  Boxes, Search, Filter, Plus, Upload, Download, ArrowUpDown, Warehouse,
  MapPin, Factory, AlertTriangle, CalendarClock, ClipboardList, QrCode,
  ChevronLeft, ChevronRight, MoveRight, Layers, Barcode, Edit3, RefreshCw, CheckCircle2, X, ClipboardCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
type UID = string;
type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Category = "Raw" | "Semi-Prep" | "Finished" | "Packaging" | "Beverage" | "Other";

type Location = "Main Store" | "Kitchen" | "Bar" | "Cold Room" | "Freezer";

type Lot = {
  id: UID;
  code: string;                 // batch/lot code
  qty: number;
  uom: UOM;
  expiry?: string;              // ISO date
  location: Location;
  unitCost: number;             // cost per UOM for this lot
  supplier?: string;
  createdAt: string;            // received date
};

type InventoryItem = {
  id: UID;
  name: string;
  sku: string;
  category: Category;
  uom: UOM;
  reorderPoint: number;
  leadTimeDays?: number;
  preferredSupplier?: string;
  onHand: number;               // summed from lots
  committed: number;            // allocated to open orders
  avgCost: number;              // weighted moving average
  lastCost?: number;
  lots: Lot[];
};

/* ────────────────────────────────────────────────────────────────────────────
 * Mock data
 * ──────────────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: InventoryItem[] = [
  {
    id: uid(),
    name: "Mozzarella (block)",
    sku: "RM-MOZZ-001",
    category: "Raw",
    uom: "kg",
    reorderPoint: 3,
    leadTimeDays: 3,
    preferredSupplier: "DairyCo",
    onHand: 12.5,
    committed: 4,
    avgCost: 6.85,
    lastCost: 7.1,
    lots: [
      { id: uid(), code: "MOZ-2408A", qty: 5,  uom: "kg", expiry: nextDays(20), location: "Cold Room", unitCost: 6.7, supplier: "DairyCo", createdAt: prevDays(10) },
      { id: uid(), code: "MOZ-2408B", qty: 3.5,uom: "kg", expiry: nextDays(8),  location: "Cold Room", unitCost: 7.1, supplier: "DairyCo", createdAt: prevDays(6) },
      { id: uid(), code: "MOZ-2408C", qty: 4,  uom: "kg", expiry: nextDays(40), location: "Freezer",   unitCost: 6.8, supplier: "DairyCo", createdAt: prevDays(2) },
    ],
  },
  {
    id: uid(),
    name: "Romaine Lettuce",
    sku: "RM-LETT-001",
    category: "Raw",
    uom: "kg",
    reorderPoint: 6,
    leadTimeDays: 2,
    preferredSupplier: "GreenFields",
    onHand: 5.2,
    committed: 1.5,
    avgCost: 2.9,
    lastCost: 3.1,
    lots: [
      { id: uid(), code: "LET-2409A", qty: 2.2, uom: "kg", expiry: nextDays(3), location: "Kitchen", unitCost: 3.0, supplier: "GreenFields", createdAt: prevDays(1) },
      { id: uid(), code: "LET-2409B", qty: 3,   uom: "kg", expiry: nextDays(6), location: "Kitchen", unitCost: 2.8, supplier: "GreenFields", createdAt: prevDays(1) },
    ],
  },
  {
    id: uid(),
    name: "Olive Oil (EVOO)",
    sku: "RM-OLIV-003",
    category: "Raw",
    uom: "L",
    reorderPoint: 10,
    leadTimeDays: 7,
    preferredSupplier: "MedOil",
    onHand: 22,
    committed: 4,
    avgCost: 5.95,
    lastCost: 6.2,
    lots: [
      { id: uid(), code: "OLV-2407Z", qty: 12, uom: "L", location: "Main Store", unitCost: 5.8, supplier: "MedOil", createdAt: prevDays(25) },
      { id: uid(), code: "OLV-2408Q", qty: 10, uom: "L", location: "Kitchen",    unitCost: 6.1, supplier: "MedOil", createdAt: prevDays(9) },
    ],
  },
  {
    id: uid(),
    name: "Takeaway Box M",
    sku: "PK-BOX-M",
    category: "Packaging",
    uom: "pcs",
    reorderPoint: 200,
    leadTimeDays: 5,
    preferredSupplier: "PackFast",
    onHand: 420,
    committed: 60,
    avgCost: 0.18,
    lastCost: 0.2,
    lots: [
      { id: uid(), code: "BOX-2408", qty: 420, uom: "pcs", location: "Main Store", unitCost: 0.18, supplier: "PackFast", createdAt: prevDays(12) },
    ],
  },
];

// Normalizes any customer shape your API might return
const normalizeCustomer = (raw: any) => ({
  ic_id:
    raw?.ic_id ??
    raw?.customer_id ??
    raw?.id ??
    raw?.insert_id ??
    raw?.new_id ??
    0,
  ic_customer_name:
    raw?.ic_customer_name ?? raw?.name ?? raw?.customer_name ?? "",
  ic_customer_phone:
    raw?.ic_customer_phone ?? raw?.phone ?? raw?.mobile ?? "",
  ic_customer_email:
    raw?.ic_customer_email ?? raw?.email ?? "",
});


function prevDays(n: number) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
function nextDays(n: number) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

const LOCATIONS: Location[] = ["Main Store", "Kitchen", "Bar", "Cold Room", "Freezer"];
const CATEGORIES: Category[] = ["Raw", "Semi-Prep", "Finished", "Packaging", "Beverage", "Other"];

/* ────────────────────────────────────────────────────────────────────────────
 * Utils
 * ──────────────────────────────────────────────────────────────────────────── */
const money = (n: number, d = 2) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const dateDiffDays = (iso?: string) => iso ? Math.floor((new Date(iso).getTime() - Date.now())/86400000) : undefined;

/* ────────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────────── */
export default function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>(MOCK);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [loc, setLoc] = useState<Location | "All">("All");
  const [status, setStatus] = useState<"all" | "low" | "out" | "expiring" | "overstock">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drawer, setDrawer] = useState<{ open: boolean; item?: InventoryItem | null }>({ open: false, item: null });
  const [move, setMove] = useState<{ open: boolean; item?: InventoryItem | null; lotId?: string }>({ open: false });
  const [count, setCount] = useState<{ open: boolean; item?: InventoryItem | null }>({ open: false });
  const router = useRouter();
  const pageSize = 8;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((it) => {
      const txt = !t || it.name.toLowerCase().includes(t) || it.sku.toLowerCase().includes(t);
      const c = cat === "All" || it.category === cat;
      const locationMatch = loc === "All" || it.lots.some((l) => l.location === loc);
      const low = it.onHand <= it.reorderPoint && it.onHand > 0;
      const out = it.onHand <= 0;
      const expiring = it.lots.some((l) => (dateDiffDays(l.expiry) ?? 9999) <= 5);
      const over = it.onHand > it.reorderPoint * 4 && it.reorderPoint > 0;
      const st = status === "all" || (status === "low" && low) || (status === "out" && out) || (status === "expiring" && expiring) || (status === "overstock" && over);
      return txt && c && locationMatch && st;
    });
  }, [items, q, cat, loc, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const toggleSel = (id: string, v: boolean) => setSelected((s) => ({ ...s, [id]: v }));
  const toggleAll = () => {
    const all = pageItems.every((i) => selected[i.id]);
    const draft = { ...selected };
    pageItems.forEach((i) => (draft[i.id] = !all));
    setSelected(draft);
  };

  const exportCSV = () => {
    const cols = ["Name","SKU","Category","UOM","OnHand","Committed","Available","ReorderPoint","AvgCost","Valuation","LeadTime","Supplier"];
    const rows = filtered.map((i) => [
      i.name, i.sku, i.category, i.uom, i.onHand, i.committed, Math.max(0, i.onHand - i.committed),
      i.reorderPoint, i.avgCost, (i.avgCost * i.onHand).toFixed(2), i.leadTimeDays ?? "", i.preferredSupplier ?? ""
    ]);
    const csv = [cols.join(","), ...rows.map(r => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "inventory_items.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const openTransfer = (item: InventoryItem, lotId?: string) => setMove({ open: true, item, lotId });
  const openCount = (item: InventoryItem) => setCount({ open: true, item });
  const openLotsDrawer = (item: InventoryItem) => setDrawer({ open: true, item });

  // Demo mutations
  const transfer = (itemId: string, lotId: string, to: Location, qty: number) => {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== itemId) return it;
        const lot = it.lots.find((l) => l.id === lotId);
        if (!lot || qty <= 0 || qty > lot.qty) return it;
        // decrease source
        lot.qty = Number((lot.qty - qty).toFixed(3));
        // add/increase destination lot by code + '-M'
        const existing = it.lots.find((l) => l.code === lot.code && l.location === to && l.unitCost === lot.unitCost && l.expiry === lot.expiry);
        if (existing) existing.qty = Number((existing.qty + qty).toFixed(3));
        else it.lots.push({
          id: uid(),
          code: lot.code,
          qty,
          uom: lot.uom,
          expiry: lot.expiry,
          location: to,
          unitCost: lot.unitCost,
          supplier: lot.supplier,
          createdAt: lot.createdAt,
        });
        // recompute onHand
        it.onHand = Number(it.lots.reduce((s, l) => s + l.qty, 0).toFixed(3));
        return { ...it };
      })
    );
  };

  const countAdjust = (itemId: string, newTotal: number) => {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== itemId) return it;
        const delta = Number((newTotal - it.onHand).toFixed(3));
        if (Math.abs(delta) < 0.0001) return it;
        // naive: adjust first lot
        if (it.lots.length === 0) {
          it.lots.push({
            id: uid(),
            code: `${it.sku}-${new Date().toISOString().slice(0,10)}`,
            qty: newTotal,
            uom: it.uom,
            location: "Main Store",
            unitCost: it.avgCost,
            createdAt: prevDays(0),
          });
        } else {
          const l0 = it.lots[0];
          l0.qty = Number((l0.qty + delta).toFixed(3));
        }
        it.onHand = newTotal;
        // WMA cost stays same in demo
        return { ...it };
      })
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Inventory · Items</h1>
            <p className="text-sm text-gray-600">Stock by item with locations, lots & expiries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => alert("Import CSV placeholder — wire to your API")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search name or SKU…"
                className="w-72 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={cat}
                onChange={(e) => { setCat(e.target.value as any); setPage(1); }}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", ...CATEGORIES].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <Warehouse className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={loc}
                onChange={(e) => { setLoc(e.target.value as any); setPage(1); }}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", ...LOCATIONS].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="expiring">Expiring soon</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/purchase-orders/new")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Factory className="h-4 w-4" /> New PO
            </button>
            <button
              onClick={() => alert("Open stock transfers page placeholder")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <MoveRight className="h-4 w-4" /> Transfers
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th className="w-[36px]">
                  <input
                    type="checkbox"
                    checked={pageItems.length>0 && pageItems.every(i => selected[i.id])}
                    onChange={toggleAll}
                  />
                </th>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">On hand</th>
                <th className="text-right">Committed</th>
                <th className="text-right">Available</th>
                <th className="text-right">Reorder</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Valuation</th>
                <th className="text-right">Lead</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((it) => {
                const available = Math.max(0, it.onHand - it.committed);
                const low = it.onHand <= it.reorderPoint && it.onHand > 0;
                const out = it.onHand <= 0;
                const expSoon = it.lots.some((l) => (dateDiffDays(l.expiry) ?? 9999) <= 5);
                return (
                  <tr key={it.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td>
                      <input type="checkbox" checked={!!selected[it.id]} onChange={(e) => toggleSel(it.id, e.target.checked)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-gray-400">
                          <Boxes className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{it.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                            {expSoon && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                <CalendarClock className="h-3.5 w-3.5" /> expiring
                              </span>
                            )}
                            {low && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                <AlertTriangle className="h-3.5 w-3.5" /> low
                              </span>
                            )}
                            {out && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                                out
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-700">{it.sku}</td>
                    <td className="text-gray-700">{it.category}</td>
                    <td className="text-right font-semibold text-gray-900">{it.onHand} {it.uom}</td>
                    <td className="text-right">{it.committed} {it.uom}</td>
                    <td className="text-right">{available} {it.uom}</td>
                    <td className={`text-right ${low ? "text-amber-700 font-semibold" : "text-gray-800"}`}>{it.reorderPoint} {it.uom}</td>
                    <td className="text-right">$ {money(it.avgCost)}</td>
                    <td className="text-right font-semibold">$ {money(it.avgCost * it.onHand)}</td>
                    <td className="text-right">{it.leadTimeDays ?? "—"}d</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openLotsDrawer(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="View lots"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openTransfer(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Transfer stock"
                        >
                          <MoveRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openCount(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Cycle count"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => alert("Print labels placeholder")}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Print labels"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-14 text-center text-sm text-gray-500">No items found…</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-gray-600">Page {page} / {pages} · {filtered.length} item(s)</div>
            <div className="flex items-center gap-2">
              <button
                disabled={page<=1}
                onClick={() => setPage((p) => Math.max(1, p-1))}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                disabled={page>=pages}
                onClick={() => setPage((p) => Math.min(pages, p+1))}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">© {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Inventory</p>
      </div>

      {/* ───────────────────────── Lots / Batches Drawer ───────────────────────── */}
      {drawer.open && drawer.item && (
        <LotsDrawer item={drawer.item} onClose={() => setDrawer({ open: false, item: null })} onTransfer={openTransfer} />
      )}

      {/* ───────────────────────── Transfer Modal ───────────────────────── */}
      {move.open && move.item && (
        <TransferModal
          item={move.item}
          lotId={move.lotId}
          onClose={() => setMove({ open: false })}
          onTransfer={(lotId, to, qty) => { transfer(move.item!.id, lotId, to, qty); setMove({ open: false }); }}
        />
      )}

      {/* ───────────────────────── Cycle Count Modal ───────────────────────── */}
      {count.open && count.item && (
        <CountModal
          item={count.item}
          onClose={() => setCount({ open: false })}
          onSubmit={(newTotal) => { countAdjust(count.item!.id, newTotal); setCount({ open: false }); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Lots Drawer
 * ──────────────────────────────────────────────────────────────────────────── */
function LotsDrawer({ item, onClose, onTransfer }: {
  item: InventoryItem;
  onClose: () => void;
  onTransfer: (item: InventoryItem, lotId?: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" />
            <div className="font-bold">Lots / Batches — {item.name}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {item.lots.map((l) => {
            const d = dateDiffDays(l.expiry);
            const expCls =
              d === undefined ? "text-gray-700"
              : d <= 0 ? "text-rose-700 font-semibold"
              : d <= 5 ? "text-amber-700 font-semibold"
              : "text-gray-700";
            return (
              <div key={l.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900">{l.code}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {l.location}</span>
                      <span className="inline-flex items-center gap-1"><Barcode className="h-3.5 w-3.5" /> {l.uom}</span>
                      <span className="inline-flex items-center gap-1"><Factory className="h-3.5 w-3.5" /> {l.supplier || "—"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-gray-900">{l.qty} {l.uom}</div>
                    <div className={`text-xs ${expCls}`}>
                      {l.expiry ? (d! <= 0 ? "Expired" : `Expires in ${d}d`) : "No expiry"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Unit Cost</div>
                    <div>$ {money(l.unitCost)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Valuation</div>
                    <div className="font-semibold">$ {money(l.unitCost * l.qty)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Received</div>
                    <div>{l.createdAt}</div>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => onTransfer(item, l.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <MoveRight className="h-4 w-4" /> Transfer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {item.lots.length === 0 && (
            <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No lots for this item.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Transfer Modal
 * ──────────────────────────────────────────────────────────────────────────── */
function TransferModal({
  item, lotId, onClose, onTransfer
}: {
  item: InventoryItem;
  lotId?: string;
  onClose: () => void;
  onTransfer: (lotId: string, to: Location, qty: number) => void;
}) {
  const [targetLot, setTargetLot] = useState<string>(lotId || item.lots[0]?.id || "");
  const [to, setTo] = useState<Location>("Kitchen");
  const [qty, setQty] = useState<number>(0);

  const lot = item.lots.find((l) => l.id === targetLot);
  const maxQty = lot ? lot.qty : 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Transfer Stock — {item.name}</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs text-gray-600">From Lot</label>
            <select
              value={targetLot}
              onChange={(e) => setTargetLot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {item.lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.qty} {l.uom} @ ${money(l.unitCost)} · {l.location}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">To Location</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Location)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
            />
            <div className="mt-1 text-xs text-gray-500">Max {maxQty} {lot?.uom}</div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              disabled={!targetLot || qty<=0 || qty>maxQty}
              onClick={() => onTransfer(targetLot, to, qty)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <MoveRight className="h-4 w-4" /> Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Cycle Count Modal
 * ──────────────────────────────────────────────────────────────────────────── */
function CountModal({ item, onClose, onSubmit }: {
  item: InventoryItem;
  onClose: () => void;
  onSubmit: (newTotal: number) => void;
}) {
  const [newTotal, setNewTotal] = useState<number>(item.onHand);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Cycle Count — {item.name}</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="text-sm text-gray-700">Current On Hand: <b>{item.onHand} {item.uom}</b></div>
          <div>
            <label className="text-xs text-gray-600">New On Hand</label>
            <input
              type="number"
              value={newTotal}
              onChange={(e) => setNewTotal(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
            />
          </div>
          <div className="text-xs text-gray-500">
            This creates an <b>inventory adjustment</b> (reason: Cycle Count). In production, record user, timestamp, and delta for audit.
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => onSubmit(newTotal)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
