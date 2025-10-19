"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid, Plus, ZoomIn, ZoomOut, RefreshCw, Users, Timer, UtensilsCrossed,
  Square, Circle, SquareGanttChart, Split, Merge, MapPin, Filter, Trash2, Pencil, CheckCircle2
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UID = string;
type Shape = "round" | "square" | "rect";
type Status = "vacant" | "seated" | "reserved" | "dirty" | "bill";
type Zone = "Main Hall" | "Patio" | "Bar" | "VIP";

type Table = {
  id: UID;
  name: string;       // e.g., T1
  seats: number;      // capacity
  x: number;          // percent (0..100) within canvas
  y: number;          // percent (0..100)
  w: number;          // width in percent
  h: number;          // height in percent
  shape: Shape;
  zone: Zone;
  status: Status;
  server?: string;
  startedAt?: number; // seated start timestamp
  groupId?: UID;      // merged group id
};

/* ─────────────────────────────────────────
 * Mock
 * ───────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const SERVERS = ["A. Haddad", "M. Karam", "L. Saad", "H. Nassar"];

const SEED: Table[] = [
  { id: uid(), name: "T1", seats: 2, x: 10, y: 16, w: 8, h: 8, shape: "round", zone: "Main Hall", status: "vacant" },
  { id: uid(), name: "T2", seats: 4, x: 23, y: 14, w: 10, h: 8, shape: "square", zone: "Main Hall", status: "reserved" },
  { id: uid(), name: "T3", seats: 4, x: 38, y: 18, w: 14, h: 8, shape: "rect", zone: "Main Hall", status: "seated", startedAt: Date.now()-1000*60*18, server: "A. Haddad" },
  { id: uid(), name: "T4", seats: 6, x: 58, y: 20, w: 16, h: 8, shape: "rect", zone: "Main Hall", status: "dirty" },
  { id: uid(), name: "B1", seats: 2, x: 12, y: 58, w: 8, h: 8, shape: "round", zone: "Bar", status: "vacant" },
  { id: uid(), name: "P1", seats: 4, x: 32, y: 64, w: 10, h: 8, shape: "square", zone: "Patio", status: "seated", startedAt: Date.now()-1000*60*5, server: "M. Karam" },
  { id: uid(), name: "V1", seats: 8, x: 70, y: 60, w: 18, h: 10, shape: "rect", zone: "VIP", status: "bill", startedAt: Date.now()-1000*60*72, server: "L. Saad" },
];

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */
const statusPill: Record<Status, string> = {
  vacant: "bg-emerald-50 text-emerald-700 border-emerald-200",
  seated: "bg-blue-50 text-blue-700 border-blue-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
  dirty: "bg-rose-50 text-rose-700 border-rose-200",
  bill: "bg-purple-50 text-purple-700 border-purple-200",
};

const statusBg: Record<Status, string> = {
  vacant: "bg-emerald-100/70",
  seated: "bg-blue-100/70",
  reserved: "bg-amber-100/70",
  dirty: "bg-rose-100/70",
  bill: "bg-purple-100/70",
};

