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
import "@/components/theme/pages/pos.scss";
import axios from "axios";
import { useI18n } from "@/hooks/useI18n";
import { api } from "@/lib/api";
// import { forceLogout } from "@/lib/logout";
import { PlusSquare } from "lucide-react";
import LoadOrderPopup from "@/components/include/editOrderPopup";
import { OrderItemUI } from "@/components/include/editOrderPopup";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMenuItems, updateItemModifiers } from "@/store/slices/menuSlice";
import {
  setAllowedCurrencies,
  setSelectedCurrency,
} from "@/store/slices/allowedCurrenciesSlice";
import {
  removeOrder,
  replaceOrderId,
  updateOrderItems,
  upsertManyOrders,
  upsertOrder,
} from "@/store/slices/ordersSlice";
import { updateLoginStringField } from "@/store/slices/authSlice";
import { store } from "@/store";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/* =============================================================================
 * Types
 * ========================================================================== */
type UID = number;

// type KitchenStation = "Grill" | "Salad" | "Bar" | "Dessert" | "Expo";

type ModifierOption = {
  id: UID;
  name: string;
  rowId: number;
  priceDelta?: number; // can be negative for remove
  default?: boolean;
  quantity: number;
};

export type ModifierGroup = {
  id: UID;
  name: string;
  type: "required" | "optional";
  minSelect?: number; // required min for type=required
  maxSelect?: number; // 0 = unlimited
  options: ModifierOption[];
};

type AppliedModifier = {
  groupId: UID;
  optionId: UID;
  qty: number;
};

type OrderItem = {
  uid: string;
  itemId: number;
  name: string;
  basePrice: number;
  qty: number;
  stationId: number;
  note?: string;
  modifiers: AppliedModifier[];
  priceExtra: number;
  sentToKitchen: boolean;
};

type Table = {
  id: number;
  label: string;
  numberSeats: number;
  statusId: number;
};

type LocalOrder = {
  orderId: string;
  tableIds: number[];
  items: OrderItem[];
  isHeld?: boolean;
  isPaid?: boolean;

  mergedMeta?: {
    primaryTable: number;
    mergedAt: number;
  };

  customer?: {
    customer_id?: number;
    name?: string;
    phone?: string;
    address?: string;
  };

  checkoutDraft?: boolean;
};

type KitchenStationDB = {
  ks_id: number;
  ks_name: string;
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

function normalizeNote(note?: string | null): string {
  if (!note) return "";
  return String(note).trim();
}

function priceFromModifiers(
  groups: ModifierGroup[] | undefined,
  selected: AppliedModifier[],
): number {
  if (!groups || !selected.length) return 0;

  return selected.reduce((sum, sel) => {
    const g = groups.find((gg) => gg.id === sel.groupId);
    const opt = g?.options.find((oo) => oo.id === sel.optionId);
    return sum + (opt?.priceDelta ?? 0) * (sel.qty ?? 1);
  }, 0);
}
function normalizeModifierQty(qty: any, fallback = 1) {
  const n = Number(qty);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveModifierFromMaster(
  master: { id: number; name: string; price: number }[],
  optionId: number,
) {
  const m = master.find((x) => x.id === Number(optionId));
  return {
    name: m?.name ?? `#${optionId}`,
    priceDelta: m?.price ?? 0,
  };
}

const USE_MODIFIERS = process.env.NEXT_PUBLIC_USE_MODIFIER === "true";

const HELD_ORDER_KEY = "pos_held_order_snapshot";

type HeldSnapshot = {
  orderId: string;
  tableIds: number[];
  items: OrderItem[];
  heldAt: number;
};

export type LoadOrderPayload = {
  orderId: number;
  tableIds: number[];
  items: any[];
  customer?: {
    customer_id: number;
    name: string;
    phone?: string;
    address?: string;
  };
};

function readHeldSnapshot(): HeldSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HELD_ORDER_KEY);
    return raw ? (JSON.parse(raw) as HeldSnapshot) : null;
  } catch {
    return null;
  }
}

function writeHeldSnapshot(s: HeldSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HELD_ORDER_KEY, JSON.stringify(s));
  localStorage.setItem("last_held_order_id", s.orderId);
}

function clearHeldSnapshot() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HELD_ORDER_KEY);
  localStorage.removeItem("last_held_order_id");
}

function orderItemsToUIItems(
  orderItems: OrderItem[],
  menu: any[],
): OrderItemUI[] {
  return orderItems.map((li) => {
    const menuItem = menu.find((m) => m.id === li.itemId);

    return {
      itemId: li.itemId,
      itemName: menuItem?.name ?? li.name,
      stationId: li.stationId,
      qty: li.qty,
      unit_price: li.basePrice + li.priceExtra,
      notes: li.note ?? "",
      modifiers: (li.modifiers ?? []).map((m: any) => {
        const item = menu.find((x) => x.id === li.itemId);
        const group = item?.modifierGroups?.find(
          (g: any) => g.id === m.groupId,
        );
        const opt = group?.options.find((o: any) => o.id === m.optionId);

        return {
          modifier_id: Number(m.optionId),
          name: opt?.name ?? "",
          price: Number(opt?.priceDelta ?? 0),
          quantity: Number(m.quantity ?? m.qty ?? 1),
        };
      }),
    };
  });
}

const TEMP_ORDER_PREFIX = "tmp_";

/* =============================================================================
 * Page
 * ========================================================================== */
