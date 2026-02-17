"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  upsertOrder,
  updateOrderItems,
  upsertManyOrders,
  replaceOrderId,
} from "@/store/slices/ordersSlice";
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
  Square,
  SquareCheck,
  Trash2,
  Pencil,
} from "lucide-react";

import { setMenuItems, updateItemModifiers } from "@/store/slices/menuSlice";
import {
  setAllowedCurrencies,
  setSelectedCurrency,
} from "@/store/slices/allowedCurrenciesSlice";
import { updateLoginStringField } from "@/store/slices/authSlice";
import { api } from "@/lib/api";
import axios from "axios";
import Cookies from "js-cookie";
import { useI18n } from "@/hooks/useI18n";
import { ModifierGroup } from "@/components/include/POSClient";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type Floor = {
  id: number;
  name: string;
  storeId: number;
  sortOrder: number;
};

type Table = {
  id: number;
  label: string;
  numberSeats?: number;
  statusId: number;
  floorId: number;
};

type AppliedModifier = {
  groupId: number;
  optionId: number;
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

type KitchenStationDB = {
  ks_id: number;
  ks_name: string;
};

type ModifierOption = {
  id: number;
  name: string;
  rowId: number;
  priceDelta?: number;
  default?: boolean;
  quantity: number;
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

const TEMP_ORDER_PREFIX = "tmp_";
const brandBg = "bg-white";

export default function POSFloorsPage() {
  const lang = (Cookies.get("lang") as "en" | "fr") || "en";
  const { t } = useI18n(lang);
  const dispatch = useAppDispatch();

  const menu = useAppSelector((s) => s.menu.items);
  const ordersInfo = useAppSelector((s) => s.orders.orders);
  const auth = useAppSelector((s) => s.auth.loginData);
  const allowedCurrencies = useAppSelector((s) => s.allowedCurrencies.items);
  const currencyRate = useAppSelector((s) => s.allowedCurrencies.rate);
  const ordersLoaded = useAppSelector(
    (state) => state.orders._persist?.rehydrated,
  );

  const g_hash = auth.g_hash;
  const user_id = auth.user_id;
  const store_id = auth.store_id;
  const company_id = auth.company_id;

  const API_URL = process.env.NEXT_PUBLIC_API_LINK;

  const selectedCurrencyId = useAppSelector(
    (s) => s.allowedCurrencies.selectedCurrencyId,
  );

  const CurrencySymbol = useMemo(() => {
    const found = allowedCurrencies.find((c) => c.id === selectedCurrencyId);
    if (found) return found.currencyCode;
    return auth.currency_symbol || "";
  }, [allowedCurrencies, selectedCurrencyId, auth.currency_symbol]);

  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTableId, setCurrentTableId] = useState<number | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [categoriesList, setCategoriesList] = useState<
    { id: number; name: string }[]
  >([]);
  const [modifiers, setModifiers] = useState<
    { id: number; name: string; price: number; quantity: number }[]
  >([]);
  const [kitchenStations, setKitchenStations] = useState<KitchenStationDB[]>(
    [],
  );

  // Modifier popup state
  const [modItem, setModItem] = useState<any>(null);
  const [modSelected, setModSelected] = useState<AppliedModifier[]>([]);

  // Edit line state
  const [editLine, setEditLine] = useState<any>(null);

  // Order local ui state
  const [order, setOrder] = useState<any>({
    id: uid(),
    guests: 0,
    items: [],
    createdAt: Date.now(),
    status: "open",
  });

  const [hydrated, setHydrated] = useState(false);

  // Real-time WebSocket sync for orders and tables
  useRealtimeSync(menu, setTables, { floorId: selectedFloorId });

  //allowed curreny
  useEffect(() => {
    const loadAllowedCurrencies = async () => {
      if (allowedCurrencies.length > 0) return;

      const res = await api.get(
        `${API_URL}/api/allowedcurrencies/getallowedcurrencies`,
        {
          params: { g_hash, user_id, store_id, company_id },
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

  //kitchen station
  const loadKitchenStations = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders/getstationsname`, {
        params: { g_hash, user_id },
      });
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

  //modifiers
  const loadModifiers = async () => {
    const res = await api.get(API_URL + "/api/inventory/getlistmodifiers", {
      params: { g_hash, user_id },
    });
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

  //menu items
  const loadMenu = async () => {
    if (menu.length > 0) return;

    const res = await api.get(API_URL + "/api/inventory/getlistofitems", {
      params: { g_hash, user_id },
    });
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
  };

  useEffect(() => {
    if (modifiers.length > 0) {
      loadMenu();
    }
  }, [modifiers]);

  //categories
  const loadCategories = async () => {
    const res = await api.get(API_URL + "/api/inventory/listitemcategories", {
      params: { g_hash, user_id },
    });
    if (res.data.is_error === 1) return;
    setCategoriesList(
      res.data.lst_item_categories.map((c: any) => ({
        id: c.mc_id,
        name: c.mc_category_name,
      })),
    );
  };

  useEffect(() => {
    loadCategories();
  }, []);

  //floors
  useEffect(() => {
    const fetchFloors = async () => {
      try {
        const res = await api.get(API_URL + "/api/floors/getlistfloors", {
          params: { g_hash, user_id, store_id },
        });

        if (res.data.is_error === 1) return;

        const mapped: Floor[] = res.data.lst_floors.map((f: any) => ({
          id: f.fl_id,
          name: f.fl_floor_name,
          storeId: f.fl_store_id,
          sortOrder: f.fl_sort_order,
        }));

        setFloors(mapped);

        // Auto-select first floor
        if (mapped.length > 0) {
          setSelectedFloorId(mapped[0].id);
        }
      } catch (e) {
        console.error("Floors fetch error:", e);
      }
    };

    fetchFloors();
  }, []);

  //tables (fetched when floor changes)
  useEffect(() => {
    if (!selectedFloorId) return;

    const fetchTables = async () => {
      try {
        const response = await api.get(
          API_URL + "/api/inventory/getlisttables",
          {
            params: { g_hash, user_id, floor_id: selectedFloorId },
          },
        );
        const data = response.data.lst_tables;
        setTables(
          data.map((t: any) => ({
            id: t.ft_id,
            label: t.ft_label,
            statusId: t.ft_status_id ?? 0,
            floorId: t.ft_floor_id,
          })),
        );
      } catch (e) {
        console.error("Tables fetch error:", e);
      }
    };

    fetchTables();
  }, [selectedFloorId]);

  //hydrate orders on refresh
  useEffect(() => {
    if (!ordersLoaded) return;
    if (menu.length === 0) return;
    if (hydrated) return;

    if (!ordersInfo || !Array.isArray(ordersInfo) || ordersInfo.length === 0) {
      setHydrated(true);
      return;
    }

    const fixed = ordersInfo.map((o) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items : [],
      tableIds: Array.isArray(o.tableIds) ? o.tableIds : [0],
    }));
    dispatch(upsertManyOrders(fixed));
    setHydrated(true);
  }, [ordersLoaded, menu]);

  //fetch modifiers per item
  async function fetchModifiersPerItem(itemId: number) {
    const res = await api.get(
      `${API_URL}/api/inventory/getlistmodifiersperitem`,
      { params: { g_hash, user_id, item_id: itemId } },
    );
    if (res.data?.is_error === 1) return [];
    return res.data.data ?? [];
  }

  //derived data
  const currentOrder = useMemo(() => {
    if (!currentOrderId) return null;
    return ordersInfo.find((o) => o.orderId === currentOrderId) ?? null;
  }, [ordersInfo, currentOrderId]);

  const currentItems: OrderItem[] = useMemo(() => {
    return (currentOrder?.items as OrderItem[]) ?? [];
  }, [currentOrder]);

  const activeTables = useMemo(() => {
    return ordersInfo
      .filter(
        (o) =>
          o.items &&
          o.items.length > 0 &&
          Array.isArray(o.tableIds) &&
          o.tableIds[0] !== 0,
      )
      .flatMap((o) => o.tableIds);
  }, [ordersInfo]);

  // Clear local UI when current order was removed from Redux (e.g. paid from another browser)
  useEffect(() => {
    if (!currentOrderId) return;
    const still = ordersInfo.some((o) => o.orderId === currentOrderId);
    if (!still) {
      setCurrentTableId(null);
      setCurrentOrderId(null);
      setOrder({ id: uid(), guests: 0, items: [], createdAt: Date.now(), status: "open" });
    }
  }, [ordersInfo, currentOrderId]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      const okCat = category === "All" || m.categoryName === category;
      const okSearch = !q || m.name.toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }, [search, category, menu]);

  const convertPrice = (price: number) => {
    return price * (currencyRate ?? 1);
  };

  const subtotalOriginal = useMemo(
    () =>
      currentItems.reduce(
        (s, li) => s + (li.basePrice + (li.priceExtra ?? 0)) * li.qty,
        0,
      ),
    [currentItems],
  );

  const taxOriginal = subtotalOriginal * 0.11;
  const totalOriginal = subtotalOriginal + taxOriginal;
  const subtotal = convertPrice(subtotalOriginal);

  const newItemsCount = useMemo(() => {
    return currentItems.filter((x) => !x.sentToKitchen).length;
  }, [currentItems]);

  const selectTable = async (table: Table) => {
    // Clicking same table again -> deselect
    if (currentTableId === table.id) {
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

    // Check if an existing order exists for this table
    const existing = ordersInfo?.find(
      (o) => o.tableIds.includes(table.id) && !o.isHeld,
    );

    if (existing) {
      setCurrentOrderId(existing.orderId);
      setCurrentTableId(table.id);
      setOrder({
        id: existing.orderId,
        items: existing.items || [],
        createdAt: Date.now(),
        status: "open",
      });
      return;
    }

    // Create new temp order
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

    // Create real order via API
    api
      .post(API_URL + "/api/orders/createemptyorder", {
        g_hash,
        user_id,
        store_id,
        company_id,
        order_type: "dine_in",
      })
      .then((res) => {
        if (res.data?.is_error) return;

        const realOrderId = String(res.data.order_id);

        dispatch(replaceOrderId({ tempId: tempOrderId, realId: realOrderId }));

        setCurrentOrderId((id) => (id === tempOrderId ? realOrderId : id));
        setOrder((o: any) =>
          o.id === tempOrderId ? { ...o, id: realOrderId } : o,
        );
      })
      .catch((err) => {
        console.error("Error creating order:", err);
      });
  };
  //Add Item (with modifier support)
  const addItemStart = async (item: any) => {
    const rawModifiers = await fetchModifiersPerItem(item.id);

    const modifierGroups: ModifierGroup[] = rawModifiers.length
      ? [
          {
            id: 1,
            name: "Options",
            type: "optional" as const,
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

    dispatch(updateItemModifiers({ id: item.id, modifierGroups }));

    // If no modifiers, add directly
    if (modifierGroups.length === 0 || modifierGroups[0].options.length === 0) {
      addItemDirect(item);
      return;
    }

    // Show modifier popup
    setModItem({ ...item, modifierGroups });
    setModSelected([]);
  };

  const getActiveOrder = () => {
    if (!currentTableId) return null;

    return ordersInfo.find(
      (o) => o.tableIds?.includes(currentTableId) && !o.isHeld,
    );
  };

  const addItemDirect = (item: any) => {
    if (!currentOrderId) return;

    const newLine: OrderItem = {
      uid: uid(),
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      stationId: item.kitchen_station_id ?? 1,
      note: "",
      modifiers: [],
      priceExtra: 0,
      sentToKitchen: false,
    };

    const orderData = getActiveOrder();
    if (!orderData) return;
    dispatch(
      updateOrderItems({
        id: currentOrderId,
        items: [...(orderData?.items ?? []), newLine],
      }),
    );

    setOrder((o: any) => ({
      ...o,
      items: [...(o.items ?? []), newLine],
    }));
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

  const confirmAddToOrder = () => {
    if (!modItem || !currentOrderId) return;

    const priceExtra = priceFromModifiers(modItem.modifierGroups, modSelected);

    const newLine: OrderItem = {
      uid: uid(),
      itemId: modItem.id,
      name: modItem.name,
      basePrice: modItem.price,
      qty: 1,
      stationId: modItem.kitchen_station_id ?? 1,
      note: "",
      modifiers: modSelected,
      priceExtra,
      sentToKitchen: false,
    };

    const orderData = ordersInfo.find(
      (o) =>
        o.orderId === currentOrderId || o.orderId === String(currentOrderId),
    );
    dispatch(
      updateOrderItems({
        id: currentOrderId,
        items: [...(orderData?.items ?? []), newLine],
      }),
    );

    setOrder((o: any) => ({
      ...o,
      items: [...(o.items ?? []), newLine],
    }));

    setModItem(null);
  };

  //change qty/remoce
  const changeQty = (lineUid: string, delta: number) => {
    if (!currentOrderId) return;

    const orderData = getActiveOrder();
    if (!orderData) return;
    if (!orderData) return;

    const updatedItems = orderData.items.map((it) =>
      it.uid === lineUid ? { ...it, qty: Math.max(1, it.qty + delta) } : it,
    );

    dispatch(updateOrderItems({ id: currentOrderId, items: updatedItems }));

    setOrder((o: any) => ({
      ...o,
      items: o.items.map((it: any) =>
        it.uid === lineUid ? { ...it, qty: Math.max(1, it.qty + delta) } : it,
      ),
    }));
  };

  const removeLine = (lineUid: string) => {
    if (!currentOrderId) return;

    const orderData = getActiveOrder();
    if (!orderData) return;
    if (!orderData) return;

    const updatedItems = orderData.items.filter((x) => x.uid !== lineUid);

    dispatch(updateOrderItems({ id: currentOrderId, items: updatedItems }));

    setOrder((o: any) => ({
      ...o,
      items: o.items.filter((x: any) => x.uid !== lineUid),
    }));
  };

  async function ensureRealOrderId(): Promise<string> {
    if (currentOrderId && !String(currentOrderId).startsWith("tmp_")) {
      return String(currentOrderId);
    }

    const res = await api.post(API_URL + "/api/orders/createemptyorder", {
      g_hash,
      user_id,
      store_id,
      company_id,
      order_type: "dine_in",
    });

    if (res.data?.is_error) {
      throw new Error(res.data?.error_msg || "Failed to create order");
    }

    const realOrderId = String(res.data.order_id);

    if (currentOrderId && String(currentOrderId).startsWith("tmp_")) {
      dispatch(replaceOrderId({ tempId: currentOrderId, realId: realOrderId }));
    }

    setCurrentOrderId(realOrderId);
    setOrder((o: any) => ({ ...o, id: realOrderId }));

    return realOrderId;
  }

  const sendToKitchen = async () => {
    try {
      const orderData = getActiveOrder();
      if (!orderData) return;

      if (!orderData) return alert(t.terrace.orderNotFound);
      if (!g_hash || !user_id) return alert(t.terrace.missingAuth);

      const newItems = orderData.items.filter((i) => !i.sentToKitchen);
      if (newItems.length === 0) {
        alert(t.terrace.alreadySent);
        return;
      }

      const realOrderId = await ensureRealOrderId();

      const payload = {
        g_hash,
        user_id,
        customer_id: 0,
        order_id: Number(realOrderId),
        order_type: "dine_in",
        table_ids: (orderData.tableIds?.length ? orderData.tableIds : [0]).join(
          ",",
        ),
        sub_total: subtotalOriginal,
        discount: 0,
        total: totalOriginal,
        order_items: JSON.stringify(
          newItems.map((li: any) => ({
            item_id: li.itemId,
            quantity: li.qty,
            unit_price: li.basePrice + (li.priceExtra ?? 0),
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

      // Mark items as sent
      const updatedItems = orderData.items.map((x) =>
        !x.sentToKitchen ? { ...x, sentToKitchen: true } : x,
      );

      dispatch(
        updateOrderItems({ id: String(realOrderId), items: updatedItems }),
      );

      // Dine-in: reset ui so ACTIVE flag disappears, order stays in Redux
      setOrder({
        id: uid(),
        guests: 0,
        items: [],
        createdAt: Date.now(),
        status: "open",
      });
      setCurrentTableId(null);
      setCurrentOrderId(null);

      alert(t.terrace.orderSent);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || t.terrace.sendFailed);
    }
  };

  //Edit line
  const applyEdit = () => {
    if (!editLine || !currentOrderId) return;

    const it: any = menu.find((m) => m.id === editLine.itemId);
    const extra = priceFromModifiers(it?.modifierGroups, editLine.modifiers);
    const updated = { ...editLine, priceExtra: extra };

    setOrder((prev: any) => ({
      ...prev,
      items: prev.items.map((x: any) => (x.uid === updated.uid ? updated : x)),
    }));

    const orderData = getActiveOrder();
    if (!orderData) return;
    dispatch(
      updateOrderItems({
        id: currentOrderId,
        items: orderData!.items.map((x: any) =>
          x.uid === updated.uid ? updated : x,
        ),
      }),
    );

    setEditLine(null);
  };

  const openMenu = () => {
    if (!currentTableId) return alert(t.terrace.selectTableFirst);
    setMenuModalOpen(true);
  };

  //station name helper
  const stationName = (stationId: number) => {
    const s = kitchenStations.find((ks) => ks.ks_id === stationId);
    return s?.ks_name ?? `Station ${stationId}`;
  };

  return (
    <div className={`min-h-[calc(100vh-4rem)] ${brandBg} p-4`}>
      <div className="mx-auto grid w-full max-w-[1650px] gap-4 lg:grid-cols-[1fr_430px]">
        {/* LEFT: Floors + Tables */}
        <section className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur ring-1 ring-white/60 shadow-sm">
          {/* Floors bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-gray-500">{t.terrace.floor}</div>
              <div className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-orange-500" />
                {t.terrace.tablesView}
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
            {tables.map((tb) => {
              const isCurrent = currentTableId === tb.id;
              const hasOrder = activeTables.includes(tb.id);

              const cls = isCurrent
                ? "border-orange-500 bg-orange-100"
                : hasOrder
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-200 bg-white";

              return (
                <button
                  key={tb.id}
                  onClick={() => selectTable(tb)}
                  className={`h-24 rounded-2xl border ${cls} p-3 text-left transition hover:bg-orange-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-gray-900">
                      {tb.label}
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        {t.terrace.active}
                      </span>
                    ) : hasOrder ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        {t.terrace.hasOrder}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-700">
              {t.terrace.selectedTable}{" "}
              <span className="font-extrabold text-gray-900">
                {tables.find((tb) => tb.id === currentTableId)?.label ??
                  currentTableId}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {" "}
                {t.terrace.newItems} {newItemsCount}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={openMenu}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105"
              >
                <ShoppingBag className="h-4 w-4" />
                {t.terrace.openMenu}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT: Order Preview */}
        <section className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl bg-white/80 backdrop-blur ring-1 ring-white/60 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <div className="text-xs text-gray-500">
                {t.terrace.orderPreview}
              </div>
              <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                {t.terrace.table}:{" "}
                {currentTableId
                  ? (tables.find((tb) => tb.id === currentTableId)?.label ??
                    currentTableId)
                  : "\u2014"}
                `
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="flex-1 overflow-auto p-4">
            {!currentTableId && !currentOrderId ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                {t.terrace.selectTableHint}
              </div>
            ) : currentItems.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-gray-500">
                {t.terrace.noItemsHint}
              </div>
            ) : (
              <ul className="space-y-2">
                {currentItems.map((li) => {
                  const lineTotal = convertPrice(
                    (li.basePrice + (li.priceExtra ?? 0)) * li.qty,
                  );

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
                              {stationName(li.stationId)}
                            </span>

                            {li.sentToKitchen ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t.terrace.sent}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                {t.terrace.new}
                              </span>
                            )}
                          </div>

                          {/* Show modifiers if any */}
                          {li.modifiers && li.modifiers.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {li.modifiers.map((mod, idx) => {
                                const masterMod = modifiers.find(
                                  (m) => m.id === Number(mod.optionId),
                                );
                                return (
                                  <span
                                    key={idx}
                                    className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
                                  >
                                    {masterMod?.name ?? `#${mod.optionId}`}
                                    {masterMod?.price
                                      ? ` +${CurrencySymbol} ${money(convertPrice(masterMod.price))}`
                                      : null}
                                  </span>
                                );
                              })}
                            </div>
                          )}

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
                              className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                              onClick={() =>
                                setEditLine({
                                  ...li,
                                  modifiers: li.modifiers ?? [],
                                })
                              }
                            >
                              <Pencil className="h-3 w-3" />
                              {t.terrace.edit}
                            </button>

                            <button
                              className="ml-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                              onClick={() => removeLine(li.uid)}
                            >
                              <Trash2 className="h-3 w-3" />
                              {t.terrace.remove}
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-gray-900">
                            {CurrencySymbol} {money(lineTotal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {CurrencySymbol} {money(convertPrice(li.basePrice))}{" "}
                            {t.terrace.base}
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
              <span className="text-gray-600">{t.terrace.subtotal}</span>
              <span className="font-extrabold text-gray-900">
                {CurrencySymbol} {money(subtotal)}
              </span>
            </div>

            <button
              onClick={sendToKitchen}
              disabled={
                (!currentTableId && !currentOrderId) ||
                currentItems.length === 0
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:brightness-105 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t.terrace.sendNewItems} ({newItemsCount})
            </button>
          </div>
        </section>
      </div>

      {/* ====================== MENU POPUP (scrollable) ====================== */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between border-b px-5 py-3">
              <div>
                <div className="text-xs text-gray-500">{t.terrace.menu}</div>
                <div className="text-lg font-extrabold text-gray-900">
                  {t.terrace.addItems} &bull; {t.terrace.table} $
                  {currentTableId
                    ? (tables.find((tb) => tb.id === currentTableId)?.label ??
                      currentTableId)
                    : "\u2014"}
                  `
                </div>
              </div>

              <button
                onClick={() => setMenuModalOpen(false)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-auto p-5">
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                {/* LEFT: Categories (scrollable) */}
                <div className="rounded-2xl border border-gray-200 bg-white p-3 lg:max-h-[calc(90vh-180px)] lg:overflow-auto">
                  <div className="mb-2 text-sm font-extrabold text-gray-900">
                    {t.terrace.categories}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setCategory("All")}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                        category === "All"
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-800 border-gray-200 hover:bg-orange-50"
                      }`}
                    >
                      {t.terrace.all}
                    </button>

                    {categoriesList.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.name)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                          category === c.name
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
                        placeholder={t.terrace.searchItems}
                        className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {filteredMenu.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addItemStart(m)}
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
                            {CurrencySymbol || m.currency_code} {money(convertPrice(m.price))}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">
                            {stationName(m.kitchen_station_id)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                    <div className="text-sm font-bold text-orange-800">
                      {t.terrace.previewTotal}
                    </div>
                    <div className="text-lg font-extrabold text-orange-700">
                      {CurrencySymbol} {money(subtotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (sticky) */}
            <div className="flex-shrink-0 flex items-center justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={() => setMenuModalOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50"
              >
                {t.terrace.close}
              </button>
              <button
                onClick={() => {
                  setMenuModalOpen(false);
                  sendToKitchen();
                }}
                disabled={
                  (!currentTableId && !currentOrderId) || newItemsCount === 0
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {t.terrace.sendToKitchen}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================== MODIFIER POPUP ====================== */}
      {modItem && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <div className="text-xs text-gray-500">
                  {t.terrace.customize}
                </div>
                <div className="text-lg font-extrabold text-gray-900">
                  {modItem.name}
                </div>
              </div>
              <button
                onClick={() => setModItem(null)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-auto p-5">
              {modItem.modifierGroups?.map((group: ModifierGroup) => (
                <div key={group.id} className="mb-4">
                  <div className="mb-2 text-sm font-bold text-gray-700">
                    {group.name}
                    {group.type === "required" && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {group.options.map((opt) => {
                      const selected = modSelected.some(
                        (s) => s.groupId === group.id && s.optionId === opt.id,
                      );
                      return (
                        <button
                          key={opt.rowId}
                          onClick={() => toggleModifier(group, opt)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                            selected
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {selected ? (
                              <SquareCheck className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="font-medium">{opt.name}</span>
                          </div>
                          {opt.priceDelta ? (
                            <span className="text-xs font-medium text-gray-600">
                              {opt.priceDelta > 0 ? "+" : ""}
                              {CurrencySymbol}{" "}
                              {money(convertPrice(opt.priceDelta))}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={() => setModItem(null)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50"
              >
                {t.terrace.cancel}
              </button>
              <button
                onClick={confirmAddToOrder}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105"
              >
                {t.terrace.addToOrder}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================== EDIT LINE POPUP ====================== */}
      {editLine && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex-shrink-0 flex items-center justify-between border-b px-5 py-3">
              <div className="text-lg font-extrabold text-gray-900">
                {t.terrace.editItem} {editLine.name}
              </div>
              <button
                onClick={() => setEditLine(null)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* Quantity Controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">
                  {t.terrace.quantity}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    onClick={() =>
                      setEditLine((l: any) =>
                        l ? { ...l, qty: Math.max(1, l.qty - 1) } : l,
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold">
                    {editLine.qty}
                  </span>
                  <button
                    className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
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

              {/* Kitchen Station */}
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  {t.terrace.kitchenStation}
                </label>
                <select
                  value={editLine.stationId}
                  onChange={(e) =>
                    setEditLine((l: any) =>
                      l ? { ...l, stationId: Number(e.target.value) } : l,
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {kitchenStations.map((k) => (
                    <option key={k.ks_id} value={k.ks_id}>
                      {k.ks_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modifiers */}
              {(() => {
                const menuItem = menu.find((m) => m.id === editLine.itemId);
                const groups = menuItem?.modifierGroups ?? [];
                if (groups.length === 0) return null;

                return (
                  <div>
                    <div className="mb-2 text-sm font-bold text-gray-700">
                      {t.terrace.modifiers}
                    </div>
                    <div className="space-y-3">
                      {groups.map((g: any) => {
                        const lineInGroup = (editLine.modifiers ?? []).filter(
                          (s: any) => s.groupId === g.id,
                        );

                        const toggle = (op: ModifierOption) => {
                          setEditLine((l: any) => {
                            if (!l) return l;
                            const exists = l.modifiers.some(
                              (s: any) =>
                                s.groupId === g.id && s.optionId === op.id,
                            );
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
                            }
                            return {
                              ...l,
                              modifiers: [
                                ...l.modifiers,
                                {
                                  groupId: g.id,
                                  optionId: op.id,
                                  qty: normalizeModifierQty(op.quantity ?? 1),
                                },
                              ],
                            };
                          });
                        };

                        return (
                          <div
                            key={g.id}
                            className="rounded-xl border border-gray-200 p-3"
                          >
                            <div className="mb-1 text-sm font-bold text-gray-700">
                              {g.name}
                            </div>
                            <div className="space-y-1">
                              {g.options.map((op: any) => {
                                const picked = lineInGroup.some(
                                  (s: any) => s.optionId === op.id,
                                );
                                return (
                                  <button
                                    key={op.rowId}
                                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                                      picked
                                        ? "border-orange-500 bg-orange-50"
                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                    }`}
                                    onClick={() => toggle(op)}
                                  >
                                    <span className="flex items-center gap-2">
                                      {picked ? (
                                        <SquareCheck className="h-4 w-4 text-orange-500" />
                                      ) : (
                                        <Square className="h-4 w-4 text-gray-400" />
                                      )}
                                      {op.name}
                                    </span>
                                    {op.quantity > 1 && (
                                      <span className="text-xs text-gray-500">
                                        qty: {op.quantity}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Note */}
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  {t.terrace.note}
                </label>
                <textarea
                  rows={2}
                  value={editLine.note ?? ""}
                  onChange={(e) =>
                    setEditLine((prev: any) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder={t.terrace.notePlaceholder}
                />
              </div>

              {/* Price preview */}
              <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
                <div className="text-sm">
                  <div className="text-gray-600">{t.terrace.baseCost}</div>
                  <div className="font-bold">
                    {CurrencySymbol} {money(convertPrice(editLine.basePrice))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-600">
                    {t.terrace.lineTotal}
                  </div>
                  <div className="text-lg font-extrabold text-orange-700">
                    {CurrencySymbol}{" "}
                    {money(
                      convertPrice(
                        (editLine.basePrice +
                          priceFromModifiers(
                            menu.find((m) => m.id === editLine.itemId)
                              ?.modifierGroups,
                            editLine.modifiers ?? [],
                          )) *
                          editLine.qty,
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-between border-t px-5 py-3">
              <button
                className="inline-flex items-center gap-1 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                onClick={() => {
                  removeLine(editLine.uid);
                  setEditLine(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t.terrace.remove}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditLine(null)}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50"
                >
                  {t.terrace.cancel}
                </button>
                <button
                  onClick={applyEdit}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-extrabold text-white shadow hover:brightness-105"
                >
                  {t.terrace.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
