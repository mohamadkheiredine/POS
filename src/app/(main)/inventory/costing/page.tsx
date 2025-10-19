"use client";

import React, { useMemo, useState } from "react";
import {
  Coins, Calculator, Layers, Filter, Search, Factory, Warehouse, Download,
  ChevronLeft, ChevronRight, X, CheckCircle2, Info
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
type UID = string;
type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Category = "Raw" | "Semi-Prep" | "Finished" | "Packaging" | "Beverage" | "Other";
type Location = "Main Store" | "Kitchen" | "Bar" | "Cold Room" | "Freezer";
type CostMethod = "WMA" | "FIFO" | "LIFO";

type Lot = {
  id: UID;
  qty: number;
  uom: UOM;
  unitCost: number; // purchase/production unit cost
  location: Location;
  createdAt: string; // receipt date
};

type Item = {
  id: UID;
  name: string;
  sku: string;
  category: Category;
  uom: UOM;
  lots: Lot[];         // positive quantities only in this demo
  committed?: number;  // allocated to orders
};

/* ────────────────────────────────────────────────────────────────────────────
 * Mock Data
 * ──────────────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const prevDays = (n:number) => new Date(Date.now()-n*86400000).toISOString();

const ITEMS: Item[] = [
  {
    id: uid(),
    name: "Mozzarella (block)",
    sku: "RM-MOZZ-001",
    category: "Raw",
    uom: "kg",
    committed: 4,
    lots: [
      { id: uid(), qty: 5,   uom: "kg", unitCost: 6.7, location: "Cold Room", createdAt: prevDays(10) },
      { id: uid(), qty: 3.5, uom: "kg", unitCost: 7.1, location: "Cold Room", createdAt: prevDays(6) },
      { id: uid(), qty: 4,   uom: "kg", unitCost: 6.8, location: "Freezer",   createdAt: prevDays(2) },
    ],
  },
  {
    id: uid(),
    name: "Olive Oil (EVOO)",
    sku: "RM-OLIV-003",
    category: "Raw",
    uom: "L",
    committed: 4,
    lots: [
      { id: uid(), qty: 12,  uom: "L", unitCost: 5.8, location: "Main Store", createdAt: prevDays(25) },
      { id: uid(), qty: 10,  uom: "L", unitCost: 6.1, location: "Kitchen",    createdAt: prevDays(9) },
    ],
  },
  {
    id: uid(),
    name: "Romaine Lettuce",
    sku: "RM-LETT-001",
    category: "Raw",
    uom: "kg",
    committed: 1.5,
    lots: [
      { id: uid(), qty: 2.2, uom: "kg", unitCost: 3.0, location: "Kitchen", createdAt: prevDays(1) },
      { id: uid(), qty: 3.0, uom: "kg", unitCost: 2.8, location: "Kitchen", createdAt: prevDays(1) },
    ],
  },
  {
    id: uid(),
    name: "Takeaway Box M",
    sku: "PK-BOX-M",
    category: "Packaging",
    uom: "pcs",
    committed: 60,
    lots: [
      { id: uid(), qty: 420, uom: "pcs", unitCost: 0.18, location: "Main Store", createdAt: prevDays(12) },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Costing helpers
 * ──────────────────────────────────────────────────────────────────────────── */
function sumQty(item: Item) { return item.lots.reduce((s, l) => s + l.qty, 0); }
function wmaCost(item: Item) {
  const q = sumQty(item);
  if (!q) return { unit: 0, value: 0 };
  const value = item.lots.reduce((s, l) => s + l.qty*l.unitCost, 0);
  return { unit: value / q, value };
}
function fifoValue(item: Item) {
  // already a snapshot with only receipts; value = Σ lot.qty * lot.cost from oldest first
  const sorted = [...item.lots].sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const value = sorted.reduce((s,l)=> s + l.qty*l.unitCost, 0);
  const unit = sumQty(item) ? value / sumQty(item) : 0;
  return { unit, value, layers: sorted };
}
function lifoValue(item: Item) {
  const sorted = [...item.lots].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const value = sorted.reduce((s,l)=> s + l.qty*l.unitCost, 0);
  const unit = sumQty(item) ? value / sumQty(item) : 0;
  return { unit, value, layers: sorted };
}

const money = (n: number, d = 2) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/* ────────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────────── */
export default function InventoryCostingPage() {
  const [method, setMethod] = useState<CostMethod>("WMA");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [loc, setLoc] = useState<Location | "All">("All");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ open: boolean; item?: Item | null }>({ open: false, item: null });
  const [revalue, setRevalue] = useState<{ open: boolean; item?: Item | null }>({ open: false });

  const pageSize = 8;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ITEMS.filter((it) => {
      const txt = !t || it.name.toLowerCase().includes(t) || it.sku.toLowerCase().includes(t);
      const c = cat === "All" || it.category === cat;
      const locationMatch = loc === "All" || it.lots.some((l) => l.location === loc);
      return txt && c && locationMatch;
    });
  }, [q, cat, loc]);

  const compute = (it: Item) => {
    if (method === "WMA") return { ...wmaCost(it), layers: it.lots };
    if (method === "FIFO") return fifoValue(it);
    return lifoValue(it);
  };

  const valuation = useMemo(() => {
    return filtered.reduce(
      (acc, it) => {
        const { value } = compute(it);
        const qty = sumQty(it);
        acc.totalQty += qty;
        acc.totalValue += value;
        // group by category
        acc.byCategory[it.category] = (acc.byCategory[it.category] || 0) + value;
        // group by location (sum per lot)
        it.lots.forEach((l) => {
          acc.byLocation[l.location] = (acc.byLocation[l.location] || 0) + l.qty * l.unitCost;
        });
        return acc;
      },
      { totalQty: 0, totalValue: 0, byCategory: {} as Record<string, number>, byLocation: {} as Record<string, number> }
    );
  }, [filtered, method]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const exportCSV = () => {
    const cols = ["Name","SKU","Category","UOM","Qty","Unit Cost ("+method+")","Valuation","Committed","Available"];
    const rows = filtered.map(it => {
      const { unit, value } = compute(it);
      const qty = sumQty(it);
      const committed = it.committed ?? 0;
      const available = Math.max(0, qty - committed);
      return [it.name, it.sku, it.category, it.uom, qty, unit.toFixed(4), value.toFixed(2), committed, available];
    });
    const csv = [cols.join(","), ...rows.map(r => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `inventory_costing_${method}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Inventory</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Costing</h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Valuation by <b>{method}</b> · brand-light TitanPOS UI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
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
                {["All","Raw","Semi-Prep","Finished","Packaging","Beverage","Other"].map((c)=> <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <Warehouse className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={loc}
                onChange={(e) => { setLoc(e.target.value as any); setPage(1); }}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All","Main Store","Kitchen","Bar","Cold Room","Freezer"].map((l)=> <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-1">
              {(["WMA","FIFO","LIFO"] as CostMethod[]).map(m => (
                <button
                  key={m}
                  onClick={()=>setMethod(m)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${method===m ? "bg-orange-50 text-orange-700" : "text-gray-700"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <CardStat icon={<Coins className="h-5 w-5 text-gray-500" />} label="Total Valuation" value={`$ ${money(valuation.totalValue)}`} />
          <CardStat icon={<Calculator className="h-5 w-5 text-gray-500" />} label="Total Qty" value={money(valuation.totalQty,3)} />
          <CardStat icon={<Info className="h-5 w-5 text-gray-500" />} label="Method" value={method} />
        </div>

        {/* Breakdown */}
        <div className="grid gap-3 md:grid-cols-2">
          <Breakdown title="By Category" data={valuation.byCategory} />
          <Breakdown title="By Location" data={valuation.byLocation} />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Committed</th>
                <th className="text-right">Available</th>
                <th className="text-right">Unit Cost ({method})</th>
                <th className="text-right">Valuation</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((it) => {
                const qty = sumQty(it);
                const { unit, value } = compute(it);
                const committed = it.committed ?? 0;
                const available = Math.max(0, qty - committed);
                return (
                  <tr key={it.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td className="font-semibold text-gray-900">{it.name}</td>
                    <td className="text-gray-700">{it.sku}</td>
                    <td className="text-gray-700">{it.category}</td>
                    <td className="text-right">{money(qty,3)} {it.uom}</td>
                    <td className="text-right">{money(committed,3)} {it.uom}</td>
                    <td className="text-right">{money(available,3)} {it.uom}</td>
                    <td className="text-right">$ {money(unit,4)}</td>
                    <td className="text-right font-semibold">$ {money(value)}</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setDrawer({ open: true, item: it })}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="View cost layers"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRevalue({ open: true, item: it })}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Revaluation (demo)"
                        >
                          <Calculator className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-sm text-gray-500">No items found…</td>
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
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page>=pages}
                onClick={() => setPage((p) => Math.min(pages, p+1))}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Costing
        </p>
      </div>

      {/* ───────────────────────── Layers Drawer ───────────────────────── */}
      {drawer.open && drawer.item && (
        <LayersDrawer
          item={drawer.item}
          method={method}
          onClose={() => setDrawer({ open: false, item: null })}
        />
      )}

      {/* ───────────────────────── Revaluation Modal (demo) ───────────────────────── */}
      {revalue.open && revalue.item && (
        <RevalueModal
          item={revalue.item}
          method={method}
          onClose={() => setRevalue({ open: false })}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Small UI bits
 * ──────────────────────────────────────────────────────────────────────────── */
function CardStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-xl ring-1 ring-white/60">
      {icon}
      <div>
        <div className="text-xs font-semibold text-gray-600">{label}</div>
        <div className="text-lg font-extrabold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a,b)=> b[1]-a[1]);
  return (
    <div className="rounded-3xl border border-gray-200 bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60">
      <div className="mb-2 text-sm font-bold text-gray-900">{title}</div>
      {entries.length === 0 ? (
        <div className="grid h-28 place-items-center rounded-xl border border-dashed border-gray-200 bg-white/60 text-xs text-gray-500">No data</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([k,v]) => (
            <li key={k} className="flex items-center justify-between">
              <span className="text-gray-700">{k}</span>
              <span className="font-semibold text-gray-900">$ {money(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Drawers / Modals
 * ──────────────────────────────────────────────────────────────────────────── */
function LayersDrawer({ item, method, onClose }: { item: Item; method: CostMethod; onClose: () => void }) {
  // derive layers order based on method (for display only)
  const layers = useMemo(() => {
    const base = [...item.lots];
    if (method === "FIFO") base.sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (method === "LIFO") base.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return base;
  }, [item, method]);

  const qty = sumQty(item);
  const total = layers.reduce((s,l)=> s + l.qty*l.unitCost, 0);
  const unit = qty ? total/qty : 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">Cost Layers — {item.name} ({method})</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <CardStat icon={<Coins className="h-4 w-4 text-gray-500" />} label="Qty" value={`${money(qty,3)} ${item.uom}`} />
            <CardStat icon={<Calculator className="h-4 w-4 text-gray-500" />} label="Unit Cost" value={`$ ${money(unit,4)}`} />
            <CardStat icon={<Layers className="h-4 w-4 text-gray-500" />} label="Valuation" value={`$ ${money(total)}`} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="[&>th]:py-2.5 [&>th]:px-3">
                  <th>Receipt Date</th><th>Location</th><th className="text-right">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Layer Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {layers.map((l) => (
                  <tr key={l.id} className="[&>td]:px-3 [&>td]:py-2.5">
                    <td className="text-gray-700">{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td className="text-gray-700">{l.location}</td>
                    <td className="text-right">{money(l.qty,3)} {l.uom}</td>
                    <td className="text-right">$ {money(l.unitCost,4)}</td>
                    <td className="text-right font-semibold">$ {money(l.qty*l.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Display order follows <b>{method}</b>. In production, issues (COGS) consume layers by method; receipts create new layers.
          </p>
        </div>
      </div>
    </div>
  );
}

function RevalueModal({ item, method, onClose }: { item: Item; method: CostMethod; onClose: () => void }) {
  const qty = sumQty(item);
  const [newUnit, setNewUnit] = useState<number>(Number((item.lots.reduce((s,l)=> s + l.qty*l.unitCost, 0) / Math.max(1, qty)).toFixed(4)));

  const apply = () => {
    // Demo: just alert; in production, create revaluation journal adjusting inventory + COGS/Expense
    const delta = (newUnit - (item.lots.reduce((s,l)=> s + l.qty*l.unitCost, 0) / Math.max(1, qty))) * qty;
    alert(`Revaluation demo\nItem: ${item.sku}\nMethod: ${method}\nNew unit cost: $${newUnit.toFixed(4)}\nInventory value delta: $${money(delta)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Revaluation — {item.name}</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div className="text-sm text-gray-700">Qty on hand: <b>{money(qty,3)} {item.uom}</b></div>
          <div>
            <label className="text-xs text-gray-600">New Unit Cost</label>
            <input
              type="number"
              value={newUnit}
              onChange={(e)=> setNewUnit(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
            />
          </div>
          <div className="text-xs text-gray-500">
            This is a demo UI. Posting should create an accounting revaluation entry and optionally reprice pending production.
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={apply}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Post Revaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}