export default function POSClient({ lang }: { lang: "en" | "fr" }) {
  const menu = useAppSelector((s) => s.menu.items);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [CurrencySymbol, setCurrencySymbol] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerResults, setCustomerResults] = useState<any>([]);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [firstMergeTable, setFirstMergeTable] = useState<number | null>(null);

  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidCurrencyId, setPaidCurrencyId] = useState<number | null>(null);
  const [remainingCurrencyId, setRemainingCurrencyId] = useState<number | null>(
    null,
  );
  const [returnCurrencyId, setReturnCurrencyId] = useState<number | null>(null);

  const [transferMode, setTransferMode] = useState(false);

  const allowedCurrencies = useAppSelector((s) => s.allowedCurrencies.items);

  const selectedCurrencyId = useAppSelector(
    (s) => s.allowedCurrencies.selectedCurrencyId,
  );

  const currencyRate = useAppSelector((s) => s.allowedCurrencies.rate);

  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const isTakeawayNow = (tableId: number | null) => !tableId;

  const auth = useAppSelector((s) => s.auth.loginData);

  const g_hash = auth.g_hash;
  const user_id = auth.user_id;
  const store_id = auth.store_id;
  const company_id = auth.company_id;
  const warehouse_id = auth.warehouse_id;

  // true if user changed anything since last sync
  const [editDirty, setEditDirty] = useState(false);

  const [originalItems, setOriginalItems] = useState<OrderItemUI[]>([]);

  const [loadOrderOpen, setLoadOrderOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const onLoadOrder = (payload: LoadOrderPayload) => {
    const { orderId, tableIds, items } = payload;
    const customer = payload.customer;

    setEditingOrderId(orderId);

    const snap =
      typeof structuredClone === "function"
        ? structuredClone(items)
        : JSON.parse(JSON.stringify(items));

    setOriginalItems(snap);
    setEditDirty(false);

    const oid = String(orderId);

    const mappedItems: OrderItem[] = items.map((it) => {
      const itemId = Number(it.itemId);

      const menuItem = menu.find((m) => m.id === itemId);

      const mods: AppliedModifier[] = (it.modifiers ?? [])
        .map((m: any) => {
          const optionId = Number(m.modifier_id ?? m.id);

          if (!optionId) return null;
          return {
            groupId: 1,
            optionId,
            qty: normalizeModifierQty(m.quantity),
          };
        })
        .filter(Boolean) as AppliedModifier[];

      const extra = priceFromModifiers(menuItem?.modifierGroups, mods);

      return {
        uid: uid(),
        itemId,
        name: it.itemName,
        qty: it.qty,
        basePrice: Number(it.unit_price),
        stationId: it.stationId,
        note: normalizeNote(it.notes),
        modifiers: mods,
        priceExtra: extra,
        sentToKitchen: true,
      };
    });

    const localOrder: LocalOrder = {
      orderId: oid,

      tableIds: tableIds.length ? tableIds : [0],

      items: mappedItems,

      customer: customer
        ? {
            customer_id: customer.customer_id ?? 0,
            name: customer.name ?? "",
            phone: customer.phone ?? "",
            address: customer.address ?? "",
          }
        : {
            customer_id: 0,
            name: "",
            phone: "",
            address: "",
          },

      checkoutDraft: false,

      isHeld: false,
    };

    // update ordersInfo
    dispatch(upsertOrder(localOrder));

    setCurrentOrderId(oid);
    setCurrentTableId(tableIds[0] ?? null);

    setOrder({
      id: oid,
      guests: 0,
      items: mappedItems,
      createdAt: Date.now(),
      status: "open",
    });

    applyCustomerToUI(
      customer
        ? {
            customer_id: customer.customer_id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
          }
        : null,
    );

    if (customer) {
      dispatch(
        upsertOrder({
          ...ordersInfo.find((o) => o.orderId === oid)!,
          customer: {
            customer_id: customer.customer_id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
          },
        }),
      );
    }

    setLoadOrderOpen(false);
  };

  const convertPrice = (price: number) => {
    return price * (currencyRate ?? 1);
  };

  useEffect(() => {
    const loadAllowedCurrencies = async () => {
      if (allowedCurrencies.length > 0) {
        return;
      }

      const res = await api.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/getallowedcurrencies`,
        {
          params: {
            g_hash,
            user_id,
            store_id,
            company_id,
          },
        },
      );

      if (res.data.is_error === 1) return;

      const mappedCurrencies = res.data.allowed_currencies.map((c: any) => ({
        id: c.ac_id,
        currencyId: c.ac_currency_id,
        rate: Number(c.ac_rate_to_original),
        currencyCode: c.cc_currency_code,
        currencyName: c.cc_currency_name,
      }));

      dispatch(setAllowedCurrencies(mappedCurrencies));

      const storedSymbol = auth.currency_symbol;

      const defaultCurrency =
        mappedCurrencies.find((c: any) => c.currencyCode === storedSymbol) ||
        mappedCurrencies[0];

      if (defaultCurrency) {
        dispatch(
          setSelectedCurrency({
            id: defaultCurrency.id,
            rate: defaultCurrency.rate,
          }),
        );

        setCurrencySymbol(defaultCurrency.currencyCode);

        dispatch(
          updateLoginStringField({
            key: "currency_symbol",
            value: defaultCurrency.currencyCode,
          }),
        );
      }
    };

    loadAllowedCurrencies();
  }, []);

  const [modifiers, setModifiers] = useState<
    { id: number; name: string; price: number; quantity: number }[]
  >([]);
  const [kitchenStations, setKitchenStations] = useState<KitchenStationDB[]>(
    [],
  );

  const loadKitchenStations = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/getstationsname`,
        {
          params: {
            g_hash,
            user_id,
          },
        },
      );

      if (res.data?.is_error === 0) {
        setKitchenStations(res.data.lst_kitchens);
      }
    } catch (err) {
      console.error("Failed to load kitchen stations", err);
    }
  };

  useEffect(() => {
    loadKitchenStations();
  }, []);

  const { t } = useI18n(lang);

  const loadModifiers = async () => {
    const res = await api.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistmodifiers",
      {
        params: {
          g_hash,
          user_id,
        },
      },
    );

    if (res.data.is_error === 1) return;

    setModifiers(
      res.data.lst_modifiers.map((m: any) => ({
        id: m.m_id,
        name: m.m_modifier_name,
        price: Number(m.m_price_modifier),
        quantity: Number(m.m_quantity),
      })),
    );
  };

  useEffect(() => {
    loadModifiers();
  }, []);

  useEffect(() => {
    setCurrencySymbol(auth.currency_symbol || "");
  }, []);

  // useEffect(() => {
  //   const token = localStorage.getItem("access_token");

  //   if (!token) {
  //     forceLogout("You are not logged in. Please login.");
  //   }
  // }, []);

  async function fetchModifiersPerItem(itemId: number) {
    const res = await api.get(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/inventory/getlistmodifiersperitem`,
      {
        params: {
          g_hash,
          user_id,
          item_id: itemId,
        },
      },
    );

    if (res.data?.is_error === 1) return [];

    return res.data.data ?? [];
  }

  const dispatch = useAppDispatch();

  const loadMenu = async () => {
    if (menu.length > 0) {
      return;
    }

    const res = await api.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistofitems",
      {
        params: {
          g_hash,
          user_id,
        },
      },
    );

    if (res.data.is_error === 1) return;

    const mapped = res.data.lst_items.map((it: any) => ({
      id: it.mi_id,
      name: it.mi_item_name,
      price: Number(it.mi_base_price ?? 0),
      categoryId: it.mi_category_id,
      currency_code: it.currency_code,
      cc_id: it.cc_id,
      categoryName: it.category_name,
      kitchen_station_id: Number(it.mi_kitchen_station_id ?? 1),
      modifierGroups: [],
    }));

    dispatch(setMenuItems(mapped));
    console.log("mapped ", mapped);
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

  const loadCategories = async () => {
    const res = await api.get(
      process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/listitemcategories",
      {
        params: {
          g_hash,
          user_id,
        },
      },
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
        const response = await api.get(
          process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlisttables",
          {
            params: {
              g_hash,
              user_id,
            },
          },
        );

        const data = response.data.lst_tables;
        setTables(
          data.map((t: any) => ({
            id: t.ft_id,
            label: t.ft_label,
            numberSeats: t.ft_number_seats,
            statusId: t.ft_status_id ?? 0,
          })),
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
  const [order, setOrder] = useState<any>({
    id: uid(),
    guests: 0,
    items: [],
    createdAt: Date.now(),
    status: "open",
  });

  const ordersInfo = useAppSelector((s) => s.orders.orders);

  // Real-time WebSocket sync for orders and tables
  const { pausePolling, resumePolling } = useRealtimeSync(menu, setTables);

  // this useEffect responsable for reload ordersInfo on refresh
  // wait for redux-persist to hydrate
  const ordersLoaded = useAppSelector(
    (state) => state.orders._persist?.rehydrated,
  );

  useEffect(() => {
    if (!ordersLoaded) return;
    if (menu.length === 0) return;
    if (hydrated) return;

    //Check if ordersInfo exists and is an array
    if (!ordersInfo || !Array.isArray(ordersInfo) || ordersInfo.length === 0) {
      setHydrated(true);
      setHydrating(false);
      return;
    }

    const lastActiveId = localStorage.getItem("last_active_order_id");

    let orderToRestore: LocalOrder | null = null;

    //exact last active order
    if (lastActiveId) {
      const last = ordersInfo.find(
        (o) => o?.orderId === lastActiveId && !o?.isHeld,
      );
      if (last && Array.isArray(last.items) && last.items.length > 0) {
        orderToRestore = last;
      }
    }

    //unfinished takeaway checkout
    if (!orderToRestore) {
      orderToRestore =
        ordersInfo.find(
          (o) =>
            o?.checkoutDraft === true &&
            Array.isArray(o?.tableIds) &&
            o.tableIds.length > 0 &&
            o.tableIds[0] === 0 &&
            Array.isArray(o?.items) &&
            o.items.length > 0 &&
            !o?.isHeld &&
            o?.isPaid !== true,
        ) ?? null;
    }

    //any takeaway with items
    if (!orderToRestore) {
      orderToRestore =
        ordersInfo.find(
          (o) =>
            Array.isArray(o?.tableIds) &&
            o.tableIds.length > 0 &&
            o.tableIds[0] === 0 &&
            Array.isArray(o?.items) &&
            o.items.length > 0 &&
            !o?.isHeld,
        ) ?? null;
    }

    //any dine-in with items
    if (!orderToRestore) {
      orderToRestore =
        ordersInfo.find(
          (o) =>
            Array.isArray(o?.tableIds) &&
            o.tableIds.length > 0 &&
            o.tableIds[0] !== 0 &&
            Array.isArray(o?.items) &&
            o.items.length > 0 &&
            !o?.isHeld,
        ) ?? null;
    }

    if (
      !orderToRestore ||
      !Array.isArray(orderToRestore.items) ||
      orderToRestore.items.length === 0 ||
      orderToRestore.isPaid === true
    ) {
      setHydrated(true);
      setHydrating(false);
      return;
    }

    if (!orderToRestore) {
      setHydrated(true);
      setHydrating(false);
      return;
    }

    //get tableId with fallback
    const tableId =
      Array.isArray(orderToRestore.tableIds) &&
      orderToRestore.tableIds.length > 0
        ? orderToRestore.tableIds[0]
        : 0;

    // Set current order ID and table
    setCurrentOrderId(orderToRestore.orderId);
    setCurrentTableId(tableId === 0 ? null : tableId);

    // Restore order to UI - SAFE ITEMS ACCESS
    setOrder({
      id: orderToRestore.orderId,
      guests: 0,
      items: Array.isArray(orderToRestore.items) ? orderToRestore.items : [],
      createdAt: Date.now(),
      status: "open",
    });

    // Restore customer if available
    if (orderToRestore.customer) {
      applyCustomerToUI(orderToRestore.customer);
    } else {
      applyCustomerToUI(null);
    }

    // Mark as hydrated
    setHydrated(true);
    setHydrating(false);
  }, [ordersLoaded, menu.length, ordersInfo, hydrated]);

  useEffect(() => {
    if (!currentOrderId) {
      //only clear if we're hydrated
      if (hydrated) {
        localStorage.removeItem("last_active_order_id");
      }
      return;
    }

    // Don't update during hydration
    if (hydrating) return;
    localStorage.setItem("last_active_order_id", currentOrderId);
  }, [currentOrderId, hydrating, hydrated]);

  // Modals / Drawers
  const [modItem, setModItem] = useState<any>(null); // item being configured
  const [modSelected, setModSelected] = useState<AppliedModifier[]>([]);
  const [modQty, setModQty] = useState(1);
  const [editLine, setEditLine] = useState<any>(null);
  const [receiptHTML, setReceiptHTML] = useState<string | null>(null);
  const [takeawayPreview, setTakeawayPreview] = useState(false);
  const [customerType, setCustomerType] = useState("takeaway");
  // 2 for cash and 4 for card
  const [paymentType, setPaymentType] = useState<number | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_LINK;

  const [heldSnapshot, setHeldSnapshot] = useState<HeldSnapshot | null>(null);
  const [lastHeldOrderId, setLastHeldOrderId] = useState<string | null>(null);

  const applyCustomerToUI = (
    c:
      | {
          customer_id?: number;
          name?: string;
          phone?: string;
          address?: string;
        }
      | null
      | undefined,
  ) => {
    if (!c) {
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      return;
    }

    setSelectedCustomer({
      customer_id: c.customer_id,
      customer_name: c.name ?? "",
      customer_mobile: c.phone ?? "",
      customer_address: c.address ?? "",
    });

    setCustomerName(c.name ?? "");
    setCustomerPhone(c.phone ?? "");
    setCustomerAddress(c.address ?? "");
  };

  useEffect(() => {
    const snap = readHeldSnapshot();
    setHeldSnapshot(snap);

    const v = localStorage.getItem("last_held_order_id");
    if (v) setLastHeldOrderId(v);
  }, []);

  const [hasOpenCash, setHasOpenCash] = useState<boolean | undefined>(
    undefined,
  );

  const checkOpenCash = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/shift/getopencurrencies`,
        { params: { user_id, g_hash } },
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

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      const okCat = category === "All" || m.categoryName === category;
      const okSearch = !q || m.name.toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }, [search, category, menu]);

  const subtotalOriginal = useMemo(
    () =>
      order.items.reduce(
        (s: any, li: any) => s + (li.basePrice + li.priceExtra) * li.qty,
        0,
      ),
    [order.items],
  );

  const taxOriginal = subtotalOriginal * 0.11;
  const totalOriginal = subtotalOriginal + taxOriginal;

  const subtotal = convertPrice(subtotalOriginal);
  const tax = convertPrice(taxOriginal);
  const total = convertPrice(totalOriginal);

  function mergeTables(t1: number, t2: number) {
    const uiOrderForT1 =
      // detect if table 1 is active table mean the user trying to merge the table that is currently opened?
      currentTableId === t1 && currentOrderId
        ? // iza ee, get the order by id
          ordersInfo.find((o) => o.orderId === currentOrderId)
        : null;

    const uiOrderForT2 =
      currentTableId === t2 && currentOrderId
        ? ordersInfo.find((o) => o.orderId === currentOrderId)
        : null;

    const o1 = uiOrderForT1 ?? ordersInfo.find((o) => o.tableIds.includes(t1));

    const o2 = uiOrderForT2 ?? ordersInfo.find((o) => o.tableIds.includes(t2));
    if (!o1 && !o2) {
      alert("Both tables have no orders");
      return;
    }

    if (o1?.isHeld || o2?.isHeld) {
      alert("Cannot merge held orders. Unhold first.");
      return;
    }

    if (o1 && !o2) {
      dispatch(
        upsertOrder({
          ...o1,
          tableIds: Array.from(new Set([...o1.tableIds, t2])),
          mergedMeta: {
            primaryTable: t1,
            mergedAt: Date.now(),
          },
        }),
      );
      return;
    }

    if (!o1 && o2) {
      dispatch(
        upsertOrder({
          ...o2,
          tableIds: Array.from(new Set([...o2.tableIds, t1])),
          mergedMeta: {
            primaryTable: t2,
            mergedAt: Date.now(),
          },
        }),
      );
      return;
    }

    if (o1!.orderId === o2!.orderId) {
      alert("Same order already");
      return;
    }

    //preserve customer
    const mergedCustomer = o1!.customer?.name ? o1!.customer : o2!.customer;

    // we merge both orders
    const merged: LocalOrder = {
      orderId: o1!.orderId,

      tableIds: Array.from(new Set([...o1!.tableIds, ...o2!.tableIds])),

      items: [...(o1!.items || []), ...(o2!.items || [])],

      customer: mergedCustomer,

      checkoutDraft: o1!.checkoutDraft || o2!.checkoutDraft,

      mergedMeta: {
        primaryTable: t1,
        mergedAt: Date.now(),
      },

      isHeld: false,
    };

    dispatch(removeOrder(o2!.orderId));
    dispatch(upsertOrder(merged));

    if (currentTableId === t1 || currentTableId === t2) {
      setCurrentOrderId(merged.orderId);
      setCurrentTableId(t1);

      setOrder((prev: any) => ({
        ...prev,
        id: merged.orderId,
        items: merged.items,
      }));

      // restore customer ui
      applyCustomerToUI(merged.customer ?? null);
    }
  }

  const selectTable = async (table: Table) => {
    // kabasna 3l table that is already open y3ne second click
    if (!mergeMode && !transferMode && currentTableId === table.id) {
      // takeaway order
      const takeaway = ordersInfo.find(
        (o) => o.tableIds?.[0] === 0 && o.items?.length > 0 && !o.isHeld,
      );

      if (takeaway) {
        setCurrentOrderId(takeaway.orderId);
        // bs nghayer l table id to null y3ne rj3na lal takeaway order
        setCurrentTableId(null);

        setOrder({
          id: takeaway.orderId,
          guests: 0,
          items: takeaway.items,
          createdAt: Date.now(),
          status: "open",
        });

        applyCustomerToUI(takeaway.customer ?? null);
        return;
      }

      // if no takeaway just deactivate table view
      setCurrentTableId(null);
      setCurrentOrderId(null);

      setOrder({
        id: uid(),
        guests: 0,
        items: [],
        createdAt: Date.now(),
        status: "open",
      });

      return;
    }

    if (!mergeMode && currentTableId === table.id) {
      return;
    }

    if (transferMode) {
      if (currentTableId === null) {
        alert("No active table to transfer from");
        setTransferMode(false);
        return;
      }

      // prevent transferring to same table
      if (table.id === currentTableId) return;

      transferTable(currentTableId, table.id);

      setTransferMode(false);
      return;
    }

    if (mergeMode) {
      if (firstMergeTable === null) {
        // accept active table as first
        const hasOrder =
          currentTableId === table.id ||
          ordersInfo.some((o) => o.tableIds.includes(table.id));

        if (!hasOrder) {
          alert("First table must contain an order");
          return;
        }

        setFirstMergeTable(table.id);
        alert(`Now select the second table to merge with ${table.label}`);
        return;
      }

      mergeTables(firstMergeTable, table.id);
      setMergeMode(false);
      setFirstMergeTable(null);
      return;
    }

    if (editingOrderId) {
      const oid = String(editingOrderId);
      setCurrentOrderId(oid);
      setCurrentTableId(table.id);

      const order = ordersInfo.find((o) => o.orderId === oid);
      if (order) {
        dispatch(
          upsertOrder({
            ...order,
            tableIds: [table.id],
          }),
        );
      }

      setOrder((prev: any) => ({ ...prev, id: oid }));
      return;
    }

    const existing = ordersInfo?.find(
      (o) => o.tableIds.includes(table.id) && !o.isHeld,
    );

    const held = ordersInfo.find(
      (o) => o.isHeld && o.tableIds.includes(table.id),
    );

    if (held) {
      dispatch(
        upsertOrder({
          ...held,
          isHeld: false,
        }),
      );

      const snap = readHeldSnapshot();
      if (snap?.orderId === held.orderId) {
        clearHeldSnapshot();
        setHeldSnapshot(null);
        setLastHeldOrderId(null);
      }

      setCurrentOrderId(held.orderId);
      setCurrentTableId(table.id);

      setOrder({
        id: held.orderId,
        items: held.items || [],
        createdAt: Date.now(),
        status: "open",
      });

      // restore customer
      applyCustomerToUI(held.customer ?? null);

      return;
    }

    if (existing) {
      setCurrentOrderId(existing.orderId);
      setCurrentTableId(table.id);

      setOrder({
        id: existing.orderId,
        items: existing.items || [],
        createdAt: Date.now(),
        status: "open",
      });

      // restore customer
      applyCustomerToUI(existing.customer ?? null);

      return;
    }
    const tempOrderId = TEMP_ORDER_PREFIX + uid();

    setCurrentTableId(table.id);
    setCurrentOrderId(tempOrderId);

    setOrder({
      id: tempOrderId,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });

    dispatch(
      upsertOrder({
        orderId: tempOrderId,

        tableIds: [table.id],

        items: [],

        customer: {
          customer_id: null,
          name: "",
          phone: "",
          address: "",
        },

        checkoutDraft: false,

        isHeld: false,
      }),
    );

    applyCustomerToUI(null);
    setTakeawayPreview(false);

    const isTakeaway = table.id === 0;
    const orderType = isTakeaway ? "takeaway" : "dine_in";

    // Pause polling while user is building this order
    pausePolling();

    api
      .post(API_URL + "/api/orders/createemptyorder", {
        g_hash,
        user_id,
        store_id,
        company_id,
        order_type: orderType,
      })
      .then((res) => {
        if (res.data?.is_error) return;

        const realOrderId = String(res.data.order_id);

        dispatch(replaceOrderId({ tempId: tempOrderId, realId: realOrderId }));

        setCurrentOrderId((id) => (id === tempOrderId ? realOrderId : id));
        setOrder((o: any) =>
          o.id === tempOrderId ? { ...o, id: realOrderId } : o,
        );

        const last = localStorage.getItem("last_active_order_id");
        if (last === tempOrderId) {
          localStorage.setItem("last_active_order_id", realOrderId);
        }
      })
      .catch((err) => {
        console.error("❌ Error creating order:", err);
      });
  };

  useEffect(() => {
    async function loadPendingOrders() {
      const res = await api.post(API_URL + "/api/orders/sync", {
        g_hash,
        user_id,
        store_id,
      });

      if (res.data.is_error) return;

      const loadedOrders: LocalOrder[] = res.data.orders.map((o: any) => ({
        orderId: String(o.order_id),
        tableIds: o.tables?.length ? o.tables : [0],
        items: o.items.map((it: any) => {
          const menuItem = menu.find((m) => m.id === it.item_id);

          const mods: AppliedModifier[] = (it.modifiers ?? []).map(
            (m: any) => ({
              groupId: 1,
              optionId: Number(m.modifier_id),
              qty: normalizeModifierQty(m.quantity ?? m.qty ?? 1),
            }),
          );

          return {
            uid: uid(),
            itemId: it.item_id,
            name: menuItem?.name ?? "",
            qty: it.qty,
            basePrice: Number(it.unit_price),
            stationId: it.station_id ?? menuItem?.kitchen_station_id ?? 1,
            note: normalizeNote(it.notes),
            modifiers: mods,
            priceExtra: priceFromModifiers(menuItem?.modifierGroups, mods),
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

      dispatch(upsertManyOrders(loadedOrders));
    }

    if (menu.length > 0) {
      loadPendingOrders();
    }
  }, [menu]);

  useEffect(() => {
    if (!ordersInfo?.length) return;

    const fixed = ordersInfo.map((o) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items : [],
      tableIds: Array.isArray(o.tableIds) ? o.tableIds : [0],
    }));

    dispatch(upsertManyOrders(fixed));
  }, [ordersLoaded]);

  useEffect(() => {
    if (!hydrated || !currentOrderId) return;

    const info = ordersInfo.find((o) => o.orderId === currentOrderId);
    if (!info?.customer) {
      applyCustomerToUI(null);
      return;
    }

    applyCustomerToUI({
      customer_id: info.customer.customer_id,
      name: info.customer.name,
      phone: info.customer.phone,
      address: info.customer.address,
    });
  }, [hydrated, currentOrderId, ordersInfo]);

  const addItemStart = async (item: any) => {
    pausePolling();
    const rawModifiers = await fetchModifiersPerItem(item.id);

    const modifierGroups: ModifierGroup[] = rawModifiers.length
      ? [
          {
            id: 1,
            name: "Options",
            type: "optional",
            maxSelect: 0,
            options: rawModifiers.map((m: any) => {
              const modifier = modifiers.find(
                (x) => x.id === Number(m.fk_modifier_id),
              );

              return {
                id: Number(m.fk_modifier_id),
                rowId: Number(m.im_id),
                name: modifier?.name ?? "",
                priceDelta: modifier?.price ?? 0,
                quantity: normalizeModifierQty(m.im_quantity, 1),
              };
            }),
          },
        ]
      : [];

    dispatch(
      updateItemModifiers({
        id: item.id,
        modifierGroups,
      }),
    );

    setModItem({ ...item, modifierGroups });
    setModSelected([]);
  };

  const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
    setModSelected((prev) => {
      const exists = prev.some(
        (s) => s.groupId === group.id && s.optionId === option.id,
      );

      if (exists) {
        return prev.filter(
          (s) => !(s.groupId === group.id && s.optionId === option.id),
        );
      }

      return [
        ...prev,
        {
          groupId: group.id,
          optionId: option.id,
          qty: normalizeModifierQty(option.quantity, 1),
        },
      ];
    });
  };

  const confirmAddToOrder = async () => {
    if (!modItem) return;

    let orderId = currentOrderId;
    
    if (!orderId) {
      orderId = TEMP_ORDER_PREFIX + uid();

      setCurrentOrderId(orderId);
      setCurrentTableId(null);

      // save to localStorage immediately
      localStorage.setItem("last_active_order_id", orderId);

      dispatch(
        upsertOrder({
          orderId,
          tableIds: [0],
          items: [],
          checkoutDraft: true,
        }),
      );

      setOrder({
        id: orderId,
        guests: 0,
        items: [],
        createdAt: Date.now(),
        status: "open",
      });
    }

    const priceExtra = priceFromModifiers(modItem.modifierGroups, modSelected);

    const newLine: OrderItem = {
      uid: uid(),
      itemId: modItem.id,
      name: modItem.name,
      basePrice: modItem.price,
      qty: 1,
      stationId: modItem.kitchen_station_id,
      note: "",
      modifiers: modSelected,
      priceExtra,
      sentToKitchen: false,
    };

    setOrder((o: any) => ({
      ...o,
      id: orderId,
      items: [...(o.items ?? []), newLine],
    }));

    const order = ordersInfo.find((o) => o.orderId === orderId);

    dispatch(
      updateOrderItems({
        id: orderId,
        items: [...(order?.items ?? []), newLine],
      }),
    );

    if (editingOrderId) setEditDirty(true);

    setModItem(null);
  };

  async function ensureRealOrderId(): Promise<string> {
    // already real numeric id
    if (currentOrderId && !String(currentOrderId).startsWith("tmp_")) {
      return String(currentOrderId);
    }

    const tableKey = currentTableId ? Number(currentTableId) : 0;
    const isTakeaway = tableKey === 0;
    const orderType = isTakeaway ? "takeaway" : "dine_in";

    // create order id
    const res = await api.post(API_URL + "/api/orders/createemptyorder", {
      g_hash,
      user_id,
      store_id,
      company_id,
      order_type: orderType,
    });

    if (res.data?.is_error) {
      throw new Error(res.data?.error_msg || "Failed to create order");
    }

    const realOrderId = String(res.data.order_id);

    // if we had a tmp id in redux, replace it
    if (currentOrderId && String(currentOrderId).startsWith("tmp_")) {
      dispatch(replaceOrderId({ tempId: currentOrderId, realId: realOrderId }));
    }

    setCurrentOrderId(realOrderId);
    setOrder((o: any) => ({ ...o, id: realOrderId }));

    const last = localStorage.getItem("last_active_order_id");
    if (last && last === currentOrderId) {
      localStorage.setItem("last_active_order_id", realOrderId);
    }

    return realOrderId;
  }

  const sendToKitchen = async () => {
    try {
      const orderData = ordersInfo.find((o) => o.orderId === currentOrderId);

      if (!orderData) {
        return alert("Order not found");
      }
      if (!g_hash || !user_id) {
        return alert("Missing auth");
      }
      const newItems = orderData.items.filter((i) => !i.sentToKitchen);

      if (newItems.length === 0) {
        alert("This order was already sent to kitchen");
        return;
      }

      //make sure we have REAL order id for dine-in AND takeaway
      const realOrderId = await ensureRealOrderId();

      const isTakeaway = !currentTableId; // null => takeaway
      const orderType = isTakeaway ? "takeaway" : "dine_in";

      const payload = {
        g_hash,
        user_id,
        customer_id: selectedCustomer?.customer_id ?? 0,

        order_id: Number(realOrderId),
        order_type: orderType,

        // for takeaway send "0"
        table_ids: (orderData.tableIds?.length ? orderData.tableIds : [0]).join(
          ",",
        ),

        sub_total: subtotalOriginal,
        discount: 0,
        total: totalOriginal,

        order_items: JSON.stringify(
          newItems.map((li) => ({
            item_id: li.itemId,
            quantity: li.qty,
            unit_price: li.basePrice + li.priceExtra,
            discount: 0,
            station_id: li.stationId,
            notes: li.note || "",
            modifiers: (li.modifiers ?? []).map((m: any) => ({
              id: Number(m.optionId),
            })),
          })),
        ),
      };

      const res = await axios.post(
        API_URL + "/api/orders/updateorder",
        payload,
      );

      if (res.data?.is_error) {
        alert(res.data.error_msg);
        return;
      }

      // Mark items as sent for BOTH types
      const updatedItems = orderData.items.map((x) =>
        !x.sentToKitchen ? { ...x, sentToKitchen: true } : x,
      );

      dispatch(
        updateOrderItems({
          id: String(realOrderId),
          items: updatedItems,
        }),
      );

      if (!isTakeaway) {
        // Dine-in sent to kitchen: restore next unpaid order if any
        const latestOrders = store.getState().orders.orders;
        const nextOrder = latestOrders.find(
          (o) =>
            !o.isPaid &&
            !o.isHeld &&
            Array.isArray(o.items) &&
            o.items.length > 0,
        );

        if (nextOrder) {
          const nextTableId =
            nextOrder.tableIds?.[0] === 0
              ? null
              : nextOrder.tableIds?.[0] ?? null;
          setCurrentOrderId(nextOrder.orderId);
          setCurrentTableId(nextTableId);
          setOrder({
            id: nextOrder.orderId,
            guests: 0,
            items: nextOrder.items,
            createdAt: Date.now(),
            status: "open",
          });
          applyCustomerToUI(nextOrder.customer ?? null);
        } else {
          setCurrentTableId(null);
          setCurrentOrderId(null);
          setOrder({
            id: uid(),
            guests: 0,
            items: [],
            createdAt: Date.now(),
            status: "open",
          });
        }
      } else {
        // Takeaway: keep showing the same order
        setOrder((prev: any) => ({
          ...prev,
          id: realOrderId,
          items: updatedItems,
        }));
        setCurrentTableId(null);
        setCurrentOrderId(realOrderId);
      }

      // Resume polling + sync immediately so other browsers see the update
      resumePolling();

      alert("Order sent to kitchen");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Send to kitchen failed");
    }
  };

  /* -------------------- edit line -------------------- */
  const openEdit = (li: OrderItem) =>
    setEditLine({
      ...li,
      modifiers: li.modifiers ?? [],
    });

  const applyEdit = () => {
    if (!editLine) return;

    const it: any = menu.find((m) => m.id === editLine.itemId);
    const extra = priceFromModifiers(it?.modifierGroups, editLine.modifiers);
    const updated = { ...editLine, priceExtra: extra };

    setOrder((prev: any) => ({
      ...prev,
      items: prev.items.map((x: any) => (x.uid === updated.uid ? updated : x)),
    }));

    const order = ordersInfo.find((o) => o.orderId === currentOrderId);

    dispatch(
      updateOrderItems({
        id: currentOrderId!,
        items: order!.items.map((x: any) =>
          x.uid === updated.uid ? updated : x,
        ),
      }),
    );

    if (editingOrderId) setEditDirty(true);

    setEditLine(null);
  };

  const removeLine = (uidLine: UID) => {
    setOrder((o: any) => ({
      ...o,
      items: o.items.filter((x: any) => x.uid !== uidLine),
    }));

    dispatch(
      updateOrderItems({
        id: currentOrderId!,
        items: order.items.filter((x: any) => x.uid !== uidLine),
      }),
    );

    if (editingOrderId) setEditDirty(true);
  };

  const itemsForCurrentTable = useMemo(() => {
    if (!currentOrderId) return [];

    const info = ordersInfo.find((o) => o.orderId === currentOrderId);
    return info?.items ?? [];
  }, [ordersInfo, currentOrderId]);

  const saveOrderToDatabase = async (finalCustomerId?: number) => {
    // sync edited order
    if (editingOrderId && editDirty) {
      await syncEditedOrderIfNeeded(editingOrderId);
      return;
    }

    if (editingOrderId && !editDirty) {
      dispatch(removeOrder(currentOrderId!));

      setEditingOrderId(null);
      setEditDirty(false);

      //reset ui order
      setOrder({
        id: uid(),
        guests: 0,
        items: [],
        createdAt: Date.now(),
        status: "open",
      });

      //clear selection
      setCurrentOrderId(null);
      setCurrentTableId(null);

      //cleanup localStorage
      localStorage.removeItem("last_active_order_id");
      return;
    }

    const tableKey = currentTableId ? Number(currentTableId) : 0;
    const isTakeaway = tableKey === 0;

    const orderType = isTakeaway ? "takeaway" : "dine_in";

    const baseCurrencyId = Number(auth.company_currency);

    if (!baseCurrencyId) {
      alert("Company base currency is missing");
      return;
    }

    let orderData =
      ordersInfo.find((o) => o.orderId === currentOrderId) ??
      ordersInfo.find((o) => o.tableIds.includes(tableKey));

    if (!orderData) {
      orderData = {
        orderId: currentOrderId ?? uid(),
        tableIds: [tableKey],
        items: order.items,
      };
    }

    if (!orderData.items || orderData.items.length === 0) {
      return alert("No items to save");
    }

    const selectedCur = allowedCurrencies.find(
      (c) => c.id === selectedCurrencyId,
    );
    const displayRate = selectedCur?.rate ?? 1;
    const displayCode = selectedCur?.currencyCode ?? CurrencySymbol;

    const formattedItems = order.items.map((li: any) => {
      const unitBase = li.basePrice + li.priceExtra;

      return {
        item_id: Number(li.itemId ?? li.id),
        quantity: li.qty,
        unit_price: unitBase,

        price: unitBase * displayRate,

        discount: 0,
        // station_id: li.stationId,
        notes: li.note || "",

        modifiers: li.modifiers.map((m: any) => ({
          id: m.optionId,
        })),
      };
    });

    let customer_id = 0;
    let delName = "";
    let delPhone = "";
    let delAddress = "";

    if (selectedCustomer) {
      customer_id = selectedCustomer.customer_id;
      delName = selectedCustomer.customer_name ?? "";
      delPhone = selectedCustomer.customer_mobile ?? "";
      delAddress = selectedCustomer.customer_address ?? "";
    }

    if (customerName?.trim()) delName = customerName.trim();
    if (customerPhone?.trim()) delPhone = customerPhone.trim();
    if (customerAddress?.trim()) delAddress = customerAddress.trim();

    const subTotalBase = subtotalOriginal;
    const taxBase = subTotalBase * 0.11;
    const totalBase = subTotalBase + taxBase;

    const subTotalDisplay = convertPrice(subTotalBase);
    const totalDisplay = convertPrice(totalBase);

    const displayCurrencyId = selectedCur?.currencyId;

    const realOrderId = await ensureRealOrderId();

    const payload = {
      // order_id: orderType === "dine_in" ? dineInOrderId : null,
      order_id: Number(realOrderId),
      g_hash,
      warehouse_id,
      user_id,
      company_id,
      store_id,

      currency_id: baseCurrencyId,
      currency_display_id: Number(displayCurrencyId),
      currency_display_code: displayCode,
      currency_display_rate: displayRate,

      order_type: orderType,
      table_id: orderData.tableIds.join(","),

      discount: 0,

      customer_id: finalCustomerId ?? customer_id,
      delcustomername: delName,
      delcustomerphone: delPhone,
      delcustomeraddress: delAddress,

      customer_type: customerType,

      sub_total: subTotalBase,
      total: totalBase,

      sub_total_display: subTotalDisplay,
      total_display: totalDisplay,

      payment_type: paymentType ?? 2,
      order_items: JSON.stringify(formattedItems),
    };

    const response = await api.post(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/saveorder`,
      payload,
    );

    if (response.data?.is_error === 1) {
      alert(response.data.error_msg || "Save order failed");
      return;
    }

    if (response.data?.receipt_html) {
      setReceiptHTML(response.data.receipt_html);
    }

    //delete after pay&close

    // the real id
    const finalId = String(realOrderId);
    dispatch(
      upsertOrder({
        ...orderData,
        orderId: finalId,
        isPaid: true,
        checkoutDraft: false,
      }),
    );

    // remove by real id
    dispatch(removeOrder(finalId));

    // clear persistence sources
    localStorage.removeItem("last_active_order_id");
    localStorage.removeItem("pos_held_order_snapshot");

    // Restore next unpaid order if any, otherwise reset UI
    const latestOrders = store.getState().orders.orders;
    const nextOrder = latestOrders.find(
      (o) =>
        !o.isPaid &&
        !o.isHeld &&
        Array.isArray(o.items) &&
        o.items.length > 0,
    );

    if (nextOrder) {
      const nextTableId =
        nextOrder.tableIds?.[0] === 0
          ? null
          : nextOrder.tableIds?.[0] ?? null;
      setCurrentOrderId(nextOrder.orderId);
      setCurrentTableId(nextTableId);
      setOrder({
        id: nextOrder.orderId,
        guests: 0,
        items: nextOrder.items,
        createdAt: Date.now(),
        status: "open",
      });
      applyCustomerToUI(nextOrder.customer ?? null);
    } else {
      setCurrentOrderId(null);
      setCurrentTableId(null);
      setOrder({
        id: uid(),
        guests: 0,
        items: [],
        createdAt: Date.now(),
        status: "open",
      });
      applyCustomerToUI(null);
    }

    // Resume polling + sync immediately so other browsers see the paid order removed
    resumePolling();

    return;
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

  useEffect(() => {
    const actives = (ordersInfo || [])
      .filter((o) => !o?.isHeld && Array.isArray(o?.items) && o.items.length > 0)
      .flatMap((o) => o.tableIds || []);

    setActiveTables(Array.from(new Set(actives)));
  }, [ordersInfo]);

  // Clear local UI when current order was removed from Redux (e.g. paid from another browser)
  useEffect(() => {
    if (!currentOrderId) return;
    const still = ordersInfo.some((o) => o.orderId === currentOrderId);
    if (!still) {
      setCurrentTableId(null);
      setCurrentOrderId(null);
      setOrder({ id: uid(), guests: 0, items: [], createdAt: Date.now(), status: "open" });
      localStorage.removeItem("last_active_order_id");
    }
  }, [ordersInfo, currentOrderId]);

  const startNewOrder = () => {
    setEditingOrderId(null);

    setCurrentTableId(null);
    setCurrentOrderId(null);

    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });

    alert("Select a table to start a new order");
  };

  const currentDisplayRate = currencyRate ?? 1;

  const baseTotalOriginal = total / currentDisplayRate;

  const paidCurrency = allowedCurrencies.find((c) => c.id === paidCurrencyId);
  const paidRate = paidCurrency?.rate ?? 1;

  const paidInOriginal = paidAmount / paidRate;

  const remainingOriginal = Math.max(0, baseTotalOriginal - paidInOriginal);
  const returnOriginal = Math.max(0, paidInOriginal - baseTotalOriginal);

  const remainingCurrency = allowedCurrencies.find(
    (c) => c.id === remainingCurrencyId,
  );
  const remainingRate = remainingCurrency?.rate ?? 1;
  const remainingToPay = remainingOriginal * remainingRate;

  const returnCurrency = allowedCurrencies.find(
    (c) => c.id === returnCurrencyId,
  );
  const returnRate = returnCurrency?.rate ?? 1;
  const remainingToReturn = returnOriginal * returnRate;

  const displayTotal = total;

  const updateLineQty = (lineUid: string, delta: number) => {
    setOrder((prev: any) => ({
      ...prev,
      items: prev.items.map((x: any) =>
        x.uid === lineUid ? { ...x, qty: Math.max(1, x.qty + delta) } : x,
      ),
    }));

    const order = ordersInfo.find((o) => o.orderId === currentOrderId);

    if (order) {
      dispatch(
        updateOrderItems({
          id: currentOrderId!,
          items: order.items.map((x: any) =>
            x.uid === lineUid ? { ...x, qty: Math.max(1, x.qty + delta) } : x,
          ),
        }),
      );
    }
    if (editingOrderId) setEditDirty(true);
  };

  const holdOrder = () => {
    if (posDisabled) {
      return;
    }
    if (!currentOrderId) {
      return;
    }

    // get info for current order
    const info = ordersInfo.find((o) => o.orderId === currentOrderId);

    if (!info) {
      return;
    }

    if (!info.items?.length) {
      alert("Cannot hold empty order");
      return;
    }

    if (info.isHeld) {
      return;
    }

    const otherHeld = ordersInfo.find(
      (o) => o.isHeld && o.orderId !== currentOrderId,
    );

    if (otherHeld) {
      alert("Another order is already on hold");
      return;
    }

    const snap: HeldSnapshot = {
      orderId: currentOrderId,
      tableIds: [currentTableId ?? 0],
      items: info.items,
      heldAt: Date.now(),
    };

    writeHeldSnapshot(snap);
    setHeldSnapshot(snap);
    setLastHeldOrderId(currentOrderId);

    dispatch(
      upsertOrder({
        ...info,

        isHeld: true,

        // freeze current customer state
        customer: info.customer ?? {
          customer_id: null,
          name: "",
          phone: "",
          address: "",
        },
      }),
    );

    // reset ui
    setCurrentOrderId(null);
    setCurrentTableId(null);

    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });
  };

  const activeHeldOrder = useMemo(() => {
    if (heldSnapshot?.orderId) return heldSnapshot;

    if (lastHeldOrderId) {
      const fromList = ordersInfo.find(
        (o) => o.isHeld && o.orderId === lastHeldOrderId,
      );
      if (fromList) {
        return {
          orderId: fromList.orderId,
          tableIds: fromList.tableIds ?? [0],
          items: fromList.items ?? [],
          heldAt: Date.now(),
        } as HeldSnapshot;
      }
    }

    const anyHeld = ordersInfo.find((o) => o.isHeld);
    if (!anyHeld) return null;

    return {
      orderId: anyHeld.orderId,
      tableIds: anyHeld.tableIds ?? [0],
      items: anyHeld.items ?? [],
      heldAt: Date.now(),
    } as HeldSnapshot;
  }, [heldSnapshot, lastHeldOrderId, ordersInfo]);

  const canHold = useMemo(() => {
    if (posDisabled) return false;
    if (!currentOrderId) return false;
    if (!order.items?.length) return false;

    const info = ordersInfo.find((o) => o.orderId === currentOrderId);
    if (info?.isHeld) return false;

    if (activeHeldOrder?.orderId === currentOrderId) return false;

    return true;
  }, [posDisabled, currentOrderId, order.items, ordersInfo, activeHeldOrder]);

  const canLoadHeld = useMemo(() => {
    if (posDisabled) return false;
    return (
      !!activeHeldOrder?.orderId && (activeHeldOrder.items?.length ?? 0) > 0
    );
  }, [posDisabled, activeHeldOrder]);

  const loadHeldOrder = () => {
    if (posDisabled) {
      return;
    }

    const snap = activeHeldOrder ?? readHeldSnapshot();
    if (!snap?.orderId) {
      return;
    }

    const info = ordersInfo.find((o) => o.orderId === snap.orderId);
    if (!info) {
      return;
    }

    // unhold
    dispatch(
      upsertOrder({
        ...info,
        isHeld: false,
      }),
    );

    //restore ui
    setCurrentOrderId(info.orderId);

    const tableId =
      info.tableIds?.length && info.tableIds[0] !== 0 ? info.tableIds[0] : null;

    setCurrentTableId(tableId);

    setOrder({
      id: info.orderId,
      guests: 0,
      items: info.items ?? [],
      createdAt: Date.now(),
      status: "open",
    });

    // restore customer
    applyCustomerToUI(info.customer ?? null);

    clearHeldSnapshot();
    setHeldSnapshot(null);
    setLastHeldOrderId(null);
  };

  async function syncEditedOrderIfNeeded(orderId: number) {
    if (!editDirty) return;

    const updatedItems = orderItemsToUIItems(order.items, menu);

    await api.post(`${process.env.NEXT_PUBLIC_API_LINK}/api/orders/saveorder`, {
      g_hash,
      user_id,
      store_id,
      warehouse_id,

      order_id: orderId,

      updated_items: JSON.stringify(
        updatedItems.map((it) => ({
          item_id: it.itemId,
          station_id: it.stationId,
          quantity: it.qty,
          unit_price: it.unit_price,
          notes: it.notes ?? "",
          modifiers: it.modifiers ?? [],
        })),
      ),

      customer_id: selectedCustomer?.customer_id ?? null,
      delcustomername: customerName ?? "",
      delcustomerphone: customerPhone ?? "",
      delcustomeraddress: customerAddress ?? "",
      customer_type: order.orderType ?? null,
    });

    setOriginalItems(updatedItems);
    setEditDirty(false);

    dispatch(removeOrder(currentOrderId!));

    setEditingOrderId(null);
    setEditDirty(false);

    //reset ui order
    setOrder({
      id: uid(),
      guests: 0,
      items: [],
      createdAt: Date.now(),
      status: "open",
    });

    //clear selection
    setCurrentOrderId(null);
    setCurrentTableId(null);

    //cleanup localStorage
    localStorage.removeItem("last_active_order_id");
  }

  const persistCustomerToOrder = (customer: {
    customer_id?: number;
    name?: string;
    phone?: string;
    address?: string;
  }) => {
    if (!currentOrderId) return;
    applyCustomerToUI(customer);

    const order = ordersInfo.find((o) => o.orderId === currentOrderId);

    dispatch(
      upsertOrder({
        ...order!,
        customer: { ...customer },
      }),
    );

    if (editingOrderId) setEditDirty(true);
  };

  useEffect(() => {
    if (!currentOrderId) return;
    if (hydrating) return;

    localStorage.setItem("last_active_order_id", currentOrderId);
  }, [currentOrderId, hydrating]);


  useEffect(() => {
    if (ordersLoaded) {
      setHydrated(true);
      setHydrating(false);
    }
  }, [ordersLoaded]);

  function transferTable(fromTable: number, toTable: number) {
    // find order linked to fromTable
    const existing = ordersInfo.find(
      (o) => o.tableIds.includes(fromTable) && !o.isHeld,
    );

    if (!existing) {
      alert("No order on this table");
      return;
    }

    if (existing.isHeld) {
      alert("Cannot transfer held order");
      return;
    }

    dispatch(
      upsertOrder({
        ...existing,
        tableIds: [toTable],
      }),
    );

    // if user is viewing this order 3mal update ui
    if (currentTableId === fromTable) {
      setCurrentTableId(toTable);
      setCurrentOrderId(existing.orderId);

      setOrder((prev: any) => ({
        ...prev,
        id: existing.orderId,
        items: existing.items,
      }));
    }
  }

  console.log("AUTH ", auth);

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
                onClick={() => {
                  if (currentTableId === null) {
                    alert("Open a table first, then press Transfer.");
                    return;
                  }

                  setTransferMode(true);
                  alert(
                    `Select destination table to transfer from ${currentTableId}`,
                  );
                }}
              >
                {t.POS.transfer}
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
          <div className="grid grid-cols-2 gap-4">
            {filteredMenu
              .filter(
                (m) =>
                  selectedCategory === 0 || m.categoryId === selectedCategory,
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
                    {CurrencySymbol} {money(convertPrice(item.price))}
                  </div>

                  <span className="mt-1 inline-flex self-start max-w-full text-[11px] rounded-lg bg-gray-100 px-2 py-1 text-gray-600 break-words leading-tight">
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
                disabled={posDisabled || (!canHold && !canLoadHeld)}
                onClick={canLoadHeld ? loadHeldOrder : holdOrder}
              >
                {canLoadHeld ? "Load" : t.POS.hold}
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
                disabled={posDisabled}
                onClick={startNewOrder}
                className={`inline-flex items-center gap-2
    rounded-xl border border-gray-200
    bg-white px-3 py-2
    text-xs font-semibold text-gray-800
    hover:bg-gray-50
    ${
      posDisabled
        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
        : ""
    }`}
              >
                <PlusSquare className="h-4 w-4" />
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
                onClick={() => {
                  const def = selectedCurrencyId ?? allowedCurrencies[0]?.id;
                  setPaidAmount(0);
                  setPaidCurrencyId(def);
                  setRemainingCurrencyId(def);
                  setReturnCurrencyId(def);

                  setPaymentPopupOpen(true);
                }}
              >
                <Receipt className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setLoadOrderOpen(true);
                }}
                className="rounded-xl border px-3 py-2 text-xs font-semibold"
              >
                <Edit3 className="h-4 w-4" />
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
                {itemsForCurrentTable.map((li: any) => {
                  const unitDisplay = convertPrice(
                    li.basePrice + li.priceExtra,
                  );
                  const lineTotalDisplay = unitDisplay * li.qty;
                  const isTakeawayNow = (tableId: number | null) => !tableId;

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
                              {kitchenStations.find(
                                (k) => k.ks_id === li.stationId,
                              )?.ks_name ?? "—"}
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
                                .map((m: any) => {
                                  const it = menu.find(
                                    (x) => x.id === li.itemId,
                                  );
                                  const g = it?.modifierGroups?.find(
                                    (gg: any) => gg.id === m.groupId,
                                  );
                                  const o = g?.options.find(
                                    (oo: any) => oo.id === m.optionId,
                                  );
                                  const fallback = resolveModifierFromMaster(
                                    modifiers,
                                    m.optionId,
                                  );

                                  return `${o?.name ?? fallback.name} × ${m.qty}`;
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
                              onClick={() => updateLineQty(li.uid, -1)}
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
                              onClick={() => updateLineQty(li.uid, +1)}
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
                            {CurrencySymbol} {money(lineTotalDisplay)}
                          </div>
                          {/* <div className="text-xs text-gray-500">
                            {money(li.basePrice)} {t.POS.base}
                            {li.priceExtra
                              ? ` + ${money(li.priceExtra)} opts`
                              : ""}
                          </div> */}
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

            {/* {!currentTableId && ( */}
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

              {/* Currency Buttons */}
              {allowedCurrencies.length > 1 && (
                <div
                  className={`mt-3 grid gap-2
      ${
        allowedCurrencies.length <= 3
          ? `grid-cols-${allowedCurrencies.length}`
          : "grid-cols-2"
      }
    `}
                >
                  {allowedCurrencies.map((c) => {
                    const active = selectedCurrencyId === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={posDisabled}
                        onClick={() => {
                          dispatch(
                            setSelectedCurrency({
                              id: c.id,
                              rate: c.rate,
                            }),
                          );

                          setCurrencySymbol(c.currencyCode);
                          dispatch(
                            updateLoginStringField({
                              key: "currency_symbol",
                              value: c.currencyCode,
                            }),
                          );
                        }}
                        className={`h-11 w-full
    inline-flex items-center justify-center
    whitespace-nowrap overflow-hidden
    rounded-xl border px-3
    text-sm font-semibold transition
    ${
      active
        ? "bg-orange-500 border-orange-500 text-white shadow-sm"
        : "bg-white border-gray-300 text-gray-800 hover:bg-orange-50"
    }
            ${
              posDisabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                : ""
            }
          `}
                      >
                        {c.currencyCode}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-between gap-2 w-full">
              <button
                disabled={order.items.length === 0 || posDisabled}
                onClick={sendToKitchen}
                className={`w-full group flex items-center justify-center items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
              >
                <Send className="h-4 w-4" /> {t.POS.sendToKitchen}
              </button>

              <button
                disabled={posDisabled}
                className={`w-full flex items-center justify-center group gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105${
                  posDisabled
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
                    : "hover:bg-emerald-700"
                }`}
                onClick={() => {
                  // const tableKey = currentTableId ?? 0;
                  setCustomerDrawerOpen(true);
                  setTakeawayPreview(true);

                  // if (tableKey === 0 && !selectedCustomer && !customerName) {
                  //   setCustomerDrawerOpen(true);
                  //   setTakeawayPreview(true);
                  // }

                  // if (tableKey === 0) {
                  //   setCustomerDrawerOpen(true);
                  //   return;
                  // }

                  // setPreviewTotals({
                  //   subtotal,
                  //   total,
                  //   discount: 0,
                  // });

                  // setPreviewPopupOpen(true);
                }}
              >
                {t.POS.payClose}
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
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white p-0 shadow-xl">
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
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {modItem.modifierGroups?.map((g: any) => {
                    const inGroup = modSelected.filter(
                      (s) => s.groupId === g.id,
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
                          {g.options.map((op: any) => {
                            const selected = modSelected.find(
                              (s) => s.groupId === g.id && s.optionId === op.id,
                            );

                            return (
                              <div
                                key={op.rowId}
                                className="flex items-center justify-between rounded-xl border px-3 py-2"
                              >
                                <span>{op.name}</span>

                                <div className="flex items-center gap-2">
                                  {op.priceDelta ? (
                                    <span className="text-xs font-medium text-gray-600">
                                      {op.priceDelta > 0 ? "+" : ""}{CurrencySymbol} {money(convertPrice(op.priceDelta))}
                                    </span>
                                  ) : null}
                                  {!selected ? (
                                    <button
                                      onClick={() => toggleModifier(g, op)}
                                      className="px-2 py-1 text-xs rounded bg-orange-500 text-white"
                                    >
                                      Add
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleModifier(g, op)}
                                      className="px-2 py-1 text-xs rounded bg-orange-200 text-orange-700"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
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
                  Item {t.POS.quantity}
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="text-sm font-semibold">Quantity: 1</div>
                </div>

                <div className="mb-2 text-sm text-gray-600">Chosen</div>

                <ul className="mb-4 space-y-1 text-sm">
                  {modSelected.map((m) => {
                    const g = modItem.modifierGroups?.find(
                      (gg: any) => gg.id === m.groupId,
                    );
                    const o = g?.options.find(
                      (oo: any) => oo.id === m.optionId,
                    );

                    const price = Number(o?.priceDelta ?? 0);
                    const total = price * m.qty;

                    return (
                      <li
                        key={`${m.groupId}-${m.optionId}`}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-700">
                          {o?.name} × {m.qty}
                        </span>

                        <span className="text-gray-800 font-semibold">
                          {CurrencySymbol} {money(convertPrice(total))}
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
                      convertPrice(
                        modItem.price +
                          priceFromModifiers(
                            modItem.modifierGroups,
                            modSelected,
                          ),
                      ) * modQty,
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

      {loadOrderOpen && (
        <LoadOrderPopup
          open={loadOrderOpen}
          onClose={() => setLoadOrderOpen(false)}
          onLoadOrder={onLoadOrder}
          g_hash={g_hash ?? ""}
          user_id={Number(user_id) || 0}
        />
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
                {isTakeawayNow(currentTableId)
                  ? t.POS.takeawayCustomer
                  : "Dine In Customer"}
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
              {(takeawayPreview || selectedCustomer) && (
                <div className="mt-6 rounded-2xl border border-orange-300 bg-orange-50 p-4">
                  <h3 className="text-lg font-bold mb-3">
                    {isTakeawayNow(currentTableId)
                      ? "Takeaway Order Preview"
                      : "Dine-In Order Preview"}
                  </h3>

                  {/* Items */}
                  <div className="space-y-2 text-sm">
                    {order.items.map((li: any) => (
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
                              .map((m: any) => {
                                // try from item modifierGroups (best)
                                const item = menu.find(
                                  (x) => x.id === li.itemId,
                                );
                                const g = item?.modifierGroups?.find(
                                  (gg: any) => gg.id === m.groupId,
                                );
                                const o = g?.options?.find(
                                  (oo: any) => oo.id === m.optionId,
                                );

                                // fallback from global modifiers list
                                const fallback = resolveModifierFromMaster(
                                  modifiers,
                                  Number(m.optionId),
                                );

                                const name = o?.name ?? fallback.name;
                                const priceDelta = Number(
                                  o?.priceDelta ?? fallback.priceDelta ?? 0,
                                );
                                const qty = Number(m.qty ?? 1);

                                return `${name} × ${qty} (${money(priceDelta)})`;
                              })
                              .filter(Boolean)
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
                        onClick={() => setPaymentType(2)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold 
        ${
          paymentType === 2
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
                        onClick={() => setPaymentType(4)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold 
        ${
          paymentType === 4
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

                    const res = await api.get(
                      process.env.NEXT_PUBLIC_API_LINK +
                        "/request/api/searchcustomerbyname",
                      { params: { sc_customer_name: q } },
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
                          persistCustomerToOrder({
                            customer_id: c.customer_id,
                            name: c.customer_name,
                            phone: c.customer_mobile,
                            address: c.customer_address,
                          });
                          setShowNewCustomer(false);

                          // setCustomerName("");
                          // setCustomerPhone("");
                          // setCustomerAddress("");
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
      !selectedCustomer && !showNewCustomer && posDisabled
        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
        : "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-lg"
    }${
      posDisabled
        ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none opacity-60"
        : "hover:bg-emerald-700"
    }`}
                onClick={async () => {
                  let finalCustomerId: number | null = null;

                  if (selectedCustomer && !showNewCustomer) {
                    finalCustomerId = Number(selectedCustomer.customer_id);
                  } else if (showNewCustomer) {
                    if (!customerName || !customerPhone) {
                      return alert("Name and phone are required!");
                    }

                    const payload = {
                      g_hash,
                      user_id,
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

                    const res = await api.post(
                      process.env.NEXT_PUBLIC_API_LINK +
                        "/request/api/savecustomer",
                      payload,
                    );

                    if (res.data.is_error) {
                      return alert(res.data.error_message);
                    }

                    finalCustomerId = Number(res.data.customer_id);

                    setSelectedCustomer({
                      customer_id: finalCustomerId,
                      customer_name: customerName,
                      customer_mobile: customerPhone,
                      customer_address: customerAddress,
                    });
                  }

                  // persist customer ONLY if takeaway
                  persistCustomerToOrder({
                    customer_id: finalCustomerId ?? undefined,
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress,
                  });

                  // If takeaway: mark checkoutDraft + customer snapshot for refresh restore
                  if (isTakeawayNow(currentTableId)) {
                    const order = ordersInfo.find(
                      (o) => o.orderId === currentOrderId,
                    );

                    if (order) {
                      dispatch(
                        upsertOrder({
                          ...order,
                          checkoutDraft: true,
                          customer: {
                            customer_id: finalCustomerId ?? undefined,
                            name: customerName,
                            phone: customerPhone,
                            address: customerAddress,
                          },
                        }),
                      );
                    }
                  }

                  // SAVE TO DATABASE
                  await saveOrderToDatabase(finalCustomerId ?? undefined);

                  // Close UI
                  setCustomerDrawerOpen(false);
                  setTakeawayPreview(false);
                }}
              >
                {t.POS.payClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            {/* HEADER */}
            <div className="mb-6 text-center">
              <p className="text-xs text-gray-500">Need to pay amount</p>
              <p className="text-2xl font-bold">
                {CurrencySymbol} {money(displayTotal)}
              </p>
            </div>

            {/* PAID */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Paid
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="h-11 w-[50%] rounded-xl border px-3 text-sm"
                />
                <select
                  value={paidCurrencyId ?? ""}
                  onChange={(e) => setPaidCurrencyId(Number(e.target.value))}
                  className="h-11 rounded-xl border px-3 text-sm w-[50%]"
                >
                  {allowedCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.currencyCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* REMAINING TO PAY */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Remaining to pay
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={money(remainingToPay)}
                  className="h-11 w-[50%] rounded-xl border bg-gray-50 px-3 text-sm"
                />
                <select
                  value={remainingCurrencyId ?? ""}
                  onChange={(e) =>
                    setRemainingCurrencyId(Number(e.target.value))
                  }
                  className="h-11 rounded-xl border px-3 text-sm w-[50%]"
                >
                  {allowedCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.currencyCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* REMAINING TO RETURN */}
            <div className="mb-6">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Remaining to return
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={money(remainingToReturn)}
                  className="h-11 w-[50%] rounded-xl border bg-gray-50 px-3 text-sm"
                />
                <select
                  value={returnCurrencyId ?? ""}
                  onChange={(e) => setReturnCurrencyId(Number(e.target.value))}
                  className="h-11 rounded-xl border px-3 text-sm w-[50%]"
                >
                  {allowedCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.currencyCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ACTIONS */}
            <button
              disabled={paidInOriginal < baseTotalOriginal}
              onClick={async () => {
                await saveOrderToDatabase();
                setPaymentPopupOpen(false);
              }}
              className="mb-3 h-12 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-sm font-semibold text-white disabled:opacity-50"
            >
              Pay & Close
            </button>

            <button
              onClick={() => setPaymentPopupOpen(false)}
              className="h-11 w-full rounded-xl border text-sm"
            >
              Close
            </button>
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
                      setEditLine((l: any) =>
                        l ? { ...l, qty: Math.max(1, l.qty - 1) } : l,
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
                      setEditLine((l: any) =>
                        l ? { ...l, qty: l.qty + 1 } : l,
                      )
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
                    value={editLine.stationId}
                    onChange={(e) =>
                      setEditLine((l: any) =>
                        l ? { ...l, stationId: Number(e.target.value) } : l,
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    {kitchenStations.map((k) => (
                      <option key={k.ks_id} value={k.ks_id}>
                        {k.ks_name}
                      </option>
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
                      ?.modifierGroups?.map((g: any) => {
                        const lineInGroup = editLine.modifiers.filter(
                          (s: any) => s.groupId === g.id,
                        );
                        const max =
                          g.maxSelect ?? (g.type === "required" ? 1 : 0);
                        const toggle = (op: ModifierOption) => {
                          setEditLine((l: any) => {
                            if (!l) return l;
                            const exists = l.modifiers.some(
                              (s: any) =>
                                s.groupId === g.id && s.optionId === op.id,
                            );
                            if (g.type === "required" && (max === 1 || !max)) {
                              const filtered = l.modifiers.filter(
                                (s: any) => s.groupId !== g.id,
                              );
                              return exists
                                ? { ...l, modifiers: filtered }
                                : {
                                    ...l,
                                    modifiers: [
                                      ...filtered,
                                      {
                                        groupId: g.id,
                                        optionId: op.id,
                                        qty: normalizeModifierQty(
                                          op.quantity ?? 1,
                                        ),
                                      },
                                    ],
                                  };
                            }
                            if (exists) {
                              return {
                                ...l,
                                modifiers: l.modifiers.filter(
                                  (s: any) =>
                                    !(
                                      s.groupId === g.id && s.optionId === op.id
                                    ),
                                ),
                              };
                            } else {
                              const inG = l.modifiers.filter(
                                (s: any) => s.groupId === g.id,
                              );
                              if (max && inG.length >= max) {
                                const others = l.modifiers.filter(
                                  (s: any) => s.groupId !== g.id,
                                );
                                const keep = inG.slice(1);
                                return {
                                  ...l,
                                  modifiers: [
                                    ...others,
                                    ...keep,
                                    {
                                      groupId: g.id,
                                      optionId: op.id,
                                      qty: normalizeModifierQty(
                                        op.quantity ?? 1,
                                      ),
                                    },
                                  ],
                                };
                              }
                              return {
                                ...l,
                                modifiers: [
                                  ...l.modifiers,
                                  {
                                    groupId: g.id,
                                    optionId: op.id,
                                    qty: Number(op.quantity ?? 1),
                                  },
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
                              {g.options.map((op: any) => {
                                const picked = lineInGroup.some(
                                  (s: any) => s.optionId === op.id,
                                );
                                return (
                                  <button
                                    disabled={posDisabled}
                                    key={op.rowId}
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
                                      Qty:{" "}
                                      {lineInGroup.find(
                                        (s: any) => s.optionId === op.id,
                                      )?.qty ??
                                        op.quantity ??
                                        1}
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
                    setEditLine((l: any) =>
                      l ? { ...l, note: e.target.value } : l,
                    )
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
                              editLine.modifiers,
                            )
                          : 0)) *
                        editLine.qty,
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