function elapsedMins(ms?: number) {
  if (!ms) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function FloorPage() {
  const [tables, setTables] = useState<Table[]>(SEED);
  const [zone, setZone] = useState<Zone | "All">("All");
  const [status, setStatus] = useState<Status | "All">("All");
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; table?: Table }>({ open: false });

  // Re-render every minute to update timers
  const [, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () =>
      tables.filter(
        (t) => (zone === "All" || t.zone === zone) && (status === "All" || t.status === status)
      ),
    [tables, zone, status]
  );

  const toggleSel = (id: string, multi = false) => {
    setSelected((s) => {
      if (multi) {
        return s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      }
      return s.includes(id) ? [] : [id];
    });
  };

  const updateTable = (id: string, patch: Partial<Table>) =>
    setTables((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const bulkUpdate = (patch: Partial<Table>) =>
    setTables((arr) => arr.map((t) => (selected.includes(t.id) ? { ...t, ...patch } : t)));

  const addTable = () => {
    const n: Table = {
      id: uid(),
      name: `T${tables.length + 1}`,
      seats: 2,
      x: 10,
      y: 10,
      w: 8,
      h: 8,
      shape: "round",
      zone: zone === "All" ? "Main Hall" as Zone : zone,
      status: "vacant",
    };
    setTables((p) => [n, ...p]);
  };

  const removeSelected = () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} table(s)?`)) return;
    setTables((p) => p.filter((t) => !selected.includes(t.id)));
    setSelected([]);
  };

  const mergeSelected = () => {
    if (selected.length < 2) return alert("Select 2+ tables to merge.");
    const gid = uid();
    setTables((arr) =>
      arr.map((t) => (selected.includes(t.id) ? { ...t, groupId: gid } : t))
    );
  };

  const splitSelected = () => {
    if (!selected.length) return;
    setTables((arr) => arr.map((t) => (selected.includes(t.id) ? { ...t, groupId: undefined } : t)));
  };

  const assignServer = (who: string) => {
    if (!selected.length) return;
    bulkUpdate({ server: who });
  };

  const setTableStatus = (st: Status) => {
    if (!selected.length) return;
    const patch: Partial<Table> = { status: st };
    // seat start timer
    if (st === "seated") patch.startedAt = Date.now();
    if (st !== "seated") patch.startedAt = undefined;
    bulkUpdate(patch);
  };

  // drag
  function onPointerDown(e: React.PointerEvent, t: Table) {
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = ((e.clientX - bounds.left) / bounds.width) * t.w;
    const cy = ((e.clientY - bounds.top) / bounds.height) * t.h;
    setDrag({ id: t.id, dx: cx, dy: cy });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent, t: Table) {
    if (!drag || drag.id !== t.id) return;
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const px = ((e.clientX - parent.left) / parent.width) * 100 - drag.dx;
    const py = ((e.clientY - parent.top) / parent.height) * 100 - drag.dy;
    const nx = Math.min(100 - t.w, Math.max(0, px));
    const ny = Math.min(100 - t.h, Math.max(0, py));
    updateTable(t.id, { x: nx, y: ny });
  }
  function onPointerUp(e: React.PointerEvent) {
    setDrag(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  const occupancy = useMemo(() => {
    const vis = filtered;
    const totalSeats = vis.reduce((s, t) => s + t.seats, 0);
    const satSeats = vis.filter(t => t.status === "seated" || t.status === "bill").reduce((s, t) => s + t.seats, 0);
    return { totalSeats, satSeats, pct: totalSeats ? Math.round((satSeats/totalSeats)*100) : 0 };
  }, [filtered]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Floor</h2>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600">Filters</div>
            <div className="grid gap-2">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value as Zone | "All")}
                  className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
                >
                  {["All","Main Hall","Patio","Bar","VIP"].map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
                >
                  {["All","vacant","seated","reserved","bill","dirty"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold text-gray-600">Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={addTable} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <Plus className="h-4 w-4" /> New
              </button>
              <button onClick={() => setScale((s)=>Math.min(2, s+0.1))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <ZoomIn className="h-4 w-4" /> Zoom
              </button>
              <button onClick={() => setScale((s)=>Math.max(0.6, s-0.1))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <ZoomOut className="h-4 w-4" /> Out
              </button>
              <button onClick={() => setScale(1)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <RefreshCw className="h-4 w-4" /> Reset
              </button>
              <button onClick={mergeSelected} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <Merge className="h-4 w-4" /> Merge
              </button>
              <button onClick={splitSelected} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <Split className="h-4 w-4" /> Split
              </button>
            </div>

            {/* Bulk status */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTableStatus("vacant")} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Vacant</button>
              <button onClick={() => setTableStatus("seated")} className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Seated</button>
              <button onClick={() => setTableStatus("reserved")} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Reserved</button>
              <button onClick={() => setTableStatus("bill")} className="rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">Bill</button>
              <button onClick={() => setTableStatus("dirty")} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Dirty</button>
              <button
                onClick={removeSelected}
                className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete
              </button>
            </div>

            {/* Assign server */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="mb-1 text-xs font-semibold text-gray-600">Assign Server</div>
              <select
                onChange={(e) => assignServer(e.target.value)}
                defaultValue=""
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="" disabled>Select…</option>
                {SERVERS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 text-xs">
              <div className="font-semibold text-gray-700">Occupancy</div>
              <div className="mt-1 text-gray-800">{occupancy.satSeats}/{occupancy.totalSeats} seats · {occupancy.pct}%</div>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="overflow-hidden rounded-3xl bg-white/60 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-bold text-gray-900">
                {zone === "All" ? "All Zones" : zone}
              </h3>
              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                {filtered.length} table(s)
              </span>
            </div>
            {selected.length > 0 && (
              <div className="text-xs text-gray-700">
                {selected.length} selected
              </div>
            )}
          </div>

          {/* Floor plan area */}
          <div
            className="relative h-[72vh] w-full overflow-hidden rounded-2xl border border-gray-200 bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"
          >
            <div
              className="absolute inset-0 origin-top-left transition-transform"
              style={{ transform: `scale(${scale})` }}
            >
              {/* Walls / decor (example zones) */}
              <div className="absolute left-[5%] top-[5%] h-[10%] w-[90%] rounded-xl bg-gradient-to-r from-emerald-50 to-amber-50 ring-1 ring-white/60" />
              <div className="absolute left-[5%] bottom-[5%] h-[12%] w-[30%] rounded-xl bg-gradient-to-r from-blue-50 to-white ring-1 ring-white/60" />
              <div className="absolute right-[6%] bottom-[8%] h-[18%] w-[28%] rounded-xl bg-gradient-to-r from-purple-50 to-white ring-1 ring-white/60" />

              {/* Tables */}
              {filtered.map((t) => (
                <div
                  key={t.id}
                  onPointerDown={(e) => onPointerDown(e, t)}
                  onPointerMove={(e) => onPointerMove(e, t)}
                  onPointerUp={onPointerUp}
                  onDoubleClick={() => setEditing({ open: true, table: t })}
                  onClick={(e) => toggleSel(t.id, e.shiftKey)}
                  className={`group absolute select-none ${statusBg[t.status]} ring-1 ring-white/60 shadow-sm hover:shadow transition`}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: `${t.w}%`,
                    height: `${t.h}%`,
                    borderRadius: t.shape === "round" ? "9999px" : "18px",
                  }}
                >
                  {/* Resize handles (visual only for now) */}
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-transparent group-hover:ring-gray-300/60" />

                  {/* Content */}
                  <div className="flex h-full flex-col items-center justify-center p-1">
                    <div className="flex items-center gap-1 text-xs">
                      {t.shape === "round" ? <Circle className="h-3.5 w-3.5 text-gray-500" /> : <Square className="h-3.5 w-3.5 text-gray-500" />}
                      <span className="font-bold text-gray-900">{t.name}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-700">{t.seats} seats</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                      border-transparent ${statusPill[t.status]}">
                      <span className="capitalize">{t.status}</span>
                    </div>
                    {t.status !== "vacant" && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gray-700">
                        <Timer className="h-3.5 w-3.5" /> {elapsedMins(t.startedAt)}m
                      </div>
                    )}
                    {t.server && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gray-600">
                        <Users className="h-3.5 w-3.5" /> {t.server}
                      </div>
                    )}
                    {t.groupId && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gray-600">
                        <SquareGanttChart className="h-3.5 w-3.5" /> Group
                      </div>
                    )}
                  </div>

                  {/* Quick actions on hover */}
                  <div className="pointer-events-none absolute inset-x-1 bottom-1 flex justify-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTable(t.id, { status: "seated", startedAt: t.startedAt ?? Date.now() }); }}
                      className="pointer-events-auto rounded-md bg-white/80 px-2 py-0.5 text-[10px] ring-1 ring-gray-200"
                    >
                      Seat
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTable(t.id, { status: "bill" }); }}
                      className="pointer-events-auto rounded-md bg-white/80 px-2 py-0.5 text-[10px] ring-1 ring-gray-200"
                    >
                      Bill
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTable(t.id, { status: "dirty", startedAt: undefined }); }}
                      className="pointer-events-auto rounded-md bg-white/80 px-2 py-0.5 text-[10px] ring-1 ring-gray-200"
                    >
                      Dirty
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTable(t.id, { status: "vacant", startedAt: undefined }); }}
                      className="pointer-events-auto rounded-md bg-white/80 px-2 py-0.5 text-[10px] ring-1 ring-gray-200"
                    >
                      Vacant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
            <span className="rounded-full bg-emerald-100/80 px-2 py-0.5">Vacant</span>
            <span className="rounded-full bg-blue-100/80 px-2 py-0.5">Seated</span>
            <span className="rounded-full bg-amber-100/80 px-2 py-0.5">Reserved</span>
            <span className="rounded-full bg-purple-100/80 px-2 py-0.5">Bill</span>
            <span className="rounded-full bg-rose-100/80 px-2 py-0.5">Dirty</span>
            <span className="ml-auto text-xs text-gray-500">Tip: Shift+Click to multi-select. Double-click a table to edit.</span>
          </div>
        </main>
      </div>

      {/* Edit Drawer */}
      {editing.open && editing.table && (
        <EditDrawer
          table={editing.table}
          onClose={() => setEditing({ open: false })}
          onSave={(patch) => {
            updateTable(editing.table!.id, patch);
            setEditing({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 * Edit Drawer
 * ───────────────────────────────────────── */
function EditDrawer({
  table,
  onClose,
  onSave,
}: {
  table: Table;
  onClose: () => void;
  onSave: (patch: Partial<Table>) => void;
}) {
  const [form, setForm] = useState<Partial<Table>>({
    name: table.name,
    seats: table.seats,
    shape: table.shape,
    zone: table.zone,
    status: table.status,
    server: table.server,
    w: table.w,
    h: table.h,
  });

  const set = (p: Partial<Table>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-gray-500" />
            <div className="font-bold">Edit {table.name}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">✕</button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-600">Label</label>
                <input value={form.name as string} onChange={(e)=>set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Seats</label>
                <input type="number" value={form.seats as number} onChange={(e)=>set({ seats: Number(e.target.value)||0 })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Shape</label>
                <select value={form.shape as Shape} onChange={(e)=>set({ shape: e.target.value as Shape })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="rect">Rectangle</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Zone</label>
                <select value={form.zone as Zone} onChange={(e)=>set({ zone: e.target.value as Zone })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {["Main Hall","Patio","Bar","VIP"].map((z)=> <option key={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <select value={form.status as Status} onChange={(e)=>set({ status: e.target.value as Status })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {["vacant","seated","reserved","bill","dirty"].map((s)=> <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Server</label>
                <input value={form.server || ""} onChange={(e)=>set({ server: e.target.value })} placeholder="optional" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Width (%)</label>
                <input type="number" value={form.w as number} onChange={(e)=>set({ w: Number(e.target.value)||1 })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Height (%)</label>
                <input type="number" value={form.h as number} onChange={(e)=>set({ h: Number(e.target.value)||1 })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
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