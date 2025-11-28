"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Plus,
  Minus,
  ChefHat,
  UtensilsCrossed,
  Send,
  Trash2,
  Edit3,
  Settings2,
  Receipt,
  Printer,
  SquarePen,
  Square,
  SquareCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../../../components/theme/pages/pos.scss";
import axios from "axios";

/* =============================================================================
 * Types
 * ========================================================================== */
type UID = string;

type KitchenStation = "Grill" | "Salad" | "Bar" | "Dessert" | "Expo";

type ModifierOption = {
  id: UID;
  name: string;
  priceDelta?: number; // can be negative for remove
  default?: boolean;
};

type ModifierGroup = {
  id: UID;
  name: string;
  type: "required" | "optional";
  minSelect?: number; // required min for type=required
  maxSelect?: number; // 0 = unlimited
  options: ModifierOption[];
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  categoryName?: string;
  kitchenRoute?: KitchenStation;
  modifierGroups?: ModifierGroup[];
};

type AppliedModifier = {
  groupId: UID;
  optionId: UID;
};

type OrderItem = {
  uid: UID;
  itemId: number;
  tableId?: number;
  name: string;
  basePrice: number;
  qty: number;
  kitchen: KitchenStation;
  note?: string;
  modifiers: AppliedModifier[]; // chosen modifiers
  priceExtra: number; // derived from modifiers
  sentToKitchen: boolean;
};

type Table = {
  id: number;
  label: string;
  numberSeats: number;
  statusId: number;
};

type Order = {
  id: UID;
  guests?: number;
  items: OrderItem[];
  createdAt: number;
  status: "open" | "paid" | "void";
};

/* =============================================================================
 * Mock Data
 * ========================================================================== */
const KITCHEN_STATIONS: KitchenStation[] = [
  "Grill",
  "Salad",
  "Bar",
  "Dessert",
  "Expo",
];

const MODIFIERS: Record<string, ModifierGroup[]> = {
  // by MenuItem.id
  "pizza-margherita": [
    {
      id: "grp-size",
      name: "Size",
      type: "required",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "opt-s", name: "Small", priceDelta: 0, default: true },
        { id: "opt-m", name: "Medium", priceDelta: 2 },
        { id: "opt-l", name: "Large", priceDelta: 4 },
      ],
    },
    {
      id: "grp-extras",
      name: "Extras",
      type: "optional",
      maxSelect: 4,
      options: [
        { id: "opt-mush", name: "Mushrooms", priceDelta: 1 },
        { id: "opt-olives", name: "Olives", priceDelta: 0.5 },
        { id: "opt-buf", name: "Buffalo Mozzarella", priceDelta: 2 },
        { id: "opt-chilli", name: "Chilli Flakes", priceDelta: 0 },
      ],
    },
    {
      id: "grp-remove",
      name: "Remove",
      type: "optional",
      maxSelect: 2,
      options: [
        { id: "opt-no-basil", name: "No Basil", priceDelta: 0 },
        { id: "opt-light-sauce", name: "Light Sauce", priceDelta: 0 },
      ],
    },
  ],
  "shawarma-chicken": [
    {
      id: "grp-bread",
      name: "Bread",
      type: "required",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "opt-wrap", name: "Wrap", priceDelta: 0, default: true },
        { id: "opt-plate", name: "Plate", priceDelta: 2 },
      ],
    },
    {
      id: "grp-sides",
      name: "Sides",
      type: "optional",
      maxSelect: 3,
      options: [
        { id: "opt-fries", name: "Fries", priceDelta: 1 },
        { id: "opt-salad", name: "Side Salad", priceDelta: 1.5 },
        { id: "opt-pickle", name: "Extra Pickles", priceDelta: 0.5 },
      ],
    },
    {
      id: "grp-sauce",
      name: "Sauces",
      type: "optional",
      maxSelect: 2,
      options: [
        { id: "opt-garlic", name: "Garlic", priceDelta: 0 },
        { id: "opt-tahini", name: "Tahini", priceDelta: 0 },
        { id: "opt-spicy", name: "Spicy", priceDelta: 0 },
      ],
    },
  ],
};

/* =============================================================================
 * Helpers
 * ========================================================================== */
const uid = () => Math.random().toString(36).slice(2, 9);

