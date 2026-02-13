"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  UtensilsCrossed,
  Search,
  X,
  Plus,
  Minus,
  Send,
  ChefHat,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

type UID = string;
type KitchenStation = "Grill" | "Salad" | "Bar" | "Dessert" | "Expo";

type Floor = { id: number; name: string };

type Table = {
  id: number;
  label: string;
  floorId: number;
  seats: number;
};

type MenuCategory = { id: number; name: string };

type MenuItem = {
  id: number;
  name: string;
  price: number;
  currency_code: string;
  categoryId: number;
  categoryName?: string;
  kitchenRoute?: KitchenStation;
};

type OrderItem = {
  uid: UID;
  itemId: number;
  tableId: number;
  name: string;
  basePrice: number;
  qty: number;
  kitchen: KitchenStation;
  note?: string;
  sentToKitchen: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n: number, d = 2) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const brandBg =
  "bg-white";

export default function POSFloorsPage() {
  const [CurrencySymbol, setCurrencySymbol] = useState("");

  /* ------------------ Mock data (replace with API) ------------------ */
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  /* ------------------ UI state ------------------ */
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [currentTableId, setCurrentTableId] = useState<number | null>(null);

  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0); // 0 = All
  const [search, setSearch] = useState("");

  /* ------------------ Orders (per table) ------------------ */
  const [ordersInfo, setOrdersInfo] = useState<
    { tableId: number; items: OrderItem[] }[]
  >([]);

  useEffect(() => {
    setCurrencySymbol(localStorage.getItem("currency_symbol") || "");
  }, []);

  useEffect(() => {
    // Floors
    setFloors([
      { id: 1, name: "Terrace" },
      { id: 2, name: "Main Hall" },
      { id: 3, name: "VIP" },
    ]);
    setSelectedFloorId(1);

    // Tables
    setTables([
      { id: 101, label: "T1", floorId: 1, seats: 4 },
      { id: 102, label: "T2", floorId: 1, seats: 2 },
      { id: 103, label: "T3", floorId: 1, seats: 6 },

      { id: 201, label: "M1", floorId: 2, seats: 4 },
      { id: 202, label: "M2", floorId: 2, seats: 4 },
      { id: 203, label: "M3", floorId: 2, seats: 8 },

      { id: 301, label: "V1", floorId: 3, seats: 6 },
      { id: 302, label: "V2", floorId: 3, seats: 10 },
    ]);

    // Menu categories
    setCategories([
      { id: 10, name: "Pizza" },
      { id: 11, name: "Sandwich" },
      { id: 12, name: "Salads" },
      { id: 13, name: "Drinks" },
      { id: 14, name: "Dessert" },
    ]);

    // Menu items
    setMenu([
      {
        id: 1,
        name: "Margherita Pizza",
        price: 8,
        currency_code: "USD",
        categoryId: 10,
        categoryName: "Pizza",
        kitchenRoute: "Grill",
      },
      {
        id: 2,
        name: "Pepperoni Pizza",
        price: 9.5,
        currency_code: "USD",
        categoryId: 10,
        categoryName: "Pizza",
        kitchenRoute: "Grill",
      },
      {
        id: 3,
        name: "Chicken Shawarma",
        price: 6.5,
        currency_code: "USD",
        categoryId: 11,
        categoryName: "Sandwich",
        kitchenRoute: "Grill",
      },
      {
        id: 4,
        name: "Caesar Salad",
        price: 5.5,
        currency_code: "USD",
        categoryId: 12,
        categoryName: "Salads",
        kitchenRoute: "Salad",
      },
      {
        id: 5,
        name: "Fresh Juice",
        price: 3,
        currency_code: "USD",
        categoryId: 13,
        categoryName: "Drinks",
        kitchenRoute: "Bar",
      },
      {
        id: 6,
        name: "Chocolate Cake",
        price: 4.5,
        currency_code: "USD",
        categoryId: 14,
        categoryName: "Dessert",
        kitchenRoute: "Dessert",
      },
    ]);

    // Restore orders
    const saved = localStorage.getItem("pos_floor_orders");
    if (saved) {
      try {
        setOrdersInfo(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pos_floor_orders", JSON.stringify(ordersInfo));
  }, [ordersInfo]);

  /* ------------------ Derived ------------------ */
  const tablesForFloor = useMemo(() => {
    if (!selectedFloorId) return [];
    return tables.filter((t) => t.floorId === selectedFloorId);
  }, [tables, selectedFloorId]);

  const currentItems = useMemo(() => {
    if (!currentTableId) return [];
    return ordersInfo.find((o) => o.tableId === currentTableId)?.items || [];
  }, [ordersInfo, currentTableId]);

  const activeTables = useMemo(() => {
    return ordersInfo
      .filter((o) => o.items && o.items.length > 0)
      .map((o) => o.tableId);
  }, [ordersInfo]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu
      .filter((m) => (selectedCategoryId === 0 ? true : m.categoryId === selectedCategoryId))
      .filter((m) => (!q ? true : m.name.toLowerCase().includes(q)));
  }, [menu, selectedCategoryId, search]);

  const subtotal = useMemo(() => {
    return currentItems.reduce((s, it) => s + it.basePrice * it.qty, 0);
  }, [currentItems]);

  const newItemsCount = useMemo(() => {
    return currentItems.filter((x) => !x.sentToKitchen).length;
  }, [currentItems]);

  /* ------------------ Actions ------------------ */
  const selectTable = (tableId: number) => {
    setCurrentTableId(tableId);

    setOrdersInfo((prev) => {
      if (prev.some((o) => o.tableId === tableId)) return prev;
      return [...prev, { tableId, items: [] }];
    });
  };

  const addItem = (item: MenuItem) => {
    if (!currentTableId) return alert("Select a table first.");

    const line: OrderItem = {
      uid: uid(),
      itemId: item.id,
      tableId: currentTableId,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      kitchen: item.kitchenRoute || "Expo",
      note: "",
      sentToKitchen: false,
    };

    setOrdersInfo((prev) =>
      prev.map((o) =>
        o.tableId === currentTableId ? { ...o, items: [...o.items, line] } : o
      )
    );
  };

  const changeQty = (lineUid: string, delta: number) => {
    if (!currentTableId) return;
    setOrdersInfo((prev) =>
      prev.map((o) => {
        if (o.tableId !== currentTableId) return o;
        return {
          ...o,
          items: o.items.map((it) =>
            it.uid === lineUid
              ? { ...it, qty: Math.max(1, it.qty + delta) }
              : it
          ),
        };
      })
    );
  };

  const removeLine = (lineUid: string) => {
    if (!currentTableId) return;
    setOrdersInfo((prev) =>
      prev.map((o) =>
        o.tableId === currentTableId
          ? { ...o, items: o.items.filter((x) => x.uid !== lineUid) }
          : o
      )
    );
  };

  const sendNewItemsToKitchen = async () => {
    if (!currentTableId) return;

    const toSend = currentItems.filter((x) => !x.sentToKitchen);
    if (toSend.length === 0) return alert("No new items to send.");

    // ✅ TODO: call your kitchen API here (KOT)
    // await axios.post(API + "/api/kitchen/send", { table_id: currentTableId, items: toSend })

    setOrdersInfo((prev) =>
      prev.map((o) => {
        if (o.tableId !== currentTableId) return o;
        return {
          ...o,
          items: o.items.map((it) =>
            toSend.some((s) => s.uid === it.uid)
              ? { ...it, sentToKitchen: true }
              : it
          ),
        };
      })
    );

    alert("Sent to kitchen ✅");
  };

  const openMenu = () => {
    if (!currentTableId) return alert("Select a table first.");
    setMenuModalOpen(true);
  };

  /* ------------------ UI ------------------ */
  return (
    <div className={`min-h-[calc(100vh-4rem)] ${brandBg} p-4`}>
      <div className="mx-auto grid w-full max-w-[1650px] gap-4 lg:grid-cols-[1fr_430px]">
        {/* LEFT: Floors + Tables */}
        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur ring-1 ring-white/60 shadow-sm">
          {/* Floors bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-gray-500">Floor</div>
              <div className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-orange-500" />
                Tables View
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFloorId(f.id);
                    setCurrentTableId(null);
                  }}
                  className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    selectedFloorId === f.id
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tables grid */}
          <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {tablesForFloor.map((t) => {
              const isCurrent = currentTableId === t.id;
              const hasOrder = activeTables.includes(t.id);

              const cls = isCurrent
                ? "border-orange-500 bg-orange-100"
                : hasOrder
                ? "border-orange-300 bg-orange-50"
                : "border-gray-200 bg-white";

              return (
                <button
                  key={t.id}
                  onClick={() => selectTable(t.id)}
                  className={`h-24 rounded-2xl border ${cls} p-3 text-left transition hover:bg-orange-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-gray-900">
                      {t.label}
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        ACTIVE
                      </span>
                    ) : hasOrder ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        HAS ORDER
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 text-xs text-gray-600">{t.seats} seats</div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-700">
              {currentTableId ? (
                <>
                  Selected table:{" "}
                  <span className="font-extrabold text-gray-900">
                    {currentTableId}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    • New items: {newItemsCount}
                  </span>
                </>
              ) : (
                "Select a table to start an order."
              )}
            </div>

            <button
              onClick={openMenu}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105"
            >
              <ShoppingBag className="h-4 w-4" />
              Open Menu
            </button>
          </div>
        </section>

        {/* RIGHT: Order Preview (always visible) */}
        <section className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl bg-white/80 backdrop-blur ring-1 ring-white/60 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <div className="text-xs text-gray-500">Order Preview</div>
              <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                Table: {currentTableId ?? "—"}
              </div>
            </div>

            <button
              onClick={() => setMenuModalOpen(true)}
              disabled={!currentTableId}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
            >
              Add Items
            </button>
          </div>

          {/* Lines */}
          <div className="flex-1 overflow-auto p-4">
            {!currentTableId ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                Select a table to preview order.
              </div>
            ) : currentItems.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                No items yet. Open Menu to add.
              </div>
            ) : (
              <ul className="space-y-2">
                {currentItems.map((li) => {
                  const lineTotal = li.basePrice * li.qty;

                  return (
                    <li
                      key={li.uid}
                      className="rounded-2xl border border-gray-100 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900">
                              {li.name}
                            </span>

                            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 inline-flex items-center gap-1">
                              <ChefHat className="h-3.5 w-3.5" />
                              {li.kitchen}
                            </span>

                            {li.sentToKitchen ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Sent
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                New
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                              onClick={() => changeQty(li.uid, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <span className="w-8 text-center text-sm font-bold">
                              {li.qty}
                            </span>

                            <button
                              className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                              onClick={() => changeQty(li.uid, +1)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            <button
                              className="ml-2 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                              onClick={() => removeLine(li.uid)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-gray-900">
                            {CurrencySymbol} {money(lineTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {CurrencySymbol} {money(li.basePrice)} base
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals Preview */}
          <div className="border-t border-white/60 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-extrabold text-gray-900">
                {CurrencySymbol} {money(subtotal)}
              </span>
            </div>

            <button
              onClick={sendNewItemsToKitchen}
              disabled={!currentTableId || currentItems.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:brightness-105 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send New Items to Kitchen ({newItemsCount})
            </button>
          </div>
        </section>
      </div>

      {/* ====================== MENU POPUP (categories + items) ====================== */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <div className="text-xs text-gray-500">Menu</div>
                <div className="text-lg font-extrabold text-gray-900">
                  Add Items • Table {currentTableId ?? "—"}
                </div>
              </div>

              <button
                onClick={() => setMenuModalOpen(false)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[320px_1fr]">
              {/* LEFT: Categories */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-2 text-sm font-extrabold text-gray-900">
                  Categories
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategoryId(0)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                      selectedCategoryId === 0
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
                    }`}
                  >
                    All
                  </button>

                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                        selectedCategoryId === c.id
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Items + search */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search items…"
                      className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {filteredMenu.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addItem(m)}
                      className="flex h-28 flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-extrabold text-gray-900 min-h-[38px]">
                          {m.name}
                        </span>
                        <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                          {m.categoryName}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900">
                          {CurrencySymbol || m.currency_code} {money(m.price)}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">
                          {m.kitchenRoute || "Expo"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                  <div className="text-sm font-bold text-orange-800">
                    Preview Total
                  </div>
                  <div className="text-lg font-extrabold text-orange-700">
                    {CurrencySymbol} {money(subtotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={() => setMenuModalOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setMenuModalOpen(false);
                  sendNewItemsToKitchen();
                }}
                disabled={!currentTableId || newItemsCount === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}