"use client";

import React, { useMemo, useState } from "react";
import {
  ChefHat, Filter, Search, Clock, Play, Pause, Square, CheckCircle2, Scale,
  Plus, Minus, Printer, Users, AlertTriangle, BadgePercent, Trash2
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type Station = "Cold" | "Hot" | "Pastry" | "Bar";
type UOM = "kg" | "g" | "L" | "ml" | "pcs" | "tray" | "batch";

type PrepTaskStatus = "pending" | "running" | "paused" | "done";

type PrepItem = {
  id: string;
  name: string;
  station: Station;
  par: number;           // target par (same UOM as uom)
  onHand: number;        // current stock (same UOM)
  uom: UOM;
  batchSize: number;     // default yield per batch in uom
  estMins: number;       // ETA minutes for one batch
  allergens?: string[];
  recipe?: Array<{ name: string; qty: number; uom: UOM }>;
};

type PrepTask = {
  id: string;
  itemId: string;
  status: PrepTaskStatus;
  assigned?: string;
  targetQty: number;     // planned output qty/uom
  producedQty: number;   // actual produced qty/uom
  startedAt?: number;
  notes?: string;
  timer?: { seconds: number }; // simple countdown/up timer store
  labels?: { count: number; date: string } | null;
  wasteQty?: number;
};

/* ─────────────────────────────────────────
 * Mock Data
 * ───────────────────────────────────────── */
const PREP_ITEMS: PrepItem[] = [
  {
    id: "pesto",
    name: "Basil Pesto",
    station: "Cold",
    par: 5,
    onHand: 1.5,
    uom: "kg",
    batchSize: 1,
    estMins: 20,
    allergens: ["nuts", "dairy"],
    recipe: [
      { name: "Basil", qty: 0.4, uom: "kg" },
      { name: "Olive Oil", qty: 0.35, uom: "L" },
      { name: "Parmesan", qty: 0.15, uom: "kg" },
      { name: "Pine Nuts", qty: 0.08, uom: "kg" },
      { name: "Garlic", qty: 0.02, uom: "kg" },
    ],
  },
  {
    id: "garlic-sauce",
    name: "Garlic Sauce",
    station: "Cold",
    par: 8,
    onHand: 2.5,
    uom: "kg",
    batchSize: 2,
    estMins: 25,
    allergens: ["egg"],
    recipe: [
      { name: "Garlic", qty: 0.4, uom: "kg" },
      { name: "Oil", qty: 1.4, uom: "L" },
      { name: "Lemon", qty: 0.15, uom: "L" },
      { name: "Egg whites", qty: 0.2, uom: "kg" },
    ],
  },
  {
    id: "shawarma-marinade",
    name: "Shawarma Marinade",
    station: "Hot",
    par: 12,
    onHand: 3,
    uom: "L",
    batchSize: 3,
    estMins: 30,
    recipe: [
      { name: "Yogurt", qty: 1, uom: "L" },
      { name: "Spice Blend", qty: 0.1, uom: "kg" },
      { name: "Vinegar", qty: 0.1, uom: "L" },
      { name: "Garlic", qty: 0.1, uom: "kg" },
    ],
  },
  {
    id: "cheesecake-batter",
    name: "Cheesecake Batter",
    station: "Pastry",
    par: 10,
    onHand: 4,
    uom: "kg",
    batchSize: 2.5,
    estMins: 35,
    allergens: ["dairy", "egg", "gluten"],
    recipe: [
      { name: "Cream Cheese", qty: 1.2, uom: "kg" },
      { name: "Sugar", qty: 0.4, uom: "kg" },
      { name: "Eggs", qty: 0.3, uom: "kg" },
      { name: "Flour", qty: 0.2, uom: "kg" },
      { name: "Vanilla", qty: 0.02, uom: "kg" },
    ],
  },
  {
    id: "simple-syrup",
    name: "Simple Syrup 1:1",
    station: "Bar",
    par: 9,
    onHand: 1,
    uom: "L",
    batchSize: 3,
    estMins: 15,
    recipe: [
      { name: "Sugar", qty: 1.5, uom: "kg" },
      { name: "Water", qty: 1.5, uom: "L" },
    ],
  },
];

// Suggested tasks from par gaps:
const SUGGESTED_TASKS: PrepTask[] = PREP_ITEMS.map((it) => {
  const need = Math.max(0, it.par - it.onHand);
  const batches = Math.ceil(need / it.batchSize);
  const targetQty = Math.max(it.batchSize, batches * it.batchSize);
  return {
    id: `task-${it.id}`,
    itemId: it.id,
    status: "pending",
    targetQty,
    producedQty: 0,
    notes: "",
    labels: { count: Math.max(1, Math.round(targetQty)), date: new Date().toISOString().slice(0, 10) },
  };
});

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */
const fmt = (n: number) =>
  (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });

