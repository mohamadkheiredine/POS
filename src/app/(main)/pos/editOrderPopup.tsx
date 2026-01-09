"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus, Trash2, Send } from "lucide-react";
import { api } from "@/lib/api";

export type ModifierOption = {
  id: number;
  name: string;
  price: number;
};

export type ModifierGroup = {
  id: number;
  name: string;
  options: ModifierOption[];
};

export type OrderItemUI = {
  itemId: number;
  itemName: string;
  stationId: number;
  qty: number;
  unit_price: number;
  discount?: number;
  notes?: string;
  modifiers: {
    modifier_id: number;
    name: string;
    price: number;
    quantity?: number;
  }[];
};

type Props = {
  open: boolean;
  onClose: () => void;

  items: OrderItemUI[];
  onChangeItems: React.Dispatch<React.SetStateAction<OrderItemUI[]>>;

  availableModifierGroupsByItemId: Record<number, ModifierGroup[]>;

  onSave: (orderId: number, original: OrderItemUI[]) => Promise<void>;
  saving: boolean;
};

export default function EditOrderPopup({
  open,
  onClose,
  items,
  onChangeItems,
  availableModifierGroupsByItemId,
  onSave,
  saving,
}: Props) {
  const [orderCode, setOrderCode] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const [originalItems, setOriginalItems] = useState<OrderItemUI[]>([]);

  const localItems = items;

  const subtotal = useMemo(
    () => localItems.reduce((s, it) => s + it.qty * it.unit_price, 0),
    [localItems]
  );

  const updateItem = (
    itemId: number,
    stationId: number,
    patch: Partial<OrderItemUI>
  ) => {
    onChangeItems((prev) =>
      prev.map((it) =>
        it.itemId === itemId && it.stationId === stationId
          ? { ...it, ...patch }
          : it
      )
    );
  };

  const incQty = (itemId: number, stationId: number) =>
    onChangeItems((prev) =>
      prev.map((it) =>
        it.itemId === itemId && it.stationId === stationId
          ? { ...it, qty: it.qty + 1 }
          : it
      )
    );

  const decQty = (itemId: number, stationId: number) =>
    onChangeItems((prev) =>
      prev.map((it) =>
        it.itemId === itemId && it.stationId === stationId
          ? { ...it, qty: Math.max(0, it.qty - 1) }
          : it
      )
    );

  const removeItem = (itemId: number, stationId: number) =>
    onChangeItems((prev) =>
      prev.filter((it) => !(it.itemId === itemId && it.stationId === stationId))
    );

  const loadOrderByCode = async () => {
    if (!orderCode.trim()) return;

    setLoadingOrder(true);
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

      const dbOrder = res.data.order;

      const mapped: OrderItemUI[] = (dbOrder.items ?? []).map((it: any) => ({
        itemId: Number(it.item_id),
        itemName: it.item_name ?? `Item #${it.item_id}`,
        stationId: Number(it.station_id ?? 0),
        qty: Number(it.quantity ?? 0),
        unit_price: Number(it.unit_price ?? 0),
        notes: it.notes ?? "",
        modifiers: (it.modifiers ?? []).map((m: any) => ({
          modifier_id: Number(m.id),
          name: m.name ?? "",
          price: Number(m.price ?? 0),
          quantity: Number(m.quantity ?? 1),
        })),
      }));

      setOrderId(Number(dbOrder.order_id));
      setOriginalItems(JSON.parse(JSON.stringify(mapped)));
      onChangeItems(mapped);
    } catch (e) {
      alert("Failed to load order");
    } finally {
      setLoadingOrder(false);
    }
  };

  const resetPopup = () => {
    setOrderCode("");
    setOrderId(null);
    setOriginalItems([]);
    onChangeItems([]);
  };

  const toggleModifier = (
    item: OrderItemUI,
    option: {
      id: number;
      name: string;
      price: number;
    }
  ) => {
    onChangeItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== item.itemId || it.stationId !== item.stationId) {
          return it;
        }

        const exists = it.modifiers.some((m) => m.modifier_id === option.id);

        return {
          ...it,
          modifiers: exists
            ? // remove modifier
              it.modifiers.filter((m) => m.modifier_id !== option.id)
            : // add modifier
              [
                ...it.modifiers,
                {
                  modifier_id: option.id,
                  name: option.name,
                  price: option.price,
                  quantity: 1,
                },
              ],
        };
      })
    );
  };

  useEffect(() => {
    if (!open) return;

    setOrderCode("");
    setOrderId(null);
    setOriginalItems([]);
    onChangeItems([]);
  }, [open]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-lg font-bold">Edit Order</div>
          <button
            onClick={() => {
              resetPopup();
              onClose();
            }}
            className="rounded-xl p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              className="h-11 flex-1 rounded-xl border px-4 text-sm"
              placeholder="Enter order code"
            />

            <button
              type="button"
              onClick={loadOrderByCode}
              disabled={loadingOrder}
              className="
                h-11
                w-[140px]
                shrink-0
                rounded-xl
                bg-orange-600
                px-5
                text-sm
                font-semibold
                text-white
                hover:bg-orange-700
                disabled:bg-orange-300
                disabled:cursor-not-allowed
              "
            >
              {loadingOrder ? "Loading…" : "Load Order"}
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            {/* Items */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {localItems.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed text-sm text-gray-400">
                  Load an order to start editing
                </div>
              ) : (
                localItems.map((it) => {
                  const groups =
                    availableModifierGroupsByItemId?.[it.itemId] ?? [];

                  return (
                    <div
                      key={`${it.itemId}-${it.stationId}`}
                      className="rounded-2xl border p-4"
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold">{it.itemName}</div>
                          <div className="text-xs text-gray-500">
                            Item #{it.itemId} • Station {it.stationId}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.itemId, it.stationId)}
                          className="rounded-xl p-2 hover:bg-red-50"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-5 w-5 text-red-500" />
                        </button>
                      </div>

                      {/* Qty */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm">Quantity</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decQty(it.itemId, it.stationId)}
                            className="rounded-xl border px-3 py-2 hover:bg-gray-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-10 text-center font-semibold">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => incQty(it.itemId, it.stationId)}
                            className="rounded-xl border px-3 py-2 hover:bg-gray-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Notes */}
                      <textarea
                        value={it.notes || ""}
                        onChange={(e) =>
                          updateItem(it.itemId, it.stationId, {
                            notes: e.target.value,
                          })
                        }
                        className="mt-3 w-full rounded-2xl border p-3 text-sm focus:ring-2 focus:ring-orange-200"
                        rows={2}
                        placeholder="Kitchen notes"
                      />

                      {/* Price */}
                      <div className="mt-3 flex justify-between text-sm">
                        <span>Unit price</span>
                        <span className="font-semibold">
                          {Number(it.unit_price || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* (Optional) Show modifier groups count just to confirm mapping works */}
                      {groups.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-semibold">Modifiers</div>

                          {groups.map((group) => (
                            <div
                              key={group.id}
                              className="rounded-xl bg-gray-50 p-3"
                            >
                              <div className="mb-2 text-sm font-medium">
                                {group.name}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {group.options.map((opt) => {
                                  const selected = it.modifiers.some(
                                    (m) => m.modifier_id === opt.id
                                  );

                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => toggleModifier(it, opt)}
                                      className={`rounded-lg border px-3 py-1 text-sm ${
                                        selected
                                          ? "bg-orange-600 text-white border-orange-600"
                                          : "bg-white hover:bg-gray-100"
                                      }`}
                                    >
                                      {opt.name}
                                      {opt.price > 0 && ` (+${opt.price})`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary */}
            <div className="rounded-3xl border bg-gray-50 p-4 h-fit">
              <div className="font-semibold">Summary</div>

              <div className="mt-3 flex justify-between text-sm">
                <span>Items</span>
                <span>{localItems.length}</span>
              </div>

              <div className="mt-2 flex justify-between">
                <span>Subtotal</span>
                <span className="text-lg font-bold">
                  {Number(subtotal || 0).toFixed(2)}
                </span>
              </div>

              <button
                disabled={saving || !orderId}
                onClick={() => {
                  if (!orderId) return;
                  onSave(orderId, originalItems);
                }}
                className="
                  mt-4 flex w-full items-center justify-center gap-2
                  rounded-2xl bg-orange-600 px-4 py-3
                  text-sm font-semibold text-white
                  hover:bg-orange-700
                  disabled:bg-orange-300 disabled:cursor-not-allowed
                "
              >
                <Send className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={onClose}
                className="mt-2 w-full rounded-2xl border border-gray-300
                  bg-white px-4 py-3 text-sm font-semibold
                  text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              {/* keep original snapshot available (if you want to send to backend later) */}
              <div className="mt-3 text-[11px] text-gray-500">
                {orderId
                  ? `Loaded Order ID: ${orderId}`
                  : "No order loaded yet"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