const money = (n: number, d = 2) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

function priceFromModifiers(
  groups: ModifierGroup[] | undefined,
  selected: AppliedModifier[]
): number {
  if (!groups?.length || !selected.length) return 0;
  let extra = 0;
  for (const sel of selected) {
    const g = groups.find((gg) => gg.id === sel.groupId);
    const opt = g?.options.find((oo) => oo.id === sel.optionId);
    extra += opt?.priceDelta || 0;
  }
  return extra;
}

// function validateRequiredGroups(
//   groups: ModifierGroup[] | undefined,
//   selected: AppliedModifier[]
// ) {
//   const issues: string[] = [];
//   if (!groups) return issues;
//   for (const g of groups) {
//     if (g.type !== "required") continue;
//     const chosen = selected.filter((s) => s.groupId === g.id).length;
//     const min = g.minSelect ?? 1;
//     if (chosen < min) {
//       issues.push(`Select ${min} in “${g.name}”.`);
//     }
//   }
//   return issues;
// }

/* =============================================================================
 * Page
 * ========================================================================== */
export default function POSPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const loadMenu = async () => {
    const res = await axios.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistofitems",
      {
        params: {
          g_hash: localStorage.getItem("g_hash"),
          user_id: localStorage.getItem("user_id"),
        },
      }
    );

    if (res.data.is_error === 1) return;

    setMenu(
      res.data.lst_items.map((it: any) => ({
        id: it.fi_id,
        name: it.fi_item_name,
        price: Number(it.fi_item_price ?? 0),
        categoryId: it.fi_category_id,
        categoryName: it.category_name,
        kitchenRoute: it.kitchen_route || "Expo",
        modifierGroups: MODIFIERS[it.fi_item_name] || [],
      }))
    );
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // UI state
  const [search, setSearch] = useState("");
  const [categoriesList, setCategoriesList] = useState<
    { id: number; name: string }[]
  >([]);

  const [category, setCategory] = useState<string>("All");
  const categories = useMemo(() => {
    return ["All", ...categoriesList.map((c) => c.name)];
  }, [categoriesList]);

  const loadCategories = async () => {
    const res = await axios.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/listitemcategories",
      {
        params: {
          g_hash: localStorage.getItem("g_hash"),
          user_id: localStorage.getItem("user_id"),
        },
      }
    );

    if (res.data.is_error === 1) return;

    const cats = res.data.lst_item_categories.map((c: any) => ({
      id: c.mc_id,
      name: c.mc_category_name,
    }));

    setCategoriesList(cats);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await axios.get(
          process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlisttables",
          {
            params: {
              g_hash: localStorage.getItem("g_hash"),
              user_id: localStorage.getItem("user_id"),
            },
          }
        );

        const data = response.data.lst_tables;
        setTables(
          data.map((t: any) => ({
            id: t.ft_id,
            label: t.ft_label,
            numberSeats: t.ft_number_seats,
            statusId: t.ft_status_id ?? 0,
          }))
        );
      } catch (e) {
        console.error("Tables fetch error:", e);
      }
    };

    fetchTables();
  }, []);

  // Tables & order
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTableId, setCurrentTableId] = useState<number | undefined>();
  const [activeTables, setActiveTables] = useState<number[]>([]);
  const [order, setOrder] = useState<Order>({
    id: uid(),
    guests: 0,
    items: [],
    createdAt: Date.now(),
    status: "open",
  });
  const [ordersInfo, setOrdersInfo] = useState<
    { tableId: number; items: any[] }[]
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orders_info");
      try {
        const parsed: { tableId: number; items: OrderItem[] }[] =
          JSON.parse(saved);

        setOrdersInfo(parsed);

        const actives = parsed
          .filter(
            (o) => o.tableId && o.tableId !== 0 && o.items && o.items.length > 0
          )
          .map((o) => o.tableId);

        setActiveTables(Array.from(new Set(actives)));
      } catch (e) {
        console.error("Failed to parse orders_info from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orders_info", JSON.stringify(ordersInfo));
    }
  }, [ordersInfo]);

  // Modals / Drawers
  const [modItem, setModItem] = useState<MenuItem | null>(null); // item being configured
  const [modSelected, setModSelected] = useState<AppliedModifier[]>([]);
  const [modQty, setModQty] = useState(1);
  const [editLine, setEditLine] = useState<OrderItem | null>(null);
  const [receiptHTML, setReceiptHTML] = useState<string | null>(null);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      const okCat = category === "All" || m.categoryName === category;
      const okSearch = !q || m.name.toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }, [search, category, menu]);

  const subtotal = useMemo(
    () =>
      order.items.reduce(
        (s, li) => s + (li.basePrice + li.priceExtra) * li.qty,
        0
      ),
    [order.items]
  );
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  /* -------------------- table selection -------------------- */
  const selectTable = (table: Table) => {
    setCurrentTableId(table.id);

    const tableOrder = ordersInfo.find((o) => o.tableId === table.id);

    setOrder({
      id: uid(),
      guests: 0,
      items: tableOrder ? tableOrder.items : [],
      createdAt: Date.now(),
      status: "open",
    });
  };

  /* -------------------- add item via modifiers dialog -------------------- */
  const addItemStart = (item: MenuItem) => {
    setModItem(item);
    // default selected = defaults from groups
    const selected: AppliedModifier[] = [];
    item.modifierGroups?.forEach((g) => {
      g.options.forEach((op) => {
        if (op.default) selected.push({ groupId: g.id, optionId: op.id });
      });
    });
    setModSelected(selected);
    setModQty(1);
  };

  const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
    setModSelected((prev) => {
      const exists = prev.some(
        (s) => s.groupId === group.id && s.optionId === option.id
      );
      // single-select for required groups (max=1)
      const max = group.maxSelect ?? (group.type === "required" ? 1 : 0);
      if (group.type === "required" && (max === 1 || !max)) {
        // replace selection
        const withoutGroup = prev.filter((s) => s.groupId !== group.id);
        return exists
          ? withoutGroup // unselect (allow blank; validation will enforce)
          : [...withoutGroup, { groupId: group.id, optionId: option.id }];
      }
      // optional group: toggle, respecting maxSelect if set
      if (exists) {
        return prev.filter(
          (s) => !(s.groupId === group.id && s.optionId === option.id)
        );
      } else {
        const inGroup = prev.filter((s) => s.groupId === group.id);
        if (max && inGroup.length >= max) {
          // replace oldest in-group selection
          const others = prev.filter((s) => s.groupId !== group.id);
          const keep = inGroup.slice(1);
          return [
            ...others,
            ...keep,
            { groupId: group.id, optionId: option.id },
          ];
        }
        return [...prev, { groupId: group.id, optionId: option.id }];
      }
    });
  };

  const confirmAddToOrder = async () => {
    if (!modItem) return;

    const priceExtra = priceFromModifiers(modItem.modifierGroups, modSelected);
    const tableKey = currentTableId || 0;

    const newLine: OrderItem = {
      uid: uid(),
      itemId: modItem.id,
      tableId: tableKey,
      name: modItem.name,
      basePrice: modItem.price,
      qty: modQty,
      kitchen: modItem.kitchenRoute || "Expo",
      note: "",
      modifiers: modSelected,
      priceExtra,
      sentToKitchen: false,
    };

    const updatedItems = [...order.items, newLine];
    setOrder((o) => ({ ...o, items: updatedItems }));

    const updatedOrders = [...ordersInfo];
    const index = updatedOrders.findIndex((o) => o.tableId === tableKey);

    if (index >= 0) {
      updatedOrders[index].items = updatedItems;
    } else {
      updatedOrders.push({
        tableId: tableKey,
        items: updatedItems,
      });
    }

    setOrdersInfo(updatedOrders);
    saveOrdersInfo(updatedOrders);

    setModItem(null);
  };

  /* -------------------- edit line -------------------- */
  const openEdit = (li: OrderItem) => setEditLine({ ...li });
  const applyEdit = () => {
    if (!editLine) return;
    // Recalculate extra (in case modifiers changed)
    const it = menu.find((m) => m.id === editLine.itemId);
    const extra = priceFromModifiers(it?.modifierGroups, editLine.modifiers);
    const updated = { ...editLine, priceExtra: extra };
    setOrder((o) => ({
      ...o,
      items: o.items.map((x) => (x.uid === updated.uid ? updated : x)),
    }));
    setEditLine(null);
  };

  const removeLine = (uidLine: UID) =>
    setOrder((o) => ({
      ...o,
      items: o.items.filter((x) => x.uid !== uidLine),
    }));

  const sendToKitchen = () => {
    setOrder((o) => ({
      ...o,
      items: o.items.map((x) => ({ ...x, sentToKitchen: true })),
    }));
    alert("Order sent to kitchen!");
  };

  const itemsForCurrentTable = useMemo(() => {
    if (currentTableId) {
      return order.items.filter((li) => li.tableId === currentTableId);
    }
    return order.items;
  }, [order.items, currentTableId]);

  function saveOrdersInfo(
    allOrders: { tableId: number; items: OrderItem[] }[]
  ) {
    localStorage.setItem("orders_info", JSON.stringify(allOrders));
  }

  useEffect(() => {
    localStorage.setItem("orders_info", JSON.stringify(ordersInfo));
  }, [ordersInfo]);

  const saveOrderToDatabase = async () => {
    const tableKey = currentTableId || 0;
    let orderData = ordersInfo.find((o) => o.tableId === tableKey);
    if (!orderData) {
      orderData = { tableId: tableKey, items: order.items };
    }

    if (!orderData.items || orderData.items.length === 0) {
      return alert("No items to save");
    }

    const formattedItems = orderData.items.map((li) => ({
      item_id: Number(li.itemId),
      quantity: li.qty,
      price: li.basePrice + li.priceExtra,
      discount: 0,
      station_id: 1,
      notes: li.note || "",
    }));

    const orderType = currentTableId ? "dine_in" : "takeaway";

    const payload = {
      g_hash: localStorage.getItem("g_hash"),
      store_id: localStorage.getItem("store_id"),
      warehouse_id: localStorage.getItem("warehouse_id"),
      user_id: localStorage.getItem("user_id"),
      sub_total: subtotal,
      discount: 0,
      total: total,
      order_type: orderType,
      table_id: tableKey,
      customer_id: 0,
      delcustomername: "",
      delcustomerphone: "",
      delcustomeraddress: "",
      order_items: JSON.stringify(formattedItems),
    };

    const response = await axios.post(
      process.env.NEXT_PUBLIC_API_LINK + "/api/orders/createorder",
      payload
    );

    if (response.data.is_error === 1) return alert(response.data.error_msg);

    if (response.data.receipt_html) {
      setReceiptHTML(response.data.receipt_html);
    }

    alert("Order saved!");

    // Remove only items for this table OR takeaway
    const left = ordersInfo.filter((o) => o.tableId !== tableKey);
    setOrdersInfo(left);
    saveOrdersInfo(left);

    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });

    setCurrentTableId(undefined);
  };

  const printReceipt = () => {
    if (!receiptHTML) return;

    const iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
    const doc = iframe.contentWindow?.document;

    if (!doc) {
      alert("Unable to print: iframe not found");
      return;
    }

    doc.open();
    doc.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; }
          @page { margin: 0; }
        </style>
      </head>
      <body>
        ${receiptHTML}
      </body>
    </html>
  `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  /* -------------------- render -------------------- */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <iframe id="print-iframe" style={{ display: "none" }} />
      <div className="mx-auto grid w-full max-w-[1600px] gap-4 lg:grid-cols-[370px_minmax(420px,1fr)_420px]">
        {/* LEFT: Tables */}
        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-gray-500" /> Tables
            </h2>
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50">
                Merge
              </button>
              <button className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50">
                Transfer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {tables.map((t) => {
              const isCurrent = currentTableId === t.id;
              const isActive = activeTables.includes(t.id);

              const color = isCurrent
                ? "border-orange-500 bg-orange-100" // selected table
                : isActive
                ? "border-orange-300 bg-orange-50" // has order
                : "border-gray-200 bg-white"; // normal

              return (
                <button
                  key={t.id}
                  onClick={() => selectTable(t)}
                  className={`h-24 rounded-2xl border ${color} p-3 text-left transition hover:bg-orange-50`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.label}</span>

                    {isCurrent && (
                      <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        ACTIVE
                      </span>
                    )}

                    {!isCurrent && isActive && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        HAS ORDER
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-600">
                    {t.numberSeats} seats
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* MIDDLE: Menu */}
        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          {/* Search + Categories */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                onClick={() => setCategory("All")}
              >
                All
              </button>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filteredMenu.map((m) => (
              <button
                key={m.id}
                onClick={() => addItemStart(m)}
                className="flex h-28 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="flex items-start justify-between">
                  <span className="line-clamp-2 text-sm font-semibold text-gray-800">
                    {m.name}
                  </span>
                  <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {m.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-extrabold text-gray-900">
                    $ {money(m.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <ChefHat className="h-3.5 w-3.5" /> {m.kitchenRoute}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* RIGHT: Order Ticket */}
        <section className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <div className="text-xs text-gray-500">Table</div>
              <div className="text-sm font-semibold text-gray-900">
                {currentTableId ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                Hold
              </button>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                Discount
              </button>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                <Printer className="h-4 w-4" />
              </button>
              <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                <Receipt className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lines */}
          {/* Lines */}
          <div className="flex-1 overflow-auto p-4">
            {itemsForCurrentTable.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                Add items from the menu…
              </div>
            ) : (
              <ul className="space-y-2">
                {itemsForCurrentTable.map((li) => {
                  const lineTotal = (li.basePrice + li.priceExtra) * li.qty;

                  return (
                    <li
                      key={li.uid}
                      className="rounded-2xl border border-gray-100 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {li.name}
                            </span>
                            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              {li.kitchen}
                            </span>
                            {!li.sentToKitchen && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Not sent
                              </span>
                            )}
                          </div>

                          {/* modifiers */}
                          {li.modifiers.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              {li.modifiers
                                .map((m) => {
                                  const it = menu.find(
                                    (x) => x.id === li.itemId
                                  );
                                  const g = it?.modifierGroups?.find(
                                    (gg) => gg.id === m.groupId
                                  );
                                  const o = g?.options.find(
                                    (oo) => oo.id === m.optionId
                                  );
                                  return o?.name;
                                })
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}

                          {/* note */}
                          {li.note && (
                            <div className="mt-1 text-xs italic text-gray-500">
                              “{li.note}”
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                              onClick={() =>
                                setOrder((o) => ({
                                  ...o,
                                  items: o.items.map((x) =>
                                    x.uid === li.uid
                                      ? { ...x, qty: Math.max(1, x.qty - 1) }
                                      : x
                                  ),
                                }))
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <span className="w-8 text-center text-sm font-semibold">
                              {li.qty}
                            </span>

                            <button
                              className="rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50"
                              onClick={() =>
                                setOrder((o) => ({
                                  ...o,
                                  items: o.items.map((x) =>
                                    x.uid === li.uid
                                      ? { ...x, qty: x.qty + 1 }
                                      : x
                                  ),
                                }))
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            <button
                              className="ml-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                              onClick={() => openEdit(li)}
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>

                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              onClick={() => removeLine(li.uid)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-gray-900">
                            $ {money(lineTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${money(li.basePrice)} base
                            {li.priceExtra
                              ? ` + ${money(li.priceExtra)} opts`
                              : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals + Actions */}
          <div className="border-t border-white/60 p-4">
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">
                  $ {money(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (11%)</span>
                <span className="font-semibold text-gray-900">
                  $ {money(tax)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-extrabold text-gray-900">
                  $ {money(total)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                disabled={order.items.length === 0}
                onClick={sendToKitchen}
                className="group inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send to Kitchen
              </button>
              <button
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
                onClick={saveOrderToDatabase}
              >
                Pay & Close
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ───────────────────────── Modifiers Dialog ───────────────────────── */}
      {modItem && (
        // container of modal
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
          {/* the modal here */}
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-0 shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="font-bold text-gray-900">{modItem.name}</div>
              <button
                onClick={() => setModItem(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              {/* Groups */}
              <div className="space-y-4">
                {modItem.modifierGroups?.map((g) => {
                  const inGroup = modSelected.filter((s) => s.groupId === g.id);
                  const max = g.maxSelect ?? (g.type === "required" ? 1 : 0);
                  return (
                    <div
                      key={g.id}
                      className="rounded-2xl border border-gray-200 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                          {g.name}{" "}
                          {g.type === "required" && (
                            <span className="text-xs font-medium text-amber-700">
                              {" "}
                              (required)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {max ? `max ${max}` : "multi"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {g.options.map((op) => {
                          const picked = inGroup.some(
                            (s) => s.optionId === op.id
                          );
                          return (
                            <button
                              key={op.id}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition
                              ${
                                picked
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                              onClick={() => toggleModifier(g, op)}
                            >
                              <span className="flex items-center gap-2">
                                {picked ? (
                                  <SquareCheck className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                                {op.name}
                              </span>
                              <span className="text-gray-700">
                                {op.priceDelta
                                  ? op.priceDelta > 0
                                    ? `+${money(op.priceDelta)}`
                                    : `${money(op.priceDelta)}`
                                  : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 text-sm text-gray-600">Quantity</div>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    onClick={() => setModQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-10 text-center text-sm font-semibold">
                    {modQty}
                  </div>
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    onClick={() => setModQty((q) => q + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-2 text-sm text-gray-600">
                  Kitchen Station
                </div>
                <select
                  defaultValue={modItem.kitchenRoute ?? "Expo"}
                  onChange={(e) => {
                    // stored later when creating line
                    if (!modItem) return;
                    modItem.kitchenRoute = e.target.value as KitchenStation;
                  }}
                  className="mb-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {KITCHEN_STATIONS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>

                <div className="mb-2 text-sm text-gray-600">Chosen</div>
                <ul className="mb-4 space-y-1 text-sm">
                  {modSelected.map((m) => {
                    const g = modItem.modifierGroups?.find(
                      (gg) => gg.id === m.groupId
                    );
                    const o = g?.options.find((oo) => oo.id === m.optionId);
                    return (
                      <li
                        key={`${m.groupId}-${m.optionId}`}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-700">
                          {g?.name} · <b>{o?.name}</b>
                        </span>
                        <span className="text-gray-700">
                          {o?.priceDelta
                            ? o.priceDelta > 0
                              ? `+${money(o.priceDelta)}`
                              : `${money(o.priceDelta)}`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                  {modSelected.length === 0 && (
                    <li className="text-xs text-gray-500">No modifiers</li>
                  )}
                </ul>

                <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
                  <span className="text-sm font-semibold text-orange-800">
                    Line Total
                  </span>
                  <span className="text-lg font-extrabold text-orange-700">
                    ${" "}
                    {money(
                      (modItem.price +
                        priceFromModifiers(
                          modItem.modifierGroups,
                          modSelected
                        )) *
                        modQty
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setModItem(null)}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAddToOrder}
                    className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
                  >
                    <Plus className="h-4 w-4" /> Add to Order
                    <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------receipt modal--------- */}
      {receiptHTML && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-6 py-3">
              <h2 className="text-lg font-bold text-gray-900">
                Receipt Preview
              </h2>
              <button
                onClick={() => setReceiptHTML(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTENT — visible preview */}
            <div className="p-5 max-h-[70vh] overflow-auto">
              <div
                className="receipt-preview"
                dangerouslySetInnerHTML={{ __html: receiptHTML }}
              />
            </div>

            {/* FOOTER with print */}
            <div className="border-t px-6 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setReceiptHTML(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>

              <button
                onClick={() => printReceipt()}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
              >
                <Printer className="h-4 w-4 inline-block mr-1" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────── Edit Line Drawer ───────────────────────── */}
      {editLine && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="w-full flex-1 bg-black/30"
            onClick={() => setEditLine(null)}
          />
          <div className="h-full w-full max-w-md overflow-auto border-l bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-bold">{editLine.name}</div>
              <button
                onClick={() => setEditLine(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    onClick={() =>
                      setEditLine((l) =>
                        l ? { ...l, qty: Math.max(1, l.qty - 1) } : l
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">
                    {editLine.qty}
                  </span>
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    onClick={() =>
                      setEditLine((l) => (l ? { ...l, qty: l.qty + 1 } : l))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Kitchen */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Kitchen Station
                </label>
                <select
                  value={editLine.kitchen}
                  onChange={(e) =>
                    setEditLine((l) =>
                      l
                        ? { ...l, kitchen: e.target.value as KitchenStation }
                        : l
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {KITCHEN_STATIONS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Modifiers */}
              <div>
                <div className="mb-2 text-sm font-semibold text-gray-700">
                  Modifiers
                </div>
                <div className="space-y-3">
                  {menu
                    .find((m) => m.id === editLine.itemId)
                    ?.modifierGroups?.map((g) => {
                      const lineInGroup = editLine.modifiers.filter(
                        (s) => s.groupId === g.id
                      );
                      const max =
                        g.maxSelect ?? (g.type === "required" ? 1 : 0);
                      const toggle = (op: ModifierOption) => {
                        setEditLine((l) => {
                          if (!l) return l;
                          const exists = l.modifiers.some(
                            (s) => s.groupId === g.id && s.optionId === op.id
                          );
                          if (g.type === "required" && (max === 1 || !max)) {
                            const filtered = l.modifiers.filter(
                              (s) => s.groupId !== g.id
                            );
                            return exists
                              ? { ...l, modifiers: filtered }
                              : {
                                  ...l,
                                  modifiers: [
                                    ...filtered,
                                    { groupId: g.id, optionId: op.id },
                                  ],
                                };
                          }
                          if (exists) {
                            return {
                              ...l,
                              modifiers: l.modifiers.filter(
                                (s) =>
                                  !(s.groupId === g.id && s.optionId === op.id)
                              ),
                            };
                          } else {
                            const inG = l.modifiers.filter(
                              (s) => s.groupId === g.id
                            );
                            if (max && inG.length >= max) {
                              const others = l.modifiers.filter(
                                (s) => s.groupId !== g.id
                              );
                              const keep = inG.slice(1);
                              return {
                                ...l,
                                modifiers: [
                                  ...others,
                                  ...keep,
                                  { groupId: g.id, optionId: op.id },
                                ],
                              };
                            }
                            return {
                              ...l,
                              modifiers: [
                                ...l.modifiers,
                                { groupId: g.id, optionId: op.id },
                              ],
                            };
                          }
                        });
                      };
                      return (
                        <div
                          key={g.id}
                          className="rounded-xl border border-gray-200 p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-sm font-semibold">
                              {g.name}{" "}
                              {g.type === "required" && (
                                <span className="text-amber-700 text-xs">
                                  (required)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {max ? `max ${max}` : "multi"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {g.options.map((op) => {
                              const picked = lineInGroup.some(
                                (s) => s.optionId === op.id
                              );
                              return (
                                <button
                                  key={op.id}
                                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition
                                ${
                                  picked
                                    ? "border-orange-300 bg-orange-50"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                                  onClick={() => toggle(op)}
                                >
                                  <span className="flex items-center gap-2">
                                    {picked ? (
                                      <SquareCheck className="h-4 w-4 text-orange-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-gray-400" />
                                    )}
                                    {op.name}
                                  </span>
                                  <span className="text-gray-700">
                                    {op.priceDelta
                                      ? op.priceDelta > 0
                                        ? `+${money(op.priceDelta)}`
                                        : `${money(op.priceDelta)}`
                                      : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Item Note
                </label>
                <textarea
                  rows={3}
                  value={editLine.note ?? ""}
                  onChange={(e) =>
                    setEditLine((l) => (l ? { ...l, note: e.target.value } : l))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="e.g., Well-done, extra sauce…"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
                <div className="text-sm">
                  <div className="text-gray-600">Base</div>
                  <div className="font-semibold">
                    $ {money(editLine.basePrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600">
                    Estimated Line Total
                  </div>
                  <div className="text-lg font-extrabold text-orange-700">
                    ${" "}
                    {money(
                      (editLine.basePrice +
                        priceFromModifiers(
                          menu.find((m) => m.id === editLine.itemId)
                            ?.modifierGroups,
                          editLine.modifiers
                        )) *
                        editLine.qty
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => {
                    removeLine(editLine.uid);
                    setEditLine(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove Item
                </button>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    onClick={() => setEditLine(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
                    onClick={applyEdit}
                  >
                    <SquarePen className="h-4 w-4" /> Apply Changes
                    <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="printable-receipt" style={{ display: "none" }}>
            <div dangerouslySetInnerHTML={{ __html: receiptHTML ?? "" }} />
          </div>
        </div>
      )}
    </div>
  );
}
