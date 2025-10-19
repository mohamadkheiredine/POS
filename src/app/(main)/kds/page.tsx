"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat, Timer, AlarmClock, Pause, Play, RotateCcw, CheckCircle2, BellRing, Search, Filter,
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types & Mock
 * ───────────────────────────────────────── */
type Station = "Grill" | "Salad" | "Bar" | "Dessert" | "Expo";
type ItemStatus = "new" | "working" | "ready" | "hold";

type KdsItem = {
  id: string;
  name: string;
  qty: number;
  notes?: string;
  status: ItemStatus;
  // Optional: route to sub-station (e.g., salad within expo)
  route?: Station;
};

type KdsTicket = {
  id: string;           // order id / chit id
  table?: string;       // T12 or Takeaway #190
  channel: "Dine-in" | "Takeaway" | "Delivery";
  covers?: number;
  station: Station;
  createdAt: number;    // epoch ms
  items: KdsItem[];
  hold?: boolean;
  priority?: "std" | "rush";
};

const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: KdsTicket[] = [
  {
    id: "A1024",
    table: "T7",
    channel: "Dine-in",
    covers: 3,
    station: "Grill",
    createdAt: Date.now() - 1000 * 60 * 7,
    priority: "std",
    items: [
      { id: uid(), name: "Chicken Shawarma", qty: 2, status: "new", notes: "extra pickles" },
      { id: uid(), name: "Beef Skewers", qty: 1, status: "new" },
    ],
  },
  {
    id: "A1026",
    table: "T11",
    channel: "Dine-in",
    covers: 2,
    station: "Salad",
    createdAt: Date.now() - 1000 * 60 * 2,
    priority: "rush",
    items: [
      { id: uid(), name: "Caesar Salad", qty: 2, status: "new", notes: "1 no croutons" },
    ],
  },
  {
    id: "TK-191",
    table: "Take #191",
    channel: "Takeaway",
    station: "Bar",
    createdAt: Date.now() - 1000 * 60 * 12,
    items: [
      { id: uid(), name: "Mango Juice", qty: 2, status: "working" },
      { id: uid(), name: "Lemon Mint", qty: 1, status: "new" },
    ],
  },
  {
    id: "A1027",
    table: "T3",
    channel: "Dine-in",
    covers: 4,
    station: "Grill",
    createdAt: Date.now() - 1000 * 60 * 15,
    items: [
      { id: uid(), name: "Margherita Pizza", qty: 2, status: "working" },
      { id: uid(), name: "Pepperoni Pizza", qty: 1, status: "new" },
    ],
  },
];

