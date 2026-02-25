"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Boxes,
  Search,
  Filter,
  Upload,
  Download,
  Warehouse,
  MapPin,
  Factory,
  AlertTriangle,
  CalendarClock,
  QrCode,
  ChevronLeft,
  ChevronRight,
  MoveRight,
  Layers,
  Barcode,
  X,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
type UID = string;

type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Category = string;

type Location = "Main Store" | "Kitchen" | "Bar" | "Cold Room" | "Freezer";

type Lot = {
  id: UID;
  code: string; // batch/lot code
  qty: number;
  uom: UOM;
  expiry?: string; // ISO date
  location: Location;
  warehouseId: number; // DB warehouse id for this batch
  unitCost: number; // cost per UOM for this lot
  supplier?: string;
  createdAt: string; // received date
};

type InventoryItem = {
  id: UID;
  name: string;
  sku: string;
  category: Category;
  uom: UOM;
  reorderPoint: number;
  leadTimeDays?: number;
  preferredSupplier?: string;

  onHand: number; // summed from lots (or aggregated)
  committed: number; // allocated to open orders (0 for now)
  avgCost: number; // weighted moving average
  lastCost?: number;

  lots: Lot[];
};

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const money = (n: number, d = 2) =>
  (n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const dateDiffDays = (iso?: string) =>
  iso
    ? Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
    : undefined;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const LOCATIONS: Location[] = [
  "Main Store",
  "Kitchen",
  "Bar",
  "Cold Room",
  "Freezer",
];

/* ────────────────────────────────────────────────────────────────────────────
 * API helpers (GET with query params)
 * ──────────────────────────────────────────────────────────────────────────── */

type ApiProductsRow = {
  p_id: number;
  p_product_name: string;
  p_barcode: string | null;
  p_product_stock_alert: number | null;
  on_hand_qty: number | string;
  avg_cost: number | string;
  category_name: string | null;
};

type ApiLotRow = {
  stock_id: number;
  lot_uid: string | null;
  lot_label: string | null;
  quantity: number | string;
  price_item: number | string;
  price_stock: number | string;
  currency_id: number | null;
  exchange_rate: number | string | null;
  production_date: string | null;
  expiry_date: string | null;
  created_at: string | null;
  warehouse_id: number;
  zone_id: number | null;
  floor_id: number | null;
  supplier_id: number | null;
};

async function apiGetProducts(
  g_hash: string | null,
  user_id: string | null,
  warehouse_id: string | null,
) {
  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_LINK + "/api/products/getproducts",
    {
      params: { user_id, warehouse_id, g_hash },
    },
  );

  return res.data as {
    is_error: number;
    error_message?: string;
    products?: ApiProductsRow[];
  };
}

async function apiGetLotsByProductId(
  g_hash: string | null,
  user_id: string | null,
  warehouse_id: string | null,
  product_id: number,
) {
  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_LINK +
      "/api/products/getproductlotsbyproductid",
    {
      params: { user_id, product_id, warehouse_id, g_hash },
    },
  );

  return res.data as {
    is_error: number;
    error_message?: string;
    lots?: ApiLotRow[];
  };
}

type Warehouse = { id: number; name: string };

async function apiGetWarehouses(g_hash: string | null, user_id: string | null) {
  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getwarehouses",
    { params: { user_id, g_hash } },
  );
  return res.data as {
    is_error: number;
    error_message?: string;
    warehouses?: Warehouse[];
  };
}

