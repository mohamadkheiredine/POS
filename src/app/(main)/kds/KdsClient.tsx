"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat,
  Timer,
  Pause,
  CheckCircle2,
  BellRing,
  Search,
  Filter,
} from "lucide-react";
import axios from "axios";
import { useI18n } from "@/hooks/useI18n";
import { api } from "@/lib/api";
import { forceLogout } from "@/lib/logout";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */

type KdsItem = {
  id: string; // oi_id
  name: string; // mi_item_name
  qty: number; // oi_quantity
  notes?: string; // oi_notes
  station: number; // oi_station_id
  statusId: number; // oi_kitchen_status (fk -> sys_status.ss_id)
  statusTitle: string; // sys_status.ss_status_title
};

type KdsTicket = {
  id: number; // fo_id
  orderCode: string;
  orderDate: string;
  table?: string;
  channel: "Dine-in" | "Takeaway" | "Delivery";
  createdAt: number;
  items: KdsItem[];
  hold?: boolean;
};

type StatusColumn = {
  id: number; // ss_id
  title: string; // ss_status_title
  tickets: KdsTicket[]; // tickets that have items in this status
};

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */

const elapsedMin = (ms: number) =>
  Math.max(0, Math.floor((Date.now() - ms) / 60000));

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */

export default function KdsClient({ lang }: { lang: "en" | "fr" }) {
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [query, setQuery] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const bellRef = useRef<HTMLAudioElement | null>(null);

  const [station, setStation] = useState<number>(0); // 0 = all kitchens
  const [stations, setStations] = useState<any[]>([]);
  const [gHash, setGHash] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const { t } = useI18n(lang);

  useEffect(() => {
    const storedHash = localStorage.getItem("g_hash") || "";
    const storedUser = localStorage.getItem("user_id") || "";

    setGHash(storedHash);
    setUserId(storedUser);
  }, []);

  // For drag & drop: which item is being dragged
  const [dragItem, setDragItem] = useState<{
    ticketId: number;
    itemId: string;
  } | null>(null);

  // ───────── Load kitchen stations ─────────
  useEffect(() => {
    async function loadStations() {
      try {
        const g_hash = localStorage.getItem("g_hash");
        const user_id = localStorage.getItem("user_id");

        const url = `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/getstationsname`;
        const res = await api.get(url, { params: { g_hash, user_id } });

        if (!res.data.is_error) {
          setStations(res.data.lst_kitchens || []);
          // 0 = All Kitchens
          setStation(0);
        } else {
          console.warn("Error loading stations:", res.data.error_msg);
        }
      } catch (err) {
        console.error("Failed to load stations", err);
      }
    }

    loadStations();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      forceLogout("You are not logged in. Please login.");
    }
  }, []);

  // ───────── Load pending orders ─────────
  useEffect(() => {
    async function loadPendingOrders() {
      try {
        const g_hash = localStorage.getItem("g_hash");
        const user_id = localStorage.getItem("user_id");

        const url = `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/getpendingorders`;
        const res = await api.get(url, { params: { g_hash, user_id } });

        if (res.data.is_error) return;

        const orders = res.data.lst_pending_orders || [];

        const mappedTickets: KdsTicket[] = orders.map((o: any) => ({
          id: o.fo_id,
          orderCode: o.fo_order_code,
          orderDate: o.fo_created_at,

          table: o.fo_table_id ? `T${o.fo_table_id}` : undefined,
          channel:
            o.fo_order_type === "dine_in"
              ? "Dine-in"
              : o.fo_order_type === "takeaway"
              ? "Takeaway"
              : "Delivery",
          createdAt: Date.now(),
          items: (o.items || []).map((i: any) => ({
            id: String(i.oi_id),
            name: i.mi_item_name,
            qty: Number(i.oi_quantity),
            notes: i.oi_notes,
            station: Number(i.oi_station_id),
            statusId: Number(i.oi_kitchen_status),
            statusTitle: i.ss_status_title || "Pending",
          })),
        }));

        setTickets(mappedTickets);
      } catch (err) {
        console.error("Failed to load pending orders", err);
      }
    }

    loadPendingOrders();
  }, []);

  // ───────── Build list of statuses present for selected kitchen ─────────
  const statusList = useMemo(() => {
    const map = new Map<number, string>();

    tickets.forEach((t) => {
      t.items.forEach((i) => {
        if (station !== 0 && i.station !== station) return;
        if (!map.has(i.statusId)) {
          map.set(i.statusId, i.statusTitle || `Status ${i.statusId}`);
        }
      });
    });

    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [tickets, station]);

  const columns = useMemo(() => {
    const map = new Map<number, { title: string; tickets: KdsTicket[] }>();

    tickets.forEach((ticket) => {
      ticket.items.forEach((item) => {
        // Filter by selected kitchen
        if (station !== 0 && item.station !== station) return;

        if (!map.has(item.statusId)) {
          map.set(item.statusId, {
            title: item.statusTitle || `Status ${item.statusId}`,
            tickets: [],
          });
        }

        const col = map.get(item.statusId)!;

        if (!col.tickets.includes(ticket)) {
          col.tickets.push(ticket);
        }
      });
    });

    return Array.from(map.entries()).map(([id, col]) => ({
      id,
      title: col.title,
      tickets: col.tickets,
    }));
  }, [tickets, station]);

  /* ───────── actions ───────── */

  const toggleHold = (ticketId: number) =>
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, hold: !t.hold } : t))
    );

  // Move item to another status (local + API)
  const moveItemToStatus = async (
    ticketId: number,
    itemId: string,
    newStatusId: number,
    newStatusTitle: string
  ) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          items: t.items.map((it) =>
            it.id === itemId
              ? { ...it, statusId: newStatusId, statusTitle: newStatusTitle }
              : it
          ),
        };
      })
    );

    try {
      const url = `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/updatekitchenstatus`;
      if (!gHash || !userId) {
        console.error("Missing g_hash or user_id");
        return;
      }
      await api.post(url, {
        g_hash: gHash,
        user_id: userId,
        oi_id: itemId,
        oi_kitchen_status: newStatusId,
      });
    } catch (err) {
      console.error("Failed to update kitchen status", err);
    }
  };

  const laneCls =
    "min-h-[60vh] rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-3";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <audio
        ref={bellRef}
        src="https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3"
        preload="auto"
      />
      <div className="mx-auto w-full max-w-7xl space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-gray-600" />
            <h1 className="text-2xl font-extrabold text-gray-900">
              {t.kds.kitchenBoard}
            </h1>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              {station === 0
                ? "All Kitchens"
                : stations.find((s) => Number(s.ks_id) === station)?.ks_name}
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
                onChange={(e) => setStation(Number(e.target.value))}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                <option value={0}>{t.kds.allKitchens}</option>
                {stations.map((s: any) => (
                  <option key={s.ks_id} value={s.ks_id}>
                    {s.ks_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                soundOn
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-white text-gray-800"
              }`}
              title="Toggle sound on new tickets"
            >
              <BellRing className="h-4 w-4" />
              {soundOn ? "Sound On" : "Sound Off"}
            </button>
          </div>
        </div>

        {/* Columns per status */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div
              key={col.id}
              className={laneCls}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragItem) return;
                moveItemToStatus(
                  dragItem.ticketId,
                  dragItem.itemId,
                  col.id,
                  col.title
                );
                setDragItem(null);
              }}
            >
              <LaneHeader
                title={col.title}
                count={col.tickets.length}
                color="bg-amber-100 text-amber-800"
              />

              <div className="mt-2 space-y-3">
                {col.tickets.map((t) => (
                  <TicketCard
                    key={`${t.id}-${col.title}`}
                    t={t}
                    onHold={() => toggleHold(t.id)}
                    onItemDragStart={(itemId) =>
                      setDragItem({ ticketId: t.id, itemId })
                    }
                  />
                ))}

                {col.tickets.length === 0 && (
                  <EmptyHint text="No items in this status" />
                )}
              </div>
            </div>
          ))}
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
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
        {count}
      </span>
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
  onHold,
  onItemDragStart,
}: {
  t: KdsTicket;
  onHold: () => void;
  onItemDragStart: (itemId: string) => void;
}) {
  const mins = elapsedMin(t.createdAt);

  const toneCls =
    mins >= 20
      ? "bg-red-100 text-red-800 ring-red-200"
      : mins >= 10
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-emerald-100 text-emerald-800 ring-emerald-200";

  const totalItems = t.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white ring-1 ring-white/60">
      {/* head */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
            {t.channel}
          </span>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-gray-900">
              {t.orderCode}
            </span>
            <span className="text-[10px] text-gray-500">
              {new Date(t.orderDate).toLocaleString()}
            </span>
          </div>

          {t.table && <div className="text-xs text-gray-600">· {t.table}</div>}
        </div>

        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneCls}`}
        >
          <Timer className="h-3.5 w-3.5" /> {mins}m
        </div>
      </div>

      {/* body items */}
      <div className="divide-y divide-gray-100">
        {t.items.map((it) => (
          <div
            key={it.id}
            className="flex items-start justify-between px-3 py-2"
            draggable
            onDragStart={() => onItemDragStart(it.id)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {it.qty}× {it.name}
                </span>
              </div>
              {it.notes && (
                <div className="text-xs text-gray-500">“{it.notes}”</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="text-[11px] text-gray-600">
          {t.items.length} items · {totalItems} total
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
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}
