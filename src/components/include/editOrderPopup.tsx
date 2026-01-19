"use client";

import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { api } from "@/lib/api";

/* ================= TYPES ================= */

export type OrderItemUI = {
  itemId: number;
  itemName: string;
  stationId: number;
  qty: number;
  unit_price: number;
  notes?: string;
  modifiers: {
    modifier_id: number;
    name: string;
    price: number;
    quantity?: number;
  }[];
};

export type LoadOrderPayload = {
  orderId: number;
  orderCode: string;
  tableIds: number[];
  items: OrderItemUI[];
};

function normalizeTableIds(raw: any): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // numbers or strings or objects
    return raw
      .map((x) => {
        if (typeof x === "number") return x;
        if (typeof x === "string") return Number(x);
        if (typeof x === "object" && x)
          return Number(x.ft_id ?? x.id ?? x.table_id ?? 0);
        return 0;
      })
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof raw === "number") return raw > 0 ? [raw] : [];
  return [];
}

/* ================= COMPONENT ================= */

export default function LoadOrderPopup({
  open,
  onClose,
  onLoadOrder,
}: {
  open: boolean;
  onClose: () => void;
  onLoadOrder: (payload: LoadOrderPayload) => void;
}) {
  const [orderCode, setOrderCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const loadOrder = async () => {
    if (!orderCode.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/getbycode`,
        {
          params: {
            order_code: orderCode.trim(),
            g_hash: localStorage.getItem("g_hash"),
            user_id: localStorage.getItem("user_id"),
          },
        }
      );

      if (res.data?.is_error) {
        alert(res.data.error_msg || "Order not found");
        return;
      }

      const order = res.data.order;

      const items: OrderItemUI[] = order.items.map((it: any) => ({
        itemId: Number(it.item_id),
        itemName: it.item_name,
        stationId: Number(it.station_id),
        qty: Number(it.quantity),
        unit_price: Number(it.unit_price),
        notes: it.notes ?? "",
        modifiers: (it.modifiers ?? []).map((m: any) => ({
          modifier_id: Number(m.id),
          name: "",
          price: 0,
          quantity: 1,
        })),
      }));

      onLoadOrder({
        orderId: Number(order.order_id),
        orderCode: order.order_code,
        tableIds: normalizeTableIds(order.table_ids),

        items,
      });

      setOrderCode("");
      onClose();
    } catch {
      alert("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold">Load Order</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <input
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Enter order code"
            className="h-11 w-full rounded-xl border px-4 text-sm"
          />

          <button
            disabled={loading || !orderCode.trim()}
            onClick={loadOrder}
            className="flex h-11 w-full items-center justify-center gap-2
              rounded-xl bg-orange-600 text-sm font-semibold text-white
              hover:bg-orange-700 disabled:bg-orange-300"
          >
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : "Load Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