async function apiTransferStock(payload: {
  g_hash: string;
  user_id: string;
  from_stock_id: number;
  to_warehouse_id: number;
  qty: number;
  notes: string;
}) {
  const res = await axios.post(
    process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/transferstock",
    payload,
  );
  return res.data as { is_error: number; error_message?: string };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────────── */
export default function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [loc, setLoc] = useState<Location | "All">("All");
  const [status, setStatus] = useState<
    "all" | "low" | "out" | "expiring" | "overstock"
  >("all");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [drawer, setDrawer] = useState<{
    open: boolean;
    itemId?: string;
  }>({ open: false });

  const [move, setMove] = useState<{
    open: boolean;
    item?: InventoryItem | null;
    lotId?: string;
  }>({
    open: false,
  });

  const [count, setCount] = useState<{
    open: boolean;
    item?: InventoryItem | null;
  }>({
    open: false,
    item: null,
  });

  const router = useRouter();
  const pageSize = 8;

  const auth = useAppSelector((s) => s.auth.loginData);

  const g_hash = auth.g_hash;
  const user_id = auth.user_id;
  const warehouse_id = auth.warehouse_id;

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  /* ───────────────────────── Load products on mount ───────────────────────── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        if (!user_id || !warehouse_id || !g_hash) {
          setErrorMsg(
            "Missing auth/session data in localStorage (user_id / warehouse_id / g_hash).",
          );
          return;
        }

        const data = await apiGetProducts(g_hash, user_id, warehouse_id);
        if (data?.is_error) {
          setErrorMsg(data?.error_message || "Failed to load products.");
          return;
        }

        const rows = data.products || [];

        // Map API rows => InventoryItem
        const mapped: InventoryItem[] = rows.map((r) => {
          const onHand = Number(r.on_hand_qty || 0);
          const avgCost = Number(r.avg_cost || 0);
          const reorderPoint = Number(r.p_product_stock_alert || 0);

          return {
            id: String(r.p_id),
            name: r.p_product_name || "",
            sku: r.p_barcode || String(r.p_id),

            // not provided by your API: keep stable defaults
            category: r.category_name || "Uncategorized",
            uom: "pcs",
            reorderPoint,

            leadTimeDays: undefined,
            preferredSupplier: undefined,

            onHand,
            committed: 0,
            avgCost,

            lots: [], // loaded on demand when drawer opens
          };
        });

        if (mounted) {
          setItems(mapped);
          setPage(1);
        }
      } catch (e: any) {
        if (mounted)
          setErrorMsg(e?.message || "Unexpected error while loading products.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ───────────────────────── Filters ───────────────────────── */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();

    return items.filter((it) => {
      const txt =
        !t ||
        it.name.toLowerCase().includes(t) ||
        it.sku.toLowerCase().includes(t);

      const c = cat === "All" || it.category === cat;

      const locationMatch =
        loc === "All" || it.lots.some((l) => l.location === loc);

      const low = it.onHand <= it.reorderPoint && it.onHand > 0;
      const out = it.onHand <= 0;
      const expiring = it.lots.some(
        (l) => (dateDiffDays(l.expiry) ?? 9999) <= 5,
      );
      const over = it.onHand > it.reorderPoint * 4 && it.reorderPoint > 0;

      const st =
        status === "all" ||
        (status === "low" && low) ||
        (status === "out" && out) ||
        (status === "expiring" && expiring) ||
        (status === "overstock" && over);

      return txt && c && locationMatch && st;
    });
  }, [items, q, cat, loc, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  const toggleSel = (id: string, v: boolean) =>
    setSelected((s) => ({ ...s, [id]: v }));

  const toggleAll = () => {
    const all = pageItems.every((i) => selected[i.id]);
    const draft = { ...selected };
    pageItems.forEach((i) => (draft[i.id] = !all));
    setSelected(draft);
  };

  /* ───────────────────────── Export CSV (same) ───────────────────────── */
  const exportCSV = () => {
    const cols = [
      "Name",
      "SKU",
      "Category",
      "UOM",
      "OnHand",
      "Committed",
      "Available",
      "ReorderPoint",
      "AvgCost",
      "Valuation",
      "LeadTime",
      "Supplier",
    ];

    const rows = filtered.map((i) => [
      i.name,
      i.sku,
      i.category,
      i.uom,
      i.onHand,
      i.committed,
      Math.max(0, i.onHand - i.committed),
      i.reorderPoint,
      i.avgCost,
      (i.avgCost * i.onHand).toFixed(2),
      i.leadTimeDays ?? "",
      i.preferredSupplier ?? "",
    ]);

    const csv = [cols.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_items.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ───────────────────────── Lots loading ───────────────────────── */
  const openLotsDrawer = async (item: InventoryItem) => {
    setDrawer({ open: true, itemId: item.id });

    if (item.lots.length > 0) return;

    const data = await apiGetLotsByProductId(g_hash, user_id, warehouse_id, Number(item.id));
    if (data.is_error) return;

    const mappedLots: Lot[] = (data.lots || []).map((l): Lot => {
      const qty = Number(l.quantity || 0);
      const priceItem = Number(l.price_item || 0);
      const priceStock = Number(l.price_stock || 0);

      const unitCost =
        priceItem > 0 ? priceItem : qty > 0 ? priceStock / qty : 0;

      return {
        id: String(l.stock_id),
        code:
          (l.lot_label && l.lot_label.trim()) ||
          (l.lot_uid && l.lot_uid.trim()) ||
          `LOT-${l.stock_id}`,
        qty,
        uom: item.uom,
        expiry: l.expiry_date || undefined,
        location: "Main Store",
        warehouseId: l.warehouse_id,
        unitCost,
        supplier: l.supplier_id ? `Supplier #${l.supplier_id}` : undefined,
        createdAt: (l.created_at || todayISO()).slice(0, 10),
      };
    });

    setItems((arr) =>
      arr.map((it) =>
        it.id === item.id
          ? {
              ...it,
              lots: mappedLots,
              onHand: mappedLots.reduce((s, l) => s + l.qty, 0),
            }
          : it,
      ),
    );
  };

  const openTransfer = async (item: InventoryItem, lotId?: string) => {
    // Start with the item as-is; will be replaced if we need to fetch lots
    let currentItem = item;

    // Lots are lazy-loaded (only fetched when the drawer is opened).
    // If the user clicks Transfer directly from the table without opening
    // the drawer first, item.lots is still [] and the dropdown would be empty.
    // So we fetch them here on demand before opening the modal.
    if (item.lots.length === 0) {
      const data = await apiGetLotsByProductId(g_hash, user_id, warehouse_id, Number(item.id));

      if (!data.is_error && data.lots) {
        // Map API rows to Lot objects (same logic as openLotsDrawer)
        const mappedLots: Lot[] = (data.lots || []).map((l): Lot => {
          const qty = Number(l.quantity || 0);
          const priceItem = Number(l.price_item || 0);
          const priceStock = Number(l.price_stock || 0);
          const unitCost = priceItem > 0 ? priceItem : qty > 0 ? priceStock / qty : 0;
          return {
            id: String(l.stock_id),
            code: (l.lot_label && l.lot_label.trim()) || (l.lot_uid && l.lot_uid.trim()) || `LOT-${l.stock_id}`,
            qty,
            uom: item.uom,
            expiry: l.expiry_date || undefined,
            location: "Main Store",
            warehouseId: l.warehouse_id,
            unitCost,
            supplier: l.supplier_id ? `Supplier #${l.supplier_id}` : undefined,
            createdAt: (l.created_at || todayISO()).slice(0, 10),
          };
        });

        // Build the enriched item to pass to the modal
        currentItem = {
          ...item,
          lots: mappedLots,
          onHand: mappedLots.reduce((s, l) => s + l.qty, 0),
        };

        // Also update global items state so the drawer benefits if opened later
        setItems((arr) => arr.map((it) => (it.id === item.id ? currentItem : it)));
      }
    }

    // Open the modal — currentItem now has lots populated (fetched or pre-loaded)
    setMove({ open: true, item: currentItem, lotId });
  };
  const openCount = (item: InventoryItem) => setCount({ open: true, item });

  /* ───────────────────────── Reload lots after a successful transfer ───────────────────────── */
  const reloadItemLots = async (itemId: string) => {
    const data = await apiGetLotsByProductId(g_hash, user_id, warehouse_id, Number(itemId));
    if (data.is_error || !data.lots) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const mappedLots: Lot[] = (data.lots || []).map((l): Lot => {
      const qty = Number(l.quantity || 0);
      const priceItem = Number(l.price_item || 0);
      const priceStock = Number(l.price_stock || 0);
      const unitCost = priceItem > 0 ? priceItem : qty > 0 ? priceStock / qty : 0;
      return {
        id: String(l.stock_id),
        code: (l.lot_label && l.lot_label.trim()) || (l.lot_uid && l.lot_uid.trim()) || `LOT-${l.stock_id}`,
        qty,
        uom: item.uom,
        expiry: l.expiry_date || undefined,
        location: "Main Store",
        warehouseId: l.warehouse_id,
        unitCost,
        supplier: l.supplier_id ? `Supplier #${l.supplier_id}` : undefined,
        createdAt: (l.created_at || todayISO()).slice(0, 10),
      };
    });

    setItems((arr) =>
      arr.map((it) =>
        it.id === itemId
          ? { ...it, lots: mappedLots, onHand: mappedLots.reduce((s, l) => s + l.qty, 0) }
          : it,
      ),
    );
  };

  const countAdjust = (itemId: string, newTotal: number) => {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== itemId) return it;

        const delta = Number((newTotal - it.onHand).toFixed(3));
        if (Math.abs(delta) < 0.0001) return it;

        if (it.lots.length === 0) {
          it.lots.push({
            id: uid(),
            code: `${it.sku}-${todayISO()}`,
            qty: newTotal,
            uom: it.uom,
            location: "Main Store",
            warehouseId: 0, // placeholder — cycle count local adjustment
            unitCost: it.avgCost,
            createdAt: todayISO(),
          });
        } else {
          const l0 = it.lots[0];
          l0.qty = Number((l0.qty + delta).toFixed(3));
        }

        it.onHand = newTotal;
        return { ...it };
      }),
    );
  };

  const drawerItem = useMemo(() => {
    if (!drawer.itemId) return null;
    return items.find((i) => i.id === drawer.itemId) || null;
  }, [drawer.itemId, items]);

  /* ───────────────────────── Render ───────────────────────── */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Inventory · Items
            </h1>
            <p className="text-sm text-gray-600">
              Stock by item with locations, lots & expiries
            </p>

            {loading && (
              <p className="mt-2 text-sm text-gray-500">Loading products…</p>
            )}

            {!!errorMsg && (
              <p className="mt-2 text-sm font-semibold text-rose-700">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Export
            </button>

            <button
              onClick={() => alert("Import CSV placeholder — wire to your API")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or SKU…"
                className="w-72 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                <option value="All">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/purchase-orders/new")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Factory className="h-4 w-4" /> New PO
            </button>

            <button
              onClick={() => alert("Open stock transfers page placeholder")}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <MoveRight className="h-4 w-4" /> Transfers
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th className="w-[36px]">
                  <input
                    type="checkbox"
                    checked={
                      pageItems.length > 0 &&
                      pageItems.every((i) => selected[i.id])
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">On hand</th>
                <th className="text-right">Committed</th>
                <th className="text-right">Available</th>
                <th className="text-right">Reorder</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Valuation</th>
                <th className="text-right">Lead</th>
                <th className="text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pageItems.map((it) => {
                const available = Math.max(0, it.onHand - it.committed);
                const low = it.onHand <= it.reorderPoint && it.onHand > 0;
                const out = it.onHand <= 0;
                const expSoon = it.lots.some(
                  (l) => (dateDiffDays(l.expiry) ?? 9999) <= 5,
                );

                return (
                  <tr key={it.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[it.id]}
                        onChange={(e) => toggleSel(it.id, e.target.checked)}
                      />
                    </td>

                    <td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-gray-400">
                          <Boxes className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {it.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                            {expSoon && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                <CalendarClock className="h-3.5 w-3.5" />{" "}
                                expiring
                              </span>
                            )}
                            {low && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                <AlertTriangle className="h-3.5 w-3.5" /> low
                              </span>
                            )}
                            {out && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                                out
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="text-gray-700">{it.sku}</td>
                    <td className="text-gray-700">{it.category}</td>

                    <td className="text-right font-semibold text-gray-900">
                      {it.onHand} {it.uom}
                    </td>

                    <td className="text-right">
                      {it.committed} {it.uom}
                    </td>

                    <td className="text-right">
                      {available} {it.uom}
                    </td>

                    <td
                      className={`text-right ${
                        low ? "text-amber-700 font-semibold" : "text-gray-800"
                      }`}
                    >
                      {it.reorderPoint} {it.uom}
                    </td>

                    <td className="text-right">$ {money(it.avgCost)}</td>
                    <td className="text-right font-semibold">
                      $ {money(it.avgCost * it.onHand)}
                    </td>
                    <td className="text-right">{it.leadTimeDays ?? "—"}d</td>

                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openLotsDrawer(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="View lots"
                        >
                          <Layers className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openTransfer(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Transfer stock"
                        >
                          <MoveRight className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openCount(it)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Cycle count"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => alert("Print labels placeholder")}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Print labels"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pageItems.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="py-14 text-center text-sm text-gray-500"
                  >
                    No items found…
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-gray-600">
              Page {page} / {pages} · {filtered.length} item(s)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>

              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold">TitanPOS®</span> — Inventory
        </p>
      </div>

      {/* Lots Drawer */}
      {drawer.open && drawerItem && (
        <LotsDrawer
          item={drawerItem}
          onClose={() => setDrawer({ open: false })}
          onTransfer={openTransfer}
        />
      )}

      {/* Transfer Modal */}
      {move.open && move.item && (
        <TransferModal
          item={move.item}
          lotId={move.lotId}
          g_hash={g_hash}
          user_id={user_id}
          onClose={() => setMove({ open: false })}
          onTransferred={() => {
            reloadItemLots(move.item!.id);
            setMove({ open: false });
          }}
        />
      )}

      {/* Cycle Count Modal */}
      {count.open && count.item && (
        <CountModal
          item={count.item}
          onClose={() => setCount({ open: false, item: null })}
          onSubmit={(newTotal) => {
            countAdjust(count.item!.id, newTotal);
            setCount({ open: false, item: null });
          }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Lots Drawer
 * ──────────────────────────────────────────────────────────────────────────── */
function LotsDrawer({
  item,
  onClose,
  onTransfer,
}: {
  item: InventoryItem;
  onClose: () => void;
  onTransfer: (item: InventoryItem, lotId?: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" />
            <div className="font-bold">Lots / Batches — {item.name}</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {item.lots.map((l) => {
            const d = dateDiffDays(l.expiry);
            const expCls =
              d === undefined
                ? "text-gray-700"
                : d <= 0
                  ? "text-rose-700 font-semibold"
                  : d <= 5
                    ? "text-amber-700 font-semibold"
                    : "text-gray-700";

            return (
              <div
                key={l.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900">
                      {l.code}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {l.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Barcode className="h-3.5 w-3.5" /> {l.uom}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Factory className="h-3.5 w-3.5" /> {l.supplier || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-gray-900">
                      {l.qty} {l.uom}
                    </div>
                    <div className={`text-xs ${expCls}`}>
                      {l.expiry
                        ? d! <= 0
                          ? "Expired"
                          : `Expires in ${d}d`
                        : "No expiry"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Unit Cost</div>
                    <div>$ {money(l.unitCost)}</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Valuation</div>
                    <div className="font-semibold">
                      $ {money(l.unitCost * l.qty)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-gray-600">Received</div>
                    <div>{l.createdAt}</div>
                  </div>

                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => onTransfer(item, l.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <MoveRight className="h-4 w-4" /> Transfer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {item.lots.length === 0 && (
            <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No lots for this item.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Transfer Modal — warehouse-to-warehouse via real API
 * ──────────────────────────────────────────────────────────────────────────── */
function TransferModal({
  item,
  lotId,
  g_hash,
  user_id,
  onClose,
  onTransferred,
}: {
  item: InventoryItem;
  lotId?: string;
  g_hash: string | null;
  user_id: string | null;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [targetLotId, setTargetLotId] = useState<string>(
    lotId || item.lots[0]?.id || "",
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [toWarehouseId, setToWarehouseId] = useState<number | "">("");
  const [qty, setQty] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [whLoading, setWhLoading] = useState(true);

  const lot = item.lots.find((l) => l.id === targetLotId);
  const maxQty = lot ? lot.qty : 0;

  // Load warehouses on mount, then exclude source warehouse
  useEffect(() => {
    setWhLoading(true);
    apiGetWarehouses(g_hash, user_id)
      .then((data) => {
        if (data.is_error || !data.warehouses) {
          setError(data.error_message || "Failed to load warehouses.");
          return;
        }
        setWarehouses(data.warehouses);
      })
      .catch(() => setError("Failed to load warehouses."))
      .finally(() => setWhLoading(false));
  }, [g_hash, user_id]);

  // When the source lot changes, reset destination
  useEffect(() => {
    setToWarehouseId("");
  }, [targetLotId]);

  const availableWarehouses = warehouses.filter(
    (w) => w.id !== (lot?.warehouseId ?? -1),
  );

  const numQty = Number(qty);
  const canSubmit =
    !!targetLotId &&
    toWarehouseId !== "" &&
    numQty > 0 &&
    numQty <= maxQty &&
    !loading;

  const handleTransfer = async () => {
    if (!canSubmit || !g_hash || !user_id) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiTransferStock({
        g_hash,
        user_id,
        from_stock_id: Number(targetLotId),
        to_warehouse_id: Number(toWarehouseId),
        qty: numQty,
        notes,
      });
      if (res.is_error) {
        setError(res.error_message || "Transfer failed.");
        return;
      }
      onTransferred();
    } catch {
      setError("Network error. Transfer could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">
            Transfer Stock — {item.name}
          </div>
          <button
            className="rounded-lg p-1 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {/* From batch */}
          <div>
            <label className="text-xs text-gray-600">From Batch</label>
            <select
              value={targetLotId}
              onChange={(e) => setTargetLotId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {item.lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.qty} {l.uom} @ ${money(l.unitCost)}
                </option>
              ))}
            </select>
            {lot && (
              <p className="mt-1 text-xs text-gray-500">
                Available: <b>{lot.qty} {lot.uom}</b>
              </p>
            )}
          </div>

          {/* To warehouse */}
          <div>
            <label className="text-xs text-gray-600">To Warehouse</label>
            {whLoading ? (
              <p className="mt-1 text-xs text-gray-500">Loading warehouses…</p>
            ) : (
              <select
                value={toWarehouseId}
                onChange={(e) =>
                  setToWarehouseId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <option value="">— Select warehouse —</option>
                {availableWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-gray-600">Quantity</label>
            <input
              type="number"
              min={0.001}
              step="any"
              value={qty}
              onChange={(e) =>
                setQty(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">Max: {maxQty} {lot?.uom}</p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-600">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
              placeholder="Reason for transfer…"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              disabled={!canSubmit}
              onClick={handleTransfer}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <MoveRight className="h-4 w-4" />
              {loading ? "Transferring…" : "Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Cycle Count Modal
 * ──────────────────────────────────────────────────────────────────────────── */
function CountModal({
  item,
  onClose,
  onSubmit,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSubmit: (newTotal: number) => void;
}) {
  const [newTotal, setNewTotal] = useState<number>(item.onHand);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">
            Cycle Count — {item.name}
          </div>
          <button
            className="rounded-lg p-1 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="text-sm text-gray-700">
            Current On Hand:{" "}
            <b>
              {item.onHand} {item.uom}
            </b>
          </div>

          <div>
            <label className="text-xs text-gray-600">New On Hand</label>
            <input
              type="number"
              value={newTotal}
              onChange={(e) => setNewTotal(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
            />
          </div>

          <div className="text-xs text-gray-500">
            This creates an <b>inventory adjustment</b> (reason: Cycle Count).
            In production, record user, timestamp, and delta for audit.
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={() => onSubmit(newTotal)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
