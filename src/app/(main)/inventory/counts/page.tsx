"use client";

import React, { useMemo, useState } from "react";
import {
  ClipboardCheck, Plus, Search, Filter, Warehouse, Upload, Download, CheckCircle2,
  QrCode, X, ChevronLeft, ChevronRight, AlertTriangle, Calculator, Percent
} from "lucide-react";

/* ============================================================================
 * Types
 * ========================================================================== */
type UID = string;
type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Location = "Main Store" | "Kitchen" | "Bar" | "Cold Room" | "Freezer";

type CountLine = {
  id: UID;
  name: string;
  sku: string;
  uom: UOM;
  location: Location;
  onHandSys: number;   // system quantity before count
  avgCost: number;     // valuation cost
  barcode?: string;
  counted?: number;    // user-entered
  note?: string;
};

type CountSession = {
  id: UID;
  name: string;        // e.g., “Week 36 — Kitchen”
  location: Location | "All";
  createdAt: string;
  status: "Draft" | "Posted";
  lines: CountLine[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n: number, d = 2) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/* ============================================================================
 * Mock data
 * ========================================================================== */
const SEED_LINES: CountLine[] = [
  { id: uid(), name: "Mozzarella (block)", sku: "RM-MOZZ-001", uom: "kg", location: "Cold Room", onHandSys: 12.5, avgCost: 6.85, barcode: "930000000111" },
  { id: uid(), name: "Olive Oil (EVOO)", sku: "RM-OLIV-003", uom: "L",  location: "Kitchen",   onHandSys: 22,   avgCost: 5.95, barcode: "930000000222" },
  { id: uid(), name: "Romaine Lettuce",   sku: "RM-LETT-001", uom: "kg", location: "Kitchen",   onHandSys: 5.2,  avgCost: 2.9,  barcode: "930000000333" },
  { id: uid(), name: "Takeaway Box M",    sku: "PK-BOX-M",    uom: "pcs",location: "Main Store",onHandSys: 420,  avgCost: 0.18, barcode: "930000000444" },
];

const SESSIONS: CountSession[] = [
  { id: uid(), name: "Week 35 — Main Store", location: "Main Store", createdAt: iso(-7), status: "Posted", lines: SEED_LINES.slice(0,2) },
  { id: uid(), name: "Week 36 — Kitchen",    location: "Kitchen",    createdAt: iso(-1), status: "Draft",  lines: SEED_LINES },
];

function iso(deltaDays = 0) { const d = new Date(Date.now() + deltaDays*86400000); return d.toISOString(); }
const LOCATIONS: Location[] = ["Main Store", "Kitchen", "Bar", "Cold Room", "Freezer"];

/* ============================================================================
 * Page
 * ========================================================================== */
export default function InventoryCountsPage() {
  const [sessions, setSessions] = useState<CountSession[]>(SESSIONS);
  const [activeId, setActiveId] = useState<string>(sessions[1]?.id || sessions[0]?.id || "");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<Location | "All">("All");
  const [status, setStatus] = useState<"all" | "notcounted" | "varianceOnly">("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [modals, setModals] = useState<{start?: boolean; review?: boolean; import?: boolean}>({});

  const active = sessions.find(s => s.id === activeId) || null;

  const filtered = useMemo(() => {
    if (!active) return [];
    const t = q.trim().toLowerCase();
    return active.lines.filter(l => {
      const txt = !t || l.name.toLowerCase().includes(t) || l.sku.toLowerCase().includes(t) || l.barcode?.includes(t);
      const locationOk = active.location === "All"
        ? (loc === "All" || l.location === loc)
        : (loc === "All" ? l.location === active.location : l.location === loc);
      const diff = (l.counted ?? NaN) - l.onHandSys;
      const st =
        status === "all" ||
        (status === "notcounted" && (l.counted === undefined || l.counted === null)) ||
        (status === "varianceOnly" && !Number.isNaN(diff) && Math.abs(diff) > 0);
      return txt && locationOk && st;
    });
  }, [active, q, loc, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const progress = useMemo(() => {
    if (!active) return { done: 0, total: 0, pct: 0 };
    const total = active.lines.length;
    const done = active.lines.filter(l => typeof l.counted === "number").length;
    const pct = total ? Math.round((done/total)*100) : 0;
    return { done, total, pct };
  }, [active]);

  const totals = useMemo(() => {
    if (!active) return { varianceQty: 0, varianceValue: 0 };
    return active.lines.reduce((acc, l) => {
      if (typeof l.counted !== "number") return acc;
      const diff = l.counted - l.onHandSys;
      return {
        varianceQty: acc.varianceQty + diff,
        varianceValue: acc.varianceValue + diff * l.avgCost,
      };
    }, { varianceQty: 0, varianceValue: 0 });
  }, [active]);

  const setCount = (id: string, qty: number) => {
    if (!active) return;
    const updated = {...active, lines: active.lines.map(l => l.id === id ? {...l, counted: qty} : l)};
    setSessions(arr => arr.map(s => s.id === active.id ? updated : s));
  };

  const setNote = (id: string, note: string) => {
    if (!active) return;
    const updated = {...active, lines: active.lines.map(l => l.id === id ? {...l, note} : l)};
    setSessions(arr => arr.map(s => s.id === active.id ? updated : s));
  };

  const scanBarcode = (code: string) => {
    if (!active) return;
    const line = active.lines.find(l => l.barcode === code || l.sku === code);
    if (!line) return alert("Item not found for code: " + code);
    // focus behavior would require a ref; here we just +1 for demo
    const qty = (line.counted ?? 0) + 1;
    setCount(line.id, Number(qty.toFixed(3)));
  };

  const startNewSession = (payload: { name: string; location: Location | "All" }) => {
    const s: CountSession = {
      id: uid(),
      name: payload.name,
      location: payload.location,
      createdAt: new Date().toISOString(),
      status: "Draft",
      lines: SEED_LINES.filter(l => payload.location === "All" ? true : l.location === payload.location).map(l => ({...l})),
    };
    setSessions([s, ...sessions]);
    setActiveId(s.id);
    setModals({});
  };

  const postSession = () => {
    if (!active) return;
    // In production: send to backend; create inventory adjustments for variance lines only.
    const updated = {...active, status: "Posted"};
    setSessions((arr:any) => arr.map((s:any) => s.id === active.id ? updated : s));
    setModals({});
    alert("Count posted (demo). Variances applied.");
  };

  const exportCSV = () => {
    if (!active) return;
    const cols = ["Name","SKU","Location","UOM","OnHand(Sys)","Counted","Variance","AvgCost","ValueVariance","Note"];
    const rows = active.lines.map(l => {
      const diff = (l.counted ?? l.onHandSys) - l.onHandSys;
      return [
        l.name, l.sku, l.location, l.uom, l.onHandSys, l.counted ?? "", diff.toFixed(3),
        l.avgCost.toFixed(2), (diff*l.avgCost).toFixed(2), l.note || ""
      ];
    });
    const csv = [cols.join(","), ...rows.map(r=>r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `${active.name.replace(/\s+/g,"_")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar: Sessions */}
        <aside className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Inventory Counts</h2>
          </div>

          <button
            onClick={() => setModals(m => ({...m, start: true}))}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Count
          </button>

          <div className="space-y-2">
            {sessions.map(s => {
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left ${isActive ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">{s.name}</div>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status==="Posted" ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{new Date(s.createdAt).toLocaleString()} · {s.location}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-4">
          {!active ? (
            <div className="grid h-[70vh] place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              Create a count to begin…
            </div>
          ) : (
            <>
              {/* Header / Progress */}
              <div className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Session</div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{active.name}</h1>
                    <div className="mt-1 text-xs text-gray-600">
                      Location: <b>{active.location}</b> · Created: {new Date(active.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportCSV}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <button
                      onClick={() => setModals(m => ({...m, import: true}))}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4" /> Import
                    </button>
                    <button
                      disabled={active.status==="Posted"}
                      onClick={() => setModals(m => ({...m, review: true}))}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Review & Post
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>{progress.done}/{progress.total} · {progress.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: `${progress.pct}%` }} />
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Mini label="Lines" value={`${active.lines.length}`} />
                  <Mini label="Qty Variance (sum)" value={`${totals.varianceQty.toFixed(3)}`} />
                  <Mini label="Value Variance" value={`$ ${money(totals.varianceValue)}`} />
                </div>
              </div>

              {/* Filters & Quick Scan */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setPage(1); }}
                      placeholder="Search name, SKU, barcode…"
                      className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={loc}
                      onChange={(e) => { setLoc(e.target.value as any); setPage(1); }}
                      className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
                    >
                      {["All", ...LOCATIONS].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
                    className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All lines</option>
                    <option value="notcounted">Not counted</option>
                    <option value="varianceOnly">With variance</option>
                  </select>
                </div>

                {/* Quick scan (demo increments count when you press Enter) */}
                <QuickScan onScan={(code) => scanBarcode(code)} />
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-white text-left text-gray-500">
                    <tr className="[&>th]:py-3 [&>th]:px-3">
                      <th>Item</th>
                      <th>SKU</th>
                      <th>Location</th>
                      <th>UOM</th>
                      <th className="text-right">OnHand (Sys)</th>
                      <th className="text-right">Counted</th>
                      <th className="text-right">Variance</th>
                      <th className="text-right">Avg Cost</th>
                      <th className="text-right">Value Δ</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageItems.map((l) => {
                      const counted = typeof l.counted === "number" ? l.counted : undefined;
                      const diff = typeof counted === "number" ? counted - l.onHandSys : undefined;
                      const valueDelta = typeof diff === "number" ? diff * l.avgCost : undefined;
                      const warn = typeof diff === "number" && Math.abs(diff) > Math.max(5, l.onHandSys * 0.5);
                      return (
                        <tr key={l.id} className="[&>td]:px-3 [&>td]:py-3">
                          <td className="font-semibold text-gray-900">{l.name}</td>
                          <td className="text-gray-700">{l.sku}</td>
                          <td className="text-gray-700">{l.location}</td>
                          <td className="text-gray-700">{l.uom}</td>
                          <td className="text-right">{l.onHandSys}</td>
                          <td className="text-right">
                            <input
                              type="number"
                              value={counted ?? ""}
                              onChange={(e) => setCount(l.id, Number(e.target.value))}
                              className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
                              placeholder="—"
                            />
                          </td>
                          <td className={`text-right font-semibold ${diff===undefined ? "text-gray-500" : diff===0 ? "text-gray-700" : diff>0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {diff===undefined ? "—" : diff.toFixed(3)}
                          </td>
                          <td className="text-right">$ {money(l.avgCost)}</td>
                          <td className={`text-right font-semibold ${valueDelta===undefined ? "text-gray-500" : valueDelta>=0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {valueDelta===undefined ? "—" : `$ ${money(valueDelta)}`}
                          </td>
                          <td>
                            <input
                              value={l.note || ""}
                              onChange={(e) => setNote(l.id, e.target.value)}
                              placeholder="optional"
                              className="w-40 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-14 text-center text-sm text-gray-500">No lines found…</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                  <div className="text-gray-600">Page {page} / {pages} · {filtered.length} line(s)</div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page<=1}
                      onClick={() => setPage(p => Math.max(1, p-1))}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={page>=pages}
                      onClick={() => setPage(p => Math.min(pages, p+1))}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="pb-4 text-center text-xs text-gray-500">
                © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Inventory Counts
              </p>
            </>
          )}
        </main>
      </div>

      {/* ───────────────────────── Start Count ───────────────────────── */}
      {modals.start && (
        <StartCountModal
          onClose={() => setModals(m => ({...m, start:false}))}
          onStart={(payload) => startNewSession(payload)}
        />
      )}

      {/* ───────────────────────── Review & Post ───────────────────────── */}
      {modals.review && active && (
        <ReviewModal
          session={active}
          onClose={() => setModals(m => ({...m, review:false}))}
          onPost={postSession}
        />
      )}

      {/* ───────────────────────── Import (CSV demo) ───────────────────────── */}
      {modals.import && active && (
        <ImportModal
          onClose={() => setModals(m => ({...m, import:false}))}
          onImport={(rows) => {
            // Expect columns: SKU, Counted, Note
            const merge = {...active};
            rows.forEach(r => {
              const sku = String(r.SKU || r.sku || "").trim();
              const line = merge.lines.find(l => l.sku === sku);
              if (line) {
                if (r.Counted !== undefined) line.counted = Number(r.Counted);
                if (r.Note !== undefined) line.note = String(r.Note);
              }
            });
            setSessions(arr => arr.map(s => s.id === active.id ? merge : s));
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * Small UI bits
 * ========================================================================== */
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

/* QuickScan: input field that triggers on Enter (simulate barcode) */
function QuickScan({ onScan }: { onScan: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <QrCode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { onScan(code.trim()); setCode(""); } }}
          placeholder="Scan / type barcode or SKU, Enter…"
          className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * Modals
 * ========================================================================== */
function StartCountModal({ onClose, onStart }: { onClose: () => void; onStart: (p:{name:string; location: Location | "All"}) => void }) {
  const [name, setName] = useState<string>(`Cycle Count — ${new Date().toLocaleDateString()}`);
  const [loc, setLoc] = useState<Location | "All">("All");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">New Count</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
          </div>
          <div className="relative">
            <Warehouse className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select value={loc} onChange={(e)=>setLoc(e.target.value as any)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2">
              {["All","Main Store","Kitchen","Bar","Cold Room","Freezer"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={()=>onStart({ name, location: loc })}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ session, onClose, onPost }: { session: CountSession; onClose: () => void; onPost: () => void }) {
  const varianceLines = session.lines.filter(l => typeof l.counted === "number" && Math.abs((l.counted as number) - l.onHandSys) > 0);
  const sumQty = varianceLines.reduce((s,l)=> s + ((l.counted as number) - l.onHandSys), 0);
  const sumVal = varianceLines.reduce((s,l)=> s + (((l.counted as number) - l.onHandSys) * l.avgCost), 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Review Variances — {session.name}</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-auto p-4">
          {varianceLines.length === 0 ? (
            <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No variances — ready to post.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="[&>th]:py-2 [&>th]:px-2">
                  <th>Item</th><th>SKU</th><th className="text-right">Sys</th><th className="text-right">Count</th><th className="text-right">Δ</th><th className="text-right">Avg Cost</th><th className="text-right">Value Δ</th><th>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {varianceLines.map(l => {
                  const diff = (l.counted as number) - l.onHandSys;
                  return (
                    <tr key={l.id} className="[&>td]:px-2 [&>td]:py-2">
                      <td className="font-semibold text-gray-900">{l.name}</td>
                      <td className="text-gray-700">{l.sku}</td>
                      <td className="text-right">{l.onHandSys}</td>
                      <td className="text-right">{(l.counted as number).toFixed(3)}</td>
                      <td className={`text-right font-semibold ${diff>0?"text-emerald-700":"text-rose-700"}`}>{diff.toFixed(3)}</td>
                      <td className="text-right">$ {money(l.avgCost)}</td>
                      <td className={`text-right font-semibold ${diff*l.avgCost>=0?"text-emerald-700":"text-rose-700"}`}>$ {money(diff*l.avgCost)}</td>
                      <td className="text-xs text-gray-700">{l.note || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <div className="text-gray-700">Totals: Qty Δ <b>{sumQty.toFixed(3)}</b> · Value Δ <b>$ {money(sumVal)}</b></div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={onPost}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Post Count
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportModal({
  onClose, onImport
}: {
  onClose: () => void;
  onImport: (rows: any[]) => void;
}) {
  const [text, setText] = useState<string>("SKU,Counted,Note\nRM-MOZZ-001,12.000,ok\nRM-LETT-001,5.700,trim");
  const parseCSV = (csv: string) => {
    const [hdr, ...lines] = csv.split(/\r?\n/).filter(Boolean);
    const heads = hdr.split(",").map(h=>h.trim());
    return lines.map(line => {
      const cells = line.split(",");
      const row: any = {};
      heads.forEach((h, i) => row[h] = cells[i]);
      if (row.Counted !== undefined) row.Counted = Number(row.Counted);
      return row;
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Import Counts (CSV)</div>
          <button className="rounded-lg p-1 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-gray-600">Paste CSV with columns <b>SKU, Counted, Note</b>.</p>
          <textarea
            rows={8}
            value={text}
            onChange={(e)=>setText(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={()=>{ onImport(parseCSV(text)); onClose(); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              Apply Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}