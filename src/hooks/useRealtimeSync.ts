"use client";

import { useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { replaceAllSyncedOrders, LocalOrder } from "@/store/slices/ordersSlice";
import type { MenuItem } from "@/store/slices/menuSlice";

function normalizeModifierQty(qty: any, fallback = 1) {
  const n = Number(qty);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Connects to the WebSocket channel for the current store and listens
 * for OrderUpdated events. On each event (and once on mount), it syncs
 * orders from the server into Redux. Optionally refreshes tables too.
 *
 * When WebSocket is down, falls back to polling every 15 s.
 * The Redux reducer (replaceAllSyncedOrders) preserves local work:
 *   - tmp_ orders are never overwritten
 *   - orders with unsent items keep those items during merge
 *
 * Returns a `triggerSync` for pages to call after sendToKitchen / pay.
 */
export function useRealtimeSync(
  menu: MenuItem[],
  setTables?: (tables: any[]) => void,
  options: { floorId?: number | null } = {},
) {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth.loginData);
  const { g_hash, user_id, store_id } = auth;
  const { floorId } = options;

  const menuRef = useRef(menu);
  menuRef.current = menu;

  const setTablesRef = useRef(setTables);
  setTablesRef.current = setTables;

  const floorIdRef = useRef(floorId);
  floorIdRef.current = floorId;

  const authRef = useRef({ g_hash, user_id, store_id });
  authRef.current = { g_hash, user_id, store_id };

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // ── sync helpers (read from refs = always fresh) ────────

  const syncOrders = useCallback(async () => {
    const { g_hash, user_id, store_id } = authRef.current;
    if (!g_hash || !user_id || !store_id) {
      console.warn("[RealtimeSync] syncOrders skipped — missing auth:", { g_hash: !!g_hash, user_id, store_id });
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_LINK;
      console.log("[RealtimeSync] calling /api/orders/sync with store_id:", store_id);

      const res = await api.post(API_URL + "/api/orders/sync", {
        g_hash,
        user_id,
        store_id,
      });

      console.log("[RealtimeSync] sync response:", {
        is_error: res.data.is_error,
        orderCount: res.data.orders?.length ?? 0,
      });

      if (res.data.is_error) return;
      if (!res.data.orders || !Array.isArray(res.data.orders)) return;

      const currentMenu = menuRef.current;

      const loadedOrders: LocalOrder[] = res.data.orders.map((o: any) => ({
        orderId: String(o.order_id),
        tableIds: o.tables?.length ? o.tables : [0],
        items: (o.items ?? []).map((it: any) => {
          const menuItem = currentMenu.find((m) => m.id === it.item_id);
          const mods = (it.modifiers ?? []).map((m: any) => ({
            groupId: 1,
            optionId: Number(m.modifier_id),
            qty: normalizeModifierQty(m.quantity ?? m.qty ?? 1),
          }));

          // Calculate priceExtra from modifier prices returned by the API
          const priceExtra = (it.modifiers ?? []).reduce((sum: number, m: any) => {
            return sum + (Number(m.price) || 0) * normalizeModifierQty(m.quantity ?? m.qty ?? 1);
          }, 0);

          return {
            uid: Math.random().toString(36).slice(2, 9),
            itemId: it.item_id,
            name: menuItem?.name ?? "",
            qty: it.qty,
            basePrice: Number(it.unit_price),
            stationId: it.station_id ?? menuItem?.kitchen_station_id ?? 1,
            note: String(it.notes ?? "").trim(),
            modifiers: mods,
            priceExtra,
            sentToKitchen: true,
          };
        }),
        customer: {
          customer_id: o.customer?.customer_id ?? null,
          name: o.customer?.name ?? "",
          phone: o.customer?.phone ?? "",
          address: o.customer?.address ?? "",
        },
        checkoutDraft: false,
        isHeld: false,
      }));

      console.log("[RealtimeSync] dispatching orders:", loadedOrders.map(o => ({
        id: o.orderId,
        tables: o.tableIds,
        itemCount: o.items.length,
      })));

      dispatchRef.current(replaceAllSyncedOrders(loadedOrders));
    } catch (err) {
      console.warn("[RealtimeSync] orders sync failed:", err);
    }
  }, []);

  const syncTables = useCallback(async () => {
    const fn = setTablesRef.current;
    if (!fn) return;

    const { g_hash, user_id } = authRef.current;
    if (!g_hash || !user_id) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_LINK;
      const params: Record<string, any> = { g_hash, user_id };
      if (floorIdRef.current) params.floor_id = floorIdRef.current;

      const response = await api.get(
        API_URL + "/api/inventory/getlisttables",
        { params },
      );

      const data = response.data.lst_tables;
      fn(
        data.map((t: any) => ({
          id: t.ft_id,
          label: t.ft_label,
          numberSeats: t.ft_number_seats,
          statusId: t.ft_status_id ?? 0,
          floorId: t.ft_floor_id,
        })),
      );
    } catch (err) {
      console.warn("[RealtimeSync] tables sync failed:", err);
    }
  }, []);

  // ── Stable ref for the event handler ──────────────────────────

  const syncAllRef = useRef(() => {});
  syncAllRef.current = () => {
    syncOrders();
    syncTables();
  };

  // ── Polling helpers ──

  const POLL_INTERVAL_MS = 15_000;
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsConnectedRef = useRef(false);
  const pausedRef = useRef(false);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    console.log("[RealtimeSync] starting polling fallback every", POLL_INTERVAL_MS / 1000, "s");
    pollTimerRef.current = setInterval(() => {
      if (pausedRef.current) {
        console.log("[RealtimeSync] poll skipped — paused");
        return;
      }
      console.log("[RealtimeSync] poll tick");
      syncAllRef.current();
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (!pollTimerRef.current) return;
    console.log("[RealtimeSync] stopping polling (WebSocket connected)");
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  // ── WebSocket connection + polling fallback when WS is down ──

  useEffect(() => {
    if (!store_id) {
      console.log("[RealtimeSync] no store_id yet, skipping setup");
      return;
    }

    const echo = getEcho();

    // No Echo at all → poll only
    if (!echo) {
      console.log("[RealtimeSync] Echo unavailable — polling only");
      startPolling();
      return () => { stopPolling(); };
    }

    // Try to monitor Pusher connection state
    const pusher = (echo.connector as any).pusher as import("pusher-js").default | undefined;

    if (pusher) {
      const handleStateChange = (states: { previous: string; current: string }) => {
        console.log(`[RealtimeSync] Pusher state: ${states.previous} → ${states.current}`);
        if (states.current === "connected") {
          wsConnectedRef.current = true;
          stopPolling();
          syncAllRef.current(); // catch up on reconnect
        } else if (
          states.current === "unavailable" ||
          states.current === "failed" ||
          states.current === "disconnected"
        ) {
          wsConnectedRef.current = false;
          startPolling();
        }
      };

      pusher.connection.bind("state_change", handleStateChange);

      // Check current state
      const cur = pusher.connection.state;
      if (cur === "connected") {
        wsConnectedRef.current = true;
      } else if (cur === "unavailable" || cur === "failed" || cur === "disconnected") {
        wsConnectedRef.current = false;
        startPolling();
      }

      // Grace period: if still not connected after 5 s, start polling
      const graceTimer = setTimeout(() => {
        if (!wsConnectedRef.current) {
          console.log("[RealtimeSync] WS not connected after 5 s — starting polling");
          startPolling();
        }
      }, 5_000);

      console.log(`[RealtimeSync] subscribing to channel: store.${store_id}`);
      const channel = echo.channel(`store.${store_id}`);
      channel.listen(".OrderUpdated", (data: any) => {
        console.log("[RealtimeSync] OrderUpdated event received!", data);
        syncAllRef.current();
      });

      return () => {
        clearTimeout(graceTimer);
        stopPolling();
        pusher.connection.unbind("state_change", handleStateChange);
        console.log(`[RealtimeSync] leaving channel: store.${store_id}`);
        echo.leave(`store.${store_id}`);
      };
    }

    // Pusher object not accessible — WebSocket + polling as safety net
    console.log(`[RealtimeSync] subscribing to channel: store.${store_id} (polling as backup)`);
    const channel = echo.channel(`store.${store_id}`);
    channel.listen(".OrderUpdated", (data: any) => {
      console.log("[RealtimeSync] OrderUpdated event received!", data);
      syncAllRef.current();
    });
    startPolling();

    return () => {
      stopPolling();
      console.log(`[RealtimeSync] leaving channel: store.${store_id}`);
      echo.leave(`store.${store_id}`);
    };
  }, [store_id, startPolling, stopPolling]);

  // ── Initial sync when auth + menu are ready (runs once) ──

  const initialSyncDone = useRef(false);

  useEffect(() => {
    if (initialSyncDone.current) return;
    if (!g_hash || !user_id || !store_id || menu.length === 0) return;

    initialSyncDone.current = true;
    console.log("[RealtimeSync] initial sync starting");
    syncAllRef.current();
  }, [g_hash, user_id, store_id, menu.length, syncOrders]);

  // ── Pause / resume (called by pages) ──
  // When WS is connected: pause/resume are no-ops for polling (no polling runs).
  // When WS is down: pause stops poll ticks, resume restarts them.
  // resumePolling always syncs once so other browsers see the update.

  const pausePolling = useCallback(() => {
    if (wsConnectedRef.current) return; // WS handles it, no polling to pause
    console.log("[RealtimeSync] polling PAUSED by page");
    pausedRef.current = true;
  }, []);

  const resumePolling = useCallback(() => {
    if (wsConnectedRef.current) return; // WS handles it, no need to resume
    console.log("[RealtimeSync] polling RESUMED by page");
    pausedRef.current = false;
    // Sync immediately on resume to catch up
    syncAllRef.current();
  }, []);

  return { pausePolling, resumePolling };
}