function useTicker(run: boolean) {
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [run]);
  return tick;
}

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function PrepPage() {
  const [station, setStation] = useState<Station | "All">("All");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<PrepTask[]>(SUGGESTED_TASKS);
  const [assignees] = useState(["A. Haddad", "M. Karam", "L. Saad", "H. Nassar"]);
  const pulse = useTicker(true); // re-render seconds for timers

  const itemsById = useMemo(() => {
    const map: Record<string, PrepItem> = {};
    PREP_ITEMS.forEach((i) => (map[i.id] = i));
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const it = itemsById[t.itemId];
      const byStation = station === "All" || it.station === station;
      const byText =
        !q || it.name.toLowerCase().includes(q) || it.station.toLowerCase().includes(q);
      return byStation && byText;
    });
  }, [tasks, station, query, itemsById]);

  const totals = useMemo(() => {
    let eta = 0, running = 0, pending = 0, done = 0;
    for (const t of filtered) {
      const it = itemsById[t.itemId];
      if (t.status === "pending") pending++;
      if (t.status === "running" || t.status === "paused") running++;
      if (t.status === "done") done++;
      eta += it.estMins * Math.max(1, Math.round(t.targetQty / it.batchSize));
    }
    return { eta, running, pending, done };
  }, [filtered, itemsById]);

  const changeQty = (taskId: string, delta: number) =>
    setTasks((p) =>
      p.map((t) =>
        t.id !== taskId
          ? t
          : { ...t, targetQty: Math.max(0, Math.round((t.targetQty + delta) * 100) / 100) }
      )
    );

  const startTask = (taskId: string) =>
    setTasks((p) =>
      p.map((t) =>
        t.id !== taskId ? t : { ...t, status: "running", startedAt: Date.now(), timer: { seconds: 0 } }
      )
    );

  const pauseTask = (taskId: string) =>
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: "paused" } : t)));

  const stopTask = (taskId: string) =>
    setTasks((p) =>
      p.map((t) => (t.id === taskId ? { ...t, status: "pending", startedAt: undefined, timer: undefined } : t))
    );

  const completeTask = (taskId: string) =>
    setTasks((p) =>
      p.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "done",
              producedQty: t.targetQty,
              timer: undefined,
            }
          : t
      )
    );

  const setAssign = (taskId: string, who: string) =>
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, assigned: who } : t)));

  const setProduced = (taskId: string, qty: number) =>
    setTasks((p) =>
      p.map((t) => (t.id === taskId ? { ...t, producedQty: Math.max(0, qty) } : t))
    );

  const setWaste = (taskId: string, qty: number) =>
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, wasteQty: Math.max(0, qty) } : t)));

  const removeTask = (taskId: string) =>
    setTasks((p) => p.filter((t) => t.id !== taskId));

  const printLabels = (it: PrepItem, task: PrepTask) => {
    const data = {
      item: it.name,
      date: new Date().toLocaleDateString(),
      uom: it.uom,
      labels: task.labels?.count || 1,
      allergens: it.allergens || [],
    };
    console.log("PRINT LABELS", data);
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Kitchen Prep</h1>
            <p className="text-sm text-gray-600">Par-driven prep list, batches & labels</p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
            TitanPOS · Prep Board
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Station filter */}
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={station}
                onChange={(e) => setStation(e.target.value as Station | "All")}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", "Cold", "Hot", "Pastry", "Bar"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search item…"
                className="w-64 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-gray-50 px-3 py-1 font-semibold text-gray-700">
              Pending {totals.pending}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              Running {totals.running}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Done {totals.done}
            </span>
            <span className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-700">
              ETA {fmt(totals.eta)} mins
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => {
            const it = itemsById[task.itemId];
            const batches = Math.max(1, Math.round(task.targetQty / it.batchSize));
            const deficit = Math.max(0, it.par - it.onHand);
            const isLow = it.onHand < it.par;

            return (
              <div
                key={task.id}
                className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-gray-400" />
                      <h3 className="truncate text-lg font-bold text-gray-900">{it.name}</h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 font-semibold">{it.station}</span>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">
                        Par {fmt(it.par)} {it.uom}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 ${isLow ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                        On hand {fmt(it.onHand)} {it.uom}
                      </span>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">Batch {fmt(it.batchSize)} {it.uom}</span>
                      {it.allergens?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> {it.allergens.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Status pill */}
                  <StatusPill status={task.status} />
                </div>

                {/* Quantity / Batches */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Target Qty</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => changeQty(task.id, -it.batchSize)}
                        className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={task.targetQty}
                        onChange={(e) =>
                          setTasks((p) =>
                            p.map((t) =>
                              t.id === task.id
                                ? { ...t, targetQty: Math.max(0, Number(e.target.value) || 0) }
                                : t
                            )
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <button
                        onClick={() => changeQty(task.id, +it.batchSize)}
                        className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{batches} batch(es) · {fmt(it.batchSize)} {it.uom}/batch</div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Suggested</div>
                    <div className="mt-1">
                      <div className="text-lg font-extrabold text-gray-900">
                        {fmt(Math.max(it.batchSize, Math.ceil(deficit / it.batchSize) * it.batchSize))} {it.uom}
                      </div>
                      <div className="text-xs text-gray-600">to hit par ({fmt(deficit)} {it.uom} deficit)</div>
                    </div>
                  </div>
                </div>

                {/* Recipe (collapsible) */}
                {it.recipe && (
                  <details className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 open:bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                        <Scale className="h-4 w-4" /> Recipe (per batch)
                      </span>
                      <BadgePercent className="h-4 w-4 text-gray-400" />
                    </summary>
                    <ul className="mt-2 divide-y divide-gray-100 text-sm">
                      {it.recipe.map((r, idx) => (
                        <li key={idx} className="flex items-center justify-between py-1.5">
                          <span className="text-gray-700">{r.name}</span>
                          <span className="font-semibold text-gray-900">
                            {fmt(r.qty * batches)} {r.uom}
                            <span className="ml-1 text-xs text-gray-500">({fmt(r.qty)} {r.uom}/batch)</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Assign / Timer / Actions */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {/* Assign */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Assign</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <select
                        value={task.assigned || ""}
                        onChange={(e) => setAssign(task.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Timer</span>
                      <span className="text-[11px] text-gray-500">{PREP_ITEMS.find(x => x.id===task.itemId)?.estMins}m est</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-700">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTimer(task)}
                      </div>
                      <div className="flex items-center gap-1">
                        {task.status !== "running" && (
                          <button
                            onClick={() => startTask(task.id)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                            title="Start"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {task.status === "running" && (
                          <button
                            onClick={() => pauseTask(task.id)}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                            title="Pause"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(task.status === "running" || task.status === "paused") && (
                          <button
                            onClick={() => stopTask(task.id)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                            title="Stop/Reset"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Labels</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setTasks((p) =>
                              p.map((t) =>
                                t.id === task.id
                                  ? { ...t, labels: { ...(t.labels || { count: 1, date: new Date().toISOString().slice(0,10) }), count: Math.max(1, (t.labels?.count || 1) - 1) } }
                                  : t
                              )
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">
                          {task.labels?.count ?? 1}
                        </span>
                        <button
                          onClick={() =>
                            setTasks((p) =>
                              p.map((t) =>
                                t.id === task.id
                                  ? { ...t, labels: { ...(t.labels || { count: 1, date: new Date().toISOString().slice(0,10) }), count: (t.labels?.count || 1) + 1 } }
                                  : t
                              )
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => printLabels(it, task)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" /> Print
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output & Waste */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Produced</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={task.producedQty}
                        onChange={(e) => setProduced(task.id, Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <span className="text-xs text-gray-600">{itemsById[task.itemId].uom}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Waste</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={task.wasteQty || 0}
                        onChange={(e) => setWaste(task.id, Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <span className="text-xs text-gray-600">{itemsById[task.itemId].uom}</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-end gap-2">
                    <button
                      onClick={() => completeTask(task.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark Done
                    </button>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50/60 to-emerald-50/60 p-5 ring-1 ring-white">
          <p className="text-sm text-gray-700">
            Tip: use the **Recipe** section to see scaled ingredients by batches. “Mark Done” updates produced qty for your
            inventory sync (wire to your API).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Components
 * ───────────────────────────────────────── */
function StatusPill({ status }: { status: PrepTaskStatus }) {
  const map: Record<PrepTaskStatus, string> = {
    pending: "bg-gray-50 text-gray-700",
    running: "bg-blue-50 text-blue-700",
    paused: "bg-amber-50 text-amber-700",
    done: "bg-emerald-50 text-emerald-700",
  };
  const label: Record<PrepTaskStatus, string> = {
    pending: "Pending",
    running: "Running",
    paused: "Paused",
    done: "Done",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status]}`}>{label[status]}</span>
  );
}

function formatTimer(task: PrepTask) {
  if (!task.startedAt || task.status === "pending") return "00:00";
  const base = Math.floor((Date.now() - task.startedAt) / 1000);
  const seconds = task.status === "paused" ? Math.max(0, base) : Math.max(0, base);
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}