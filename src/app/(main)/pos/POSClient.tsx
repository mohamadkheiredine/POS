"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Minus,
  UtensilsCrossed,
  Send,
  Trash2,
  Edit3,
  Receipt,
  Printer,
  SquarePen,
  Square,
  SquareCheck,
} from "lucide-react";
import "../../../components/theme/pages/pos.scss";
import axios from "axios";
import { useI18n } from "@/hooks/useI18n";
import LanguageSwitch from "@/components/shared/language-switch";

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
  currency_code: string;
  cc_id: number;
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

type LocalOrder = {
  orderId: string;
  tableIds: number[];
  items: OrderItem[];
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

const USE_MODIFIERS = process.env.NEXT_PUBLIC_USE_MODIFIER === "true";

/* =============================================================================
 * Page
 * ========================================================================== */
export default function POSClient({ lang }: { lang: "en" | "fr" }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [CurrencySymbol, setCurrencySymbol] = useState<string>("");
  const [takeawayModalOpen, setTakeawayModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [takeawayCustomerId, setTakeawayCustomerId] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerResults, setCustomerResults] = useState<any>([]);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [firstMergeTable, setFirstMergeTable] = useState<number | null>(null);

  const [previewPopupOpen, setPreviewPopupOpen] = useState(false);
  const [previewTotals, setPreviewTotals] = useState({
    subtotal: 0,
    total: 0,
    discount: 0,
  });

  const [modifiers, setModifiers] = useState<
    { id: number; name: string; price: number }[]
  >([]);

  const { t } = useI18n(lang);

  const loadModifiers = async () => {
    const res = await axios.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistmodifiers",
      {
        params: {
          g_hash: localStorage.getItem("g_hash"),
          user_id: localStorage.getItem("user_id"),
        },
      }
    );

    if (res.data.is_error === 1) return;

    setModifiers(
      res.data.lst_modifiers.map((m: any) => ({
        id: m.m_id,
        name: m.m_modifier_name,
        price: Number(m.m_price_modifier),
      }))
    );
  };

  useEffect(() => {
    loadModifiers();
  }, []);

  useEffect(() => {
    setCurrencySymbol(localStorage.getItem("currency_symbol") || "");
  }, []);

  //currency_symbol
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
        id: it.mi_id,
        name: it.mi_item_name,
        price: Number(it.mi_base_price ?? 0),
        categoryId: it.mi_category_id,
        currency_code: it.currency_code,
        cc_id: it.cc_id,
        categoryName: it.category_name,
        kitchenRoute: it.kitchen_route || "Expo",
        modifierGroups: USE_MODIFIERS
          ? [
              {
                id: "options",
                name: "Options",
                type: "optional",
                maxSelect: 0,
                options: modifiers.map((m) => ({
                  id: "opt-" + m.id,
                  name: m.name,
                  priceDelta: Number(m.price),
                })),
              },
            ]
          : [],
      }))
    );
  };

  useEffect(() => {
    if (modifiers.length > 0) {
      loadMenu();
    }
  }, [modifiers]);

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
  const [currentTableId, setCurrentTableId] = useState<number | null>(null);
  const [activeTables, setActiveTables] = useState<number[]>([]);
  const [order, setOrder] = useState<Order>({
    id: uid(),
    guests: 0,
    items: [],
    createdAt: Date.now(),
    status: "open",
  });
  const [ordersInfo, setOrdersInfo] = useState<LocalOrder[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved: any = localStorage.getItem("orders_info");
      try {
        const parsed: LocalOrder[] = JSON.parse(saved || "[]");
        setOrdersInfo(parsed);

        const actives = parsed
          .filter(
            (o) => o.tableIds && o.tableIds.length > 0 && o.items.length > 0
          )
          .flatMap((o) => o.tableIds);

        setActiveTables([...new Set(actives)]);
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
  const [takeawayPreview, setTakeawayPreview] = useState(false);
  const [customerType, setCustomerType] = useState("takeaway");
  const [paymentType, setPaymentType] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_LINK;
  const [g_hash, setGHash] = useState<string | null>(null);
  const [user_id, setUserId] = useState<string | null>(null);

  const [hasOpenCash, setHasOpenCash] = useState<boolean | undefined>(
    undefined
  );

  const checkOpenCash = async () => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/shift/getopencurrencies`,
        { params: { user_id, g_hash } }
      );

      if (res.data?.is_error === 0 && Array.isArray(res.data.data)) {
        setHasOpenCash(true);
      } else {
        setHasOpenCash(false);
      }
    } catch {
      setHasOpenCash(false);
    }
  };

  useEffect(() => {
    checkOpenCash();
  }, []);

  const posDisabled = hasOpenCash === false;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGHash(localStorage.getItem("g_hash"));
      setUserId(localStorage.getItem("user_id"));
    }
  }, []);

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

  const selectTable = async (table: Table) => {
    if (mergeMode) {
      if (firstMergeTable === null) {
        setFirstMergeTable(table.id);
        alert(`Now select the second table to merge with ${table.label}`);
        return;
      }

      // Second selection → perform merge
      mergeTables(firstMergeTable, table.id);
      setMergeMode(false);
      setFirstMergeTable(null);
      return;
    }

    const existing = ordersInfo.find((o) => o.tableIds.includes(table.id));

    if (existing) {
      setCurrentOrderId(existing.orderId);
      setCurrentTableId(table.id);
      setOrder({
        id: existing.orderId,
        items: existing.items,
        createdAt: Date.now(),
        status: "open",
      });
      return;
    }

    const res = await axios.post(API_URL + "/api/orders/createemptyorder", {
      g_hash,
      user_id,
    });

    if (res.data.is_error) return alert(res.data.error_msg);

    const newOrderId = res.data.order_id;

    const newOrder: LocalOrder = {
      orderId: newOrderId,
      tableIds: [table.id],
      items: [],
    };

    setOrdersInfo((prev) => [...prev, newOrder]);
    setCurrentOrderId(newOrderId);
    setCurrentTableId(table.id);

    setOrder({
      id: newOrderId,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });
  };

  useEffect(() => {
    async function loadPendingOrders() {
      const res = await axios.post(API_URL + "/api/orders/sync", {
        g_hash,
        user_id,
      });

      if (res.data.is_error) return;

      const loadedOrders = res.data.orders.map((o: any) => ({
        orderId: o.order_id,
        tableIds: o.tables,
        items: o.items.map((it: any) => ({
          uid: uid(),
          itemId: it.oi_item_id,
          qty: it.oi_quantity,
          basePrice: it.oi_unit_price,
          modifiers: [],
          note: it.oi_notes,
          priceExtra: 0,
          sentToKitchen: true,
        })),
      }));

      setOrdersInfo(loadedOrders);
    }

    loadPendingOrders();
  }, []);

  const addItemStart = (item: MenuItem) => {
    setModItem(item);
    if (!USE_MODIFIERS) {
      setModSelected([]);
      setModQty(1);
      return;
    }

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

  const confirmAddToOrder = () => {
    if (!modItem) return;

    const priceExtra = priceFromModifiers(modItem.modifierGroups, modSelected);

    const newLine: OrderItem = {
      uid: uid(),
      itemId: modItem.id,
      name: modItem.name,
      basePrice: modItem.price,
      qty: modQty,
      kitchen: modItem.kitchenRoute || "Expo",
      note: "",
      modifiers: modSelected,
      priceExtra,
      sentToKitchen: false,
    };

    setOrder((o) => ({ ...o, items: [...o.items, newLine] }));

    setOrdersInfo((prev) =>
      prev.map((o) =>
        o.orderId === currentOrderId
          ? { ...o, items: [...o.items, newLine] }
          : o
      )
    );

    setModItem(null);
  };

  const sendToKitchen = async () => {
    const orderData = ordersInfo.find((o) => o.orderId === order.id);
    if (!orderData) return alert("Order not found");

    if (!g_hash || !user_id) {
      return alert("Missing authentication data");
    }

    const payload = {
      g_hash,
      user_id,
      warehouse_id: localStorage.getItem("warehouse_id"),

      order_id: order.id,
      order_type: "dine_in",
      table_ids: orderData.tableIds.join(","),

      sub_total: subtotal,
      discount: 0,
      total: total,

      order_items: JSON.stringify(
        orderData.items.map((li) => ({
          item_id: li.itemId,
          quantity: li.qty,
          unit_price: li.basePrice + li.priceExtra,
          discount: 0,
          station_id: 1,
          notes: li.note || "",
          modifiers: li.modifiers.map((m: any) => ({
            group_id: m.groupId,
            option_id: m.optionId,
            name: m.name,
            price: m.price,
          })),
        }))
      ),
    };

    try {
      const res = await axios.post(
        API_URL + "/api/orders/updateorder",
        payload
      );

      if (res.data.is_error) {
        alert(res.data.error_msg);
        return;
      }

      alert("Order sent to kitchen!");

      setOrdersInfo(ordersInfo.filter((o) => o.orderId !== order.id));
      setCurrentTableId(null);
    } catch (err: any) {
      console.error("Update Order API Error:", err.response?.data || err);
      alert("Error sending order. Backend returned 500.");
    }
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

  const itemsForCurrentTable = useMemo(() => {
    return order.items; // show ALL items for merged tables
  }, [order.items]);

  function saveOrdersInfo(allOrders: LocalOrder[]) {
    localStorage.setItem("orders_info", JSON.stringify(allOrders));
  }

  useEffect(() => {
    localStorage.setItem("orders_info", JSON.stringify(ordersInfo));
  }, [ordersInfo]);

  const saveOrderToDatabase = async (finalCustomerId?: number) => {
    const tableKey = currentTableId ? Number(currentTableId) : 0;
    const isTakeaway = tableKey === 0;

    const orderType = isTakeaway ? "takeaway" : "dine_in";

    let orderData = ordersInfo.find((o) => o.tableIds.includes(tableKey));

    if (!orderData) {
      orderData = {
        orderId: uid(),
        tableIds: [tableKey],
        items: order.items,
      };
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
      modifiers: li.modifiers.map((m) => ({
        group_id: m.groupId,
        option_id: m.optionId,
        name:
          menu
            .find((it) => it.id === li.itemId)
            ?.modifierGroups?.find((g) => g.id === m.groupId)
            ?.options.find((o) => o.id === m.optionId)?.name || "",
        price:
          menu
            .find((it) => it.id === li.itemId)
            ?.modifierGroups?.find((g) => g.id === m.groupId)
            ?.options.find((o) => o.id === m.optionId)?.priceDelta || 0,
      })),
    }));

    let customer_id = 0;
    let delName = "";
    let delPhone = "";
    let delAddress = "";

    if (isTakeaway) {
      // If customer selected from search
      if (selectedCustomer) {
        customer_id = selectedCustomer.customer_id;
        delName = selectedCustomer.customer_name ?? "";
        delPhone = selectedCustomer.customer_mobile ?? "";
        delAddress = selectedCustomer.customer_address ?? "";
      }

      // If newly entered
      if (customerName?.trim()) delName = customerName.trim();
      if (customerPhone?.trim()) delPhone = customerPhone.trim();
      if (customerAddress?.trim()) delAddress = customerAddress.trim();
    }

    const payload = {
      g_hash: localStorage.getItem("g_hash"),
      warehouse_id: localStorage.getItem("warehouse_id"),
      user_id: localStorage.getItem("user_id"),
      company_id: localStorage.getItem("company_id"),

      order_type: orderType,
      table_id: orderData.tableIds.join(","),

      customer_id: finalCustomerId ?? customer_id,
      delcustomername: delName,
      delcustomerphone: delPhone,
      delcustomeraddress: delAddress,

      customer_type: customerType,

      sub_total: subtotal,
      discount: 0,
      total: total,
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

    const remaining = ordersInfo.filter((o) => !o.tableIds.includes(tableKey));

    setOrdersInfo(remaining);
    localStorage.setItem("orders_info", JSON.stringify(remaining));

    // Reset UI
    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });

    setCurrentTableId(null);
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
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

  // Recalculate active tables any time ordersInfo changes
  useEffect(() => {
    const actives = ordersInfo
      .filter((o) => o.tableIds && o.items.length > 0)
      .flatMap((o) => o.tableIds);

    setActiveTables(Array.from(new Set(actives)));
  }, [ordersInfo]);

  const startNewOrder = () => {
    setCurrentTableId(null);
    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });
  };

  function mergeTables(t1: number, t2: number) {
    const o1: any = ordersInfo.find((o) => o.tableIds.includes(t1));
    const o2: any = ordersInfo.find((o) => o.tableIds.includes(t2));

    if (!o1 && !o2) return alert("Both tables have no orders");
    if (o1 && !o2) {
      const updated = {
        ...o1,
        tableIds: Array.from(new Set([...o1.tableIds, t2])),
      };
      setOrdersInfo(
        ordersInfo.map((o) => (o.orderId === o1.orderId ? updated : o))
      );
      return;
    }
    if (!o1 && o2) {
      const updated = {
        ...o2,
        tableIds: Array.from(new Set([...o2.tableIds, t1])),
      };
      setOrdersInfo(
        ordersInfo.map((o: any) => (o.orderId === o2.orderId ? updated : o))
      );
      return;
    }

    // Both have orders
    if (o1.orderId === o2.orderId) return alert("Same order already");

    const merged: LocalOrder = {
      orderId: o1.orderId,
      tableIds: Array.from(new Set([...o1.tableIds, ...o2.tableIds])),
      items: [...o1.items, ...o2.items],
    };

    const remaining = ordersInfo.filter(
      (o) => o.orderId !== o1.orderId && o.orderId !== o2.orderId
    );

    setOrdersInfo([...remaining, merged]);

    if (currentTableId === t1 || currentTableId === t2) {
      setCurrentOrderId(merged.orderId);
      setCurrentTableId(t1);
      setOrder((prev) => ({
        ...prev,
        id: merged.orderId,
        items: merged.items,
      }));
    }
  }

  /* -------------------- render -------------------- */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <iframe id="print-iframe" style={{ display: "none" }} />
      <div className="mx-auto grid w-full max-w-[1600px] gap-4 lg:grid-cols-[370px_minmax(420px,1fr)_420px]">
        {/* LEFT: Tables */}
        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-gray-500" />{" "}
              {t.POS.tables}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                disabled={posDisabled}
              >
                {t.POS.transfer}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {tables.map((ta) => {
              const isCurrent = currentTableId === ta.id;
              const isActive = activeTables.includes(ta.id);

              const color = isCurrent
                ? "border-orange-500 bg-orange-100" // selected table
                : isActive
                ? "border-orange-300 bg-orange-50" // has order
                : "border-gray-200 bg-white"; // normal

              return (
                <button
                  disabled={posDisabled}
                  key={ta.id}
                  onClick={() => selectTable(ta)}
                  className={`h-24 rounded-2xl border ${color} p-3 text-left transition hover:bg-orange-50${
                    posDisabled
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                      : "hover:bg-emerald-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{ta.label}</span>

                    {isCurrent && (
                      <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        {t.POS.active}
                      </span>
                    )}

                    {!isCurrent && isActive && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        {t.POS.hasOrder}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-600">
                    {ta.numberSeats} {t.POS.seats}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              disabled={posDisabled}
              onClick={() => setSelectedCategory(0)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold border transition
      ${
        selectedCategory === 0
          ? "bg-orange-500 text-white border-orange-500"
          : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
      }${
                posDisabled
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                  : "hover:bg-emerald-700"
              }`}
            >
              All
            </button>

            {/* Dynamic categories */}
            {categoriesList.map((cat) => (
              <button
                disabled={posDisabled}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold border transition 
        ${
          selectedCategory === cat.id
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
        }${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* ======================== ITEMS GRID ======================== */}
          <div className="grid grid-cols-4 gap-4">
            {filteredMenu
              .filter(
                (m) =>
                  selectedCategory === 0 || m.categoryId === selectedCategory
              )
              .map((item) => (
                <button
                  disabled={posDisabled}
                  key={item.id}
                  onClick={() => addItemStart(item)}
                  className={`flex h-32 flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50${
                    posDisabled
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                      : "hover:bg-emerald-700"
                  }`}
                >
                  <span className="line-clamp-2 text-sm font-semibold text-gray-900 leading-tight min-h-[38px]">
                    {item.name}
                  </span>

                  <div className="flex-1"></div>
                  <div className="text-sm font-bold text-gray-900">
                    {item.currency_code} {money(item.price)}
                  </div>

                  <span className="mt-1 inline-block max-w-[120px] truncate text-[11px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                    {item.categoryName}
                  </span>
                </button>
              ))}
          </div>
        </section>

        {/* RIGHT: Order Ticket */}
        <section className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <div className="text-xs text-gray-500">{t.POS.table}</div>
              <div className="text-sm font-semibold text-gray-900">
                {currentTableId ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                disabled={posDisabled}
              >
                {t.POS.hold}
              </button>
              <button
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                disabled={posDisabled}
              >
                {t.POS.discount}
              </button>
              <button
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                disabled={posDisabled}
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                disabled={posDisabled}
              >
                <Receipt className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lines */}
          {/* Lines */}
          <div className="flex-1 overflow-auto p-4">
            {itemsForCurrentTable.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                {t.POS.addItems}
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
                                {t.POS.notSent}
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
                              disabled={posDisabled}
                              className={`rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50${
                                posDisabled
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                  : "hover:bg-emerald-700"
                              }`}
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
                              disabled={posDisabled}
                              className={`rounded-lg border border-gray-200 bg-white p-1 hover:bg-gray-50${
                                posDisabled
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                  : "hover:bg-emerald-700"
                              }`}
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
                              disabled={posDisabled}
                              className={`ml-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50${
                                posDisabled
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                  : "hover:bg-emerald-700"
                              }`}
                              onClick={() => openEdit(li)}
                            >
                              <Edit3 className="h-3.5 w-3.5" /> {t.POS.edit}
                            </button>

                            <button
                              disabled={posDisabled}
                              className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50${
                                posDisabled
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                  : "hover:bg-emerald-700"
                              }`}
                              onClick={() => removeLine(li.uid)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {t.POS.remove}
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-gray-900">
                            {CurrencySymbol} {money(lineTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {CurrencySymbol} {money(li.basePrice)} {t.POS.base}
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
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="text-xs text-gray-500">
              {currentTableId ? "Dine-In Order" : "Takeaway Order"}
            </div>

            {!currentTableId && (
              <button
                disabled={posDisabled}
                onClick={() => setCustomerDrawerOpen(true)}
                className={`text-orange-600 text-sm font-semibold hover:underline${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {selectedCustomer
                  ? selectedCustomer.customer_name
                  : "Add Customer"}
              </button>
            )}
          </div>

          {/* Totals + Actions */}
          <div className="border-t border-white/60 p-4">
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t.POS.subtotal}</span>
                <span className="font-semibold text-gray-900">
                  {CurrencySymbol} {money(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t.POS.tax} (11%)</span>
                <span className="font-semibold text-gray-900">
                  {CurrencySymbol} {money(tax)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-bold text-gray-800">{t.POS.total}</span>
                <span className="font-extrabold text-gray-900">
                  {CurrencySymbol} {money(total)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                disabled={order.items.length === 0 && posDisabled}
                onClick={sendToKitchen}
                className={`group inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <Send className="h-4 w-4" /> {t.POS.sendToKitchen}
              </button>

              <button
                disabled={posDisabled}
                className={`rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                onClick={startNewOrder}
              >
                {t.POS.newOrder}
              </button>

              <button
                disabled={posDisabled}
                className={`group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                onClick={() => {
                  const tableKey = currentTableId ?? 0;

                  if (tableKey === 0 && !selectedCustomer && !customerName) {
                    setCustomerDrawerOpen(true);
                    setTakeawayPreview(true);
                  }

                  if (tableKey === 0) {
                    setCustomerDrawerOpen(true);
                    return;
                  }

                  setPreviewTotals({
                    subtotal,
                    total,
                    discount: 0,
                  });

                  setPreviewPopupOpen(true);
                }}
              >
                {t.POS.payClose}
              </button>

              <button
                disabled={posDisabled}
                onClick={() => {
                  setMergeMode(true);
                  setFirstMergeTable(null);
                  alert("Select the first table to merge");
                }}
                className={`rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {t.POS.merge}
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
                disabled={posDisabled}
                onClick={() => setModItem(null)}
                className={`rounded-lg p-1 hover:bg-gray-100${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`grid gap-5 p-5 ${
                USE_MODIFIERS ? "md:grid-cols-2" : "md:grid-cols-1"
              }`}
            >
              {/* Groups */}
              {USE_MODIFIERS && (
                <div className="space-y-4">
                  {modItem.modifierGroups?.map((g) => {
                    const inGroup = modSelected.filter(
                      (s) => s.groupId === g.id
                    );
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
                                ({t.POS.required})
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
                                disabled={posDisabled}
                                key={op.id}
                                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition
                              ${
                                picked
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              }${
                                  posDisabled
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                    : "hover:bg-emerald-700"
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
              )}

              {/* Summary */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 text-sm text-gray-600">
                  {t.POS.quantity}
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    disabled={posDisabled}
                    className={`rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                    onClick={() => setModQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-10 text-center text-sm font-semibold">
                    {modQty}
                  </div>
                  <button
                    disabled={posDisabled}
                    className={`rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                    onClick={() => setModQty((q) => q + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

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
                    <li className="text-xs text-gray-500">
                      {t.POS.noModifiers}
                    </li>
                  )}
                </ul>

                <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
                  <span className="text-sm font-semibold text-orange-800">
                    {t.POS.lineTotal}
                  </span>
                  <span className="text-lg font-extrabold text-orange-700">
                    {CurrencySymbol}{" "}
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
                    disabled={posDisabled}
                    onClick={() => setModItem(null)}
                    className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                  >
                    {t.POS.cancel}
                  </button>
                  <button
                    disabled={posDisabled}
                    onClick={confirmAddToOrder}
                    className={`group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                  >
                    <Plus className="h-4 w-4" /> {t.POS.addToOrder}
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
                {t.POS.receiptPreview}
              </h2>
              <button
                disabled={posDisabled}
                onClick={() => setReceiptHTML(null)}
                className={`rounded-lg p-1 hover:bg-gray-100${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
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
                disabled={posDisabled}
                onClick={() => setReceiptHTML(null)}
                className={`rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {t.POS.close}
              </button>

              <button
                disabled={posDisabled}
                onClick={() => printReceipt()}
                className={`rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <Printer className="h-4 w-4 inline-block mr-1" />
                {t.POS.print}
              </button>
            </div>
          </div>
        </div>
      )}

      {customerDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* BACKDROP */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setCustomerDrawerOpen(false)}
          />

          {/* DRAWER */}
          <div className="w-full max-w-md bg-white shadow-2xl overflow-auto">
            {/* HEADER */}
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {t.POS.takeawayCustomer}
              </h2>
              <button
                disabled={posDisabled}
                onClick={() => setCustomerDrawerOpen(false)}
                className={`p-1 rounded-lg hover:bg-gray-100${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {takeawayPreview && (
                <div className="mt-6 rounded-2xl border border-orange-300 bg-orange-50 p-4">
                  <h3 className="text-lg font-bold mb-3">
                    Takeaway Order Preview
                  </h3>

                  {/* Items */}
                  <div className="space-y-2 text-sm">
                    {order.items.map((li) => (
                      <div key={li.uid} className="space-y-1 border-b pb-2">
                        <div className="flex justify-between">
                          <span>
                            {li.name} × {li.qty}
                          </span>
                          <span>
                            {money((li.basePrice + li.priceExtra) * li.qty)}
                          </span>
                        </div>

                        {/* Show modifiers */}
                        {li.modifiers.length > 0 && (
                          <div className="text-xs text-gray-600 ml-2">
                            {li.modifiers
                              .map((m) => {
                                const item = menu.find(
                                  (x) => x.id === li.itemId
                                );
                                const g = item?.modifierGroups?.find(
                                  (gg) => gg.id === m.groupId
                                );
                                const o = g?.options.find(
                                  (oo) => oo.id === m.optionId
                                );
                                return `${o?.name} (${money(
                                  o?.priceDelta || 0
                                )})`;
                              })
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.POS.subtotal}</span>
                      <span className="font-semibold">{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.POS.tax}</span>
                      <span className="font-semibold">{money(tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">{t.POS.total}</span>
                      <span className="font-extrabold">{money(total)}</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  {selectedCustomer && (
                    <div className="mt-4 text-sm">
                      <div className="font-semibold">{t.POS.customer}</div>
                      <div>{selectedCustomer.customer_name}</div>
                      <div className="text-gray-600">
                        {selectedCustomer.customer_mobile}
                      </div>
                      <div className="text-gray-600">
                        {selectedCustomer.customer_address}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-gray-700">
                      Payment Type
                    </label>
                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={posDisabled}
                        onClick={() => setPaymentType("cash")}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold 
        ${
          paymentType === "cash"
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-white border-gray-300"
        }${
                          posDisabled
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                            : "hover:bg-emerald-700"
                        }
      `}
                      >
                        {t.POS.cash}
                      </button>

                      <button
                        disabled={posDisabled}
                        onClick={() => setPaymentType("card")}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold 
        ${
          paymentType === "card"
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-white border-gray-300"
        }${
                          posDisabled
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                            : "hover:bg-emerald-700"
                        }
      `}
                      >
                        {t.POS.card}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Field */}
              <div>
                <label className="font-semibold text-sm text-gray-700">
                  {t.POS.search}
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Search customer by name or phone..."
                  onChange={async (e) => {
                    const q = e.target.value.trim();
                    if (q.length < 2) {
                      setCustomerResults([]);
                      return;
                    }

                    const res = await axios.get(
                      process.env.NEXT_PUBLIC_API_LINK +
                        "/request/api/searchcustomerbyname",
                      { params: { sc_customer_name: q } }
                    );

                    // If API returns error → reset UI safely
                    if (
                      !res.data ||
                      res.data.is_error === 1 ||
                      !res.data.customer_data
                    ) {
                      setCustomerResults([]);
                      return;
                    }

                    // Backend still returns encoded JSON → decode it
                    const c = res.data.customer_data;

                    setCustomerResults([c]);
                    setCustomerName(c.customer_name || "");
                    setCustomerPhone(c.customer_mobile || "");
                    setCustomerAddress(c.customer_address || "");
                  }}
                />
              </div>

              {/* Results */}
              {customerResults?.length > 0 && (
                <div className="space-y-2">
                  {customerResults.map((c: any) => {
                    const isSelected =
                      selectedCustomer?.customer_id === c.customer_id;

                    return (
                      <button
                        disabled={posDisabled}
                        key={c.customer_id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowNewCustomer(false);

                          setCustomerName("");
                          setCustomerPhone("");
                          setCustomerAddress("");
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl border transition 
            ${
              isSelected
                ? "bg-orange-100 border-orange-500 shadow-sm"
                : "bg-white hover:bg-orange-50 border-gray-200"
            }${
                          posDisabled
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                            : "hover:bg-emerald-700"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold">
                              {c.customer_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {c.customer_mobile}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="text-orange-600 font-bold text-sm">
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <hr className="my-4" />

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  {t.POS.orderType}
                </label>
                <select
                  className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                >
                  <option value="takeaway">{t.POS.takeaway}</option>
                  <option value="delivery">{t.POS.delivery}</option>
                </select>
              </div>

              {/* Toggle: create new customer */}
              {/* Accordion Title */}
              <button
                disabled={posDisabled}
                onClick={() => setShowNewCustomer(!showNewCustomer)}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border text-sm font-semibold bg-white hover:bg-gray-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {t.POS.addNewCustomer}
                <span className="text-gray-500">
                  {showNewCustomer ? "▲" : "▼"}
                </span>
              </button>

              {/* Accordion Content */}
              {showNewCustomer && (
                <div className="mt-3 space-y-3 border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-800">
                    {t.POS.newCustomer}
                  </h3>

                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />

                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />

                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />

                  {/* <button
      className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-xl px-4 py-2 font-semibold shadow hover:brightness-105"
    >
      Save Customer
    </button> */}
                </div>
              )}

              {/* NEW CUSTOMER FORM */}

              <button
                disabled={!selectedCustomer && !showNewCustomer && posDisabled}
                className={`w-full mt-4 px-4 py-3 text-sm font-semibold rounded-xl 
    ${
      !selectedCustomer && !showNewCustomer
        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
        : "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-lg"
    }${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                onClick={async () => {
                  let finalCustomerId = null;

                  if (selectedCustomer && !showNewCustomer) {
                    finalCustomerId = selectedCustomer.customer_id;
                  } else if (showNewCustomer) {
                    // Require name + phone
                    if (!customerName || !customerPhone) {
                      return alert("Name and phone are required!");
                    }

                    const payload = {
                      g_hash: localStorage.getItem("g_hash"),
                      user_id: localStorage.getItem("user_id"),

                      customer_id: 0,
                      ic_customer_name: customerName,
                      ic_customer_address: customerAddress,
                      ic_customer_phone: customerPhone,
                      ic_customer_mobile: customerPhone,

                      ic_customer_email: "",
                      ic_customer_website: "",
                      ic_hobbies: "",
                      ic_birth_date: "",
                      ic_is_active: 1,
                      ic_customer_type: "takeaway",
                      ic_loyality_point: 0,
                    };

                    const res = await axios.post(
                      process.env.NEXT_PUBLIC_API_LINK +
                        "/request/api/savecustomer",
                      payload
                    );

                    if (res.data.is_error) {
                      return alert(res.data.error_message);
                    }

                    // Set newly created customer
                    finalCustomerId = res.data.customer_id;

                    setSelectedCustomer({
                      customer_id: finalCustomerId,
                      customer_name: customerName,
                      customer_mobile: customerPhone,
                      customer_address: customerAddress,
                    });
                  }

                  setCustomerDrawerOpen(false);

                  // Pass finalCustomerId to your order-saving function
                  await saveOrderToDatabase(finalCustomerId);
                }}
              >
                {t.POS.payClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">Invoice & Payment</h2>
              <button
                disabled={posDisabled}
                onClick={() => setPreviewPopupOpen(false)}
                className={`p-1 rounded-lg hover:bg-gray-100${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Product List */}
              <div className="rounded-xl border p-4">
                <div className="font-semibold text-sm text-gray-700 mb-2">
                  {t.POS.product}
                </div>
                {order.items.map((li) => (
                  <div key={li.uid} className="space-y-1 border-b pb-2">
                    <div className="flex justify-between">
                      <span>
                        {li.name} × {li.qty}
                      </span>
                      <span>
                        {money((li.basePrice + li.priceExtra) * li.qty)}
                      </span>
                    </div>

                    {/* modifiers */}
                    {li.modifiers.length > 0 && (
                      <div className="text-xs text-gray-600 ml-2">
                        {li.modifiers
                          .map((m) => {
                            const item = menu.find((x) => x.id === li.itemId);
                            const g = item?.modifierGroups?.find(
                              (gg) => gg.id === m.groupId
                            );
                            const o = g?.options.find(
                              (oo) => oo.id === m.optionId
                            );
                            return `${o?.name} (${money(o?.priceDelta || 0)})`;
                          })
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.POS.subtotal}</span>
                  <span className="font-semibold">
                    {money(previewTotals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.POS.discount} %</span>
                  <span className="font-semibold">
                    {previewTotals.discount}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold">
                    {t.POS.total} ({CurrencySymbol})
                  </span>
                  <span className="font-extrabold">
                    {money(previewTotals.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <button
                disabled={posDisabled}
                onClick={() => setPreviewPopupOpen(false)}
                className={`rounded-xl border px-4 py-2 font-semibold${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                {t.POS.cancel}
              </button>
              <button
                disabled={posDisabled}
                onClick={async () => {
                  setPreviewPopupOpen(false);
                  await saveOrderToDatabase();
                }}
                className={`rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white px-5 py-2 font-semibold shadow-lg${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                Save Order
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
                disabled={posDisabled}
                onClick={() => setEditLine(null)}
                className={`rounded-lg p-1 hover:bg-gray-100${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t.POS.quantity}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={posDisabled}
                    className={`rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
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
                    disabled={posDisabled}
                    className={`rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                    onClick={() =>
                      setEditLine((l) => (l ? { ...l, qty: l.qty + 1 } : l))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Kitchen */}
              {USE_MODIFIERS && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {t.POS.kitchenStation}
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
              )}

              {/* Modifiers */}
              {USE_MODIFIERS && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-700">
                    {t.POS.modifiers}
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
                                    !(
                                      s.groupId === g.id && s.optionId === op.id
                                    )
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
                                    disabled={posDisabled}
                                    key={op.id}
                                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition
                                ${
                                  picked
                                    ? "border-orange-300 bg-orange-50"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                }${
                                      posDisabled
                                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                                        : "hover:bg-emerald-700"
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
              )}

              {/* Note */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t.POS.itemNote}
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
                  <div className="text-gray-600">{t.POS.base}</div>
                  <div className="font-semibold">
                    {CurrencySymbol} {money(editLine.basePrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600">
                    Estimated Line Total
                  </div>
                  <div className="text-lg font-extrabold text-orange-700">
                    {CurrencySymbol}{" "}
                    {money(
                      (editLine.basePrice +
                        (USE_MODIFIERS
                          ? priceFromModifiers(
                              menu.find((m) => m.id === editLine.itemId)
                                ?.modifierGroups,
                              editLine.modifiers
                            )
                          : 0)) *
                        editLine.qty
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  disabled={posDisabled}
                  className={`inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50${
                    posDisabled
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                      : "hover:bg-emerald-700"
                  }`}
                  onClick={() => {
                    removeLine(editLine.uid);
                    setEditLine(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> {t.POS.removeItem}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    disabled={posDisabled}
                    className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                    onClick={() => setEditLine(null)}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={posDisabled}
                    className={`group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105${
                      posDisabled
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                        : "hover:bg-emerald-700"
                    }`}
                    onClick={applyEdit}
                  >
                    <SquarePen className="h-4 w-4" /> {t.POS.applyChanges}
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