const STATIONS: Station[] = ["Grill", "Salad", "Bar", "Dessert", "Expo"];

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */
const elapsedMin = (ms: number) => Math.max(0, Math.floor((Date.now() - ms) / 60000));
function slaTone(minutes: number, station: Station) {
  // Simple SLA heuristics per station
  const thresholds: Record<Station, { warn: number; danger: number }> = {
    Grill: { warn: 10, danger: 18 },
    Salad: { warn: 6, danger: 10 },
    Bar: { warn: 5, danger: 9 },
    Dessert: { warn: 8, danger: 14 },
    Expo: { warn: 3, danger: 6 },
  };
  const t = thresholds[station];
  if (minutes >= t.danger) return "danger";
  if (minutes >= t.warn) return "warn";
  return "ok";
}

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function KdsPage() {
  const [station, setStation] = useState<Station>("Grill");
  const [tickets, setTickets] = useState<KdsTicket[]>(MOCK);
  const [query, setQuery] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const bellRef = useRef<HTMLAudioElement | null>(null);

  // Simulate new ticket ping
  useEffect(() => {
    const t = setInterval(() => {
      // 1/12 chance to simulate new ticket per 10s
      if (Math.random() < 0.083) {
        const newT: KdsTicket = {
          id: `N-${uid().slice(0, 4).toUpperCase()}`,
          table: Math.random() < 0.6 ? `T${Math.floor(Math.random() * 14) + 1}` : "Take #"+(100+Math.floor(Math.random()*50)),
          channel: Math.random() < 0.7 ? "Dine-in" : "Takeaway",
          station,
          createdAt: Date.now(),
          items: [{ id: uid(), name: "Chef Special", qty: 1, status: "new" }],
        };
        setTickets((p) => [newT, ...p]);
        if (soundOn) bellRef.current?.play().catch(() => {});
      }
    }, 10000);
    return () => clearInterval(t);
  }, [station, soundOn]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        t.station === station &&
        (!q || t.id.toLowerCase().includes(q) || t.table?.toLowerCase().includes(q))
    );
  }, [tickets, station, query]);

  const columns = useMemo(() => {
    const col = { new: [] as KdsTicket[], working: [] as KdsTicket[], ready: [] as KdsTicket[] };
    for (const t of filtered) {
      const hasWorking = t.items.some((i) => i.status === "working");
      const allReady = t.items.every((i) => i.status === "ready");
      if (allReady) col.ready.push(t);
      else if (hasWorking) col.working.push(t);
      else col.new.push(t);
    }
    return col;
  }, [filtered]);

  /* ───────── actions ───────── */
  const setItemStatus = (ticketId: string, itemId: string, status: ItemStatus) =>
    setTickets((p) =>
      p.map((t) =>
        t.id !== ticketId
          ? t
          : { ...t, items: t.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
      )
    );

  const setAllStatus = (ticketId: string, status: ItemStatus) =>
    setTickets((p) =>
      p.map((t) =>
        t.id !== ticketId ? t : { ...t, items: t.items.map((i) => ({ ...i, status })) }
      )
    );

  const toggleHold = (ticketId: string) =>
    setTickets((p) => p.map((t) => (t.id === ticketId ? { ...t, hold: !t.hold } : t)));

  const recallTicket = (ticketId: string) =>
    setTickets((p) =>
      p.map((t) =>
        t.id === ticketId ? { ...t, items: t.items.map((i) => ({ ...i, status: "working" })) } : t
      )
    );

  const clearReady = (ticketId: string) =>
    setTickets((p) => p.filter((t) => t.id !== ticketId));

  /* ───────── UI helpers ───────── */
  const laneCls =
    "min-h-[60vh] rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-3";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <audio ref={bellRef} src="https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3" preload="auto" />
      <div className="mx-auto w-full max-w-7xl space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-gray-600" />
            <h1 className="text-2xl font-extrabold text-gray-900">Kitchen Board</h1>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              {station}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticket/table…"
                className="w-56 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={station}
                onChange={(e) => setStation(e.target.value as Station)}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {STATIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                soundOn ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-800"
              }`}
              title="Toggle sound on new tickets"
            >
              <BellRing className="h-4 w-4" />
              {soundOn ? "Sound On" : "Sound Off"}
            </button>
          </div>
        </div>

        {/* Lanes */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* New */}
          <div className={laneCls}>
            <LaneHeader title="New" count={columns.new.length} color="bg-amber-100 text-amber-800" />
            <div className="mt-2 space-y-3">
              {columns.new.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onItem={(id, st) => setItemStatus(t.id, id, st)}
                  onAll={(st) => setAllStatus(t.id, st)}
                  onHold={() => toggleHold(t.id)}
                />
              ))}
              {columns.new.length === 0 && <EmptyHint text="No new tickets" />}
            </div>
          </div>

          {/* Working */}
          <div className={laneCls}>
            <LaneHeader title="In Progress" count={columns.working.length} color="bg-blue-100 text-blue-800" />
            <div className="mt-2 space-y-3">
              {columns.working.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onItem={(id, st) => setItemStatus(t.id, id, st)}
                  onAll={(st) => setAllStatus(t.id, st)}
                  onHold={() => toggleHold(t.id)}
                />
              ))}
              {columns.working.length === 0 && <EmptyHint text="Nothing cooking" />}
            </div>
          </div>

          {/* Ready / Expo */}
          <div className={laneCls}>
            <LaneHeader title="Ready" count={columns.ready.length} color="bg-emerald-100 text-emerald-800" />
            <div className="mt-2 space-y-3">
              {columns.ready.map((t) => (
                <ReadyCard
                  key={t.id}
                  t={t}
                  onRecall={() => recallTicket(t.id)}
                  onClear={() => clearReady(t.id)}
                />
              ))}
              {columns.ready.length === 0 && <EmptyHint text="No plates up" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Components
 * ───────────────────────────────────────── */
function LaneHeader({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{count}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid h-32 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-xs text-gray-500">
      {text}
    </div>
  );
}

function TicketCard({
  t,
  onItem,
  onAll,
  onHold,
}: {
  t: KdsTicket;
  onItem: (itemId: string, status: ItemStatus) => void;
  onAll: (status: ItemStatus) => void;
  onHold: () => void;
}) {
  const mins = elapsedMin(t.createdAt);
  const tone = slaTone(mins, t.station);
  const toneCls =
    tone === "danger"
      ? "bg-red-100 text-red-800 ring-red-200"
      : tone === "warn"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-emerald-100 text-emerald-800 ring-emerald-200";

  const totalItems = t.items.reduce((s, i) => s + i.qty, 0);
  const done = t.items.every((i) => i.status === "ready");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white ring-1 ring-white/60">
      {/* head */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.priority === "rush" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>
            {t.priority === "rush" ? "RUSH" : t.channel}
          </span>
          <div className="text-sm font-bold text-gray-900">#{t.id}</div>
          {t.table && <div className="text-xs text-gray-600">· {t.table}</div>}
          {t.covers ? <div className="text-xs text-gray-600">· {t.covers} pax</div> : null}
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneCls}`}>
          <Timer className="h-3.5 w-3.5" /> {mins}m
        </div>
      </div>

      {/* body items */}
      <div className="divide-y divide-gray-100">
        {t.items.map((it) => (
          <div key={it.id} className="flex items-start justify-between px-3 py-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{it.qty}× {it.name}</span>
                {it.route && (
                  <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {it.route}
                  </span>
                )}
                {it.status === "hold" && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    HOLD
                  </span>
                )}
              </div>
              {it.notes && <div className="text-xs text-gray-500">“{it.notes}”</div>}
            </div>

            <div className="flex items-center gap-1">
              {it.status !== "working" && it.status !== "ready" && (
                <button
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => onItem(it.id, "working")}
                  title="Start"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}
              {it.status !== "hold" && it.status !== "ready" && (
                <button
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => onItem(it.id, "hold")}
                  title="Hold"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
              )}
              {it.status !== "ready" && (
                <button
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                  onClick={() => onItem(it.id, "ready")}
                  title="Mark ready"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="text-[11px] text-gray-600">
          {t.items.filter((i) => i.status === "ready").length} / {t.items.length} items · {totalItems} total
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
            onClick={onHold}
            title="Toggle hold ticket"
          >
            {t.hold ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Pause className="h-3.5 w-3.5" /> Held
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Pause className="h-3.5 w-3.5" /> Hold
              </span>
            )}
          </button>
          <button
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
            onClick={() => onAll("working")}
            title="Fire all"
          >
            <Play className="h-3.5 w-3.5" /> Fire All
          </button>
          <button
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            onClick={() => onAll("ready")}
            disabled={done}
            title="Mark all ready"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> All Ready
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadyCard({
  t,
  onRecall,
  onClear,
}: {
  t: KdsTicket;
  onRecall: () => void;
  onClear: () => void;
}) {
  const mins = elapsedMin(t.createdAt);
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 ring-1 ring-emerald-100">
      <div className="flex items-center justify-between border-b border-emerald-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-emerald-900">#{t.id}</div>
          {t.table && <div className="text-xs text-emerald-800">· {t.table}</div>}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <AlarmClock className="h-3.5 w-3.5" /> {mins}m
        </div>
      </div>
      <ul className="divide-y divide-emerald-100">
        {t.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold text-emerald-900">{i.qty}× {i.name}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2 border-t border-emerald-100 px-3 py-2">
        <button
          onClick={onRecall}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
          title="Recall to working"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Recall
        </button>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
          title="Clear from screen"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}