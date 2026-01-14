"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Boxes,
  Search,
  Filter,
  Upload,
  Download,
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
import { useParams, useRouter } from "next/navigation";

type UID = string;
type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Category = string;
type Location = "Main Store" | "Kitchen" | "Bar" | "Cold Room" | "Freezer";

type Lot = {
  id: UID;
  code: string;
  qty: number;
  uom: UOM;
  expiry?: string;
  location: Location;
  unitCost: number;
  supplier?: string;
  createdAt: string;
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
  onHand: number;
  committed: number;
  avgCost: number;
  lastCost?: number;
  lots: Lot[];
};

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

function getAuthPayload() {
  return {
    user_id: Number(localStorage.getItem("user_id") || "0"),
    warehouse_id: Number(localStorage.getItem("warehouse_id") || "0"),
    g_hash: localStorage.getItem("g_hash") || "",
  };
}

async function apiGetProducts(fk_pc_id?: number) {
  const { user_id, warehouse_id, g_hash } = getAuthPayload();

  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_LINK + "/api/products/getproducts",
    {
      params: { user_id, warehouse_id, g_hash, fk_pc_id },
    }
  );

  return res.data;
}

async function apiGetLotsByProductId(product_id: number) {
  const { user_id, warehouse_id, g_hash } = getAuthPayload();

  const res = await axios.get(
    process.env.NEXT_PUBLIC_API_LINK +
      "/api/products/getproductlotsbyproductid",
    {
      params: { user_id, product_id, warehouse_id, g_hash },
    }
  );

  return res.data;
}

export default function InventoryItemsPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = Number(params.categoryId);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [loc, setLoc] = useState<Location | "All">("All");
  const [status, setStatus] = useState<
    "all" | "low" | "out" | "expiring" | "overstock"
  >("all");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [drawer, setDrawer] = useState<{ open: boolean; itemId?: string }>({
    open: false,
  });

  const [move, setMove] = useState<{
    open: boolean;
    item?: InventoryItem | null;
    lotId?: string;
  }>({ open: false });

  const [count, setCount] = useState<{
    open: boolean;
    item?: InventoryItem | null;
  }>({ open: false });

  const pageSize = 8;

  /* Categories (FIXED) */
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const data = await apiGetProducts(categoryId);
        if (data?.is_error) {
          setErrorMsg(data.error_message);
          return;
        }

        const mapped: InventoryItem[] = (data.products || []).map((r: any) => ({
          id: String(r.p_id),
          name: r.p_product_name || "",
          sku: r.p_barcode || String(r.p_id),
          category: r.category_name || "Uncategorized",
          uom: "pcs",
          reorderPoint: Number(r.p_product_stock_alert || 0),
          onHand: Number(r.on_hand_qty || 0),
          committed: 0,
          avgCost: Number(r.avg_cost || 0),
          lots: [],
        }));

        if (mounted) {
          setItems(mapped);
          setPage(1);
        }
      } catch (e: any) {
        if (mounted) setErrorMsg(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [categoryId]);

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
        (l) => (dateDiffDays(l.expiry) ?? 9999) <= 5
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
    [filtered, page]
  );

  const toggleSel = (id: string, v: boolean) =>
    setSelected((s) => ({ ...s, [id]: v }));

  const toggleAll = () => {
    const all = pageItems.every((i) => selected[i.id]);
    const draft = { ...selected };
    pageItems.forEach((i) => (draft[i.id] = !all));
    setSelected(draft);
  };

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

  const openLotsDrawer = async (item: InventoryItem) => {
    setLoading(true);

    try {
      if (item.lots.length === 0) {
        const data = await apiGetLotsByProductId(Number(item.id));
        if (data?.is_error) return;

        const mappedLots: Lot[] = (data.lots || []).map((l: any): Lot => {
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
              : it
          )
        );
      }

      // ✅ OPEN AFTER DATA READY
      setDrawer({ open: true, itemId: item.id });
    } finally {
      setLoading(false);
    }
  };

  const drawerItem = useMemo(
    () => items.find((i) => i.id === drawer.itemId) || null,
    [drawer.itemId, items]
  );


  const openTransfer = (item: InventoryItem, lotId?: string) => {
    setMove({ open: true, item, lotId });
  };

  const openCount = (item: InventoryItem) => {
    setCount({ open: true, item });
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
            unitCost: it.avgCost,
            createdAt: todayISO(),
          });
        } else {
          it.lots[0].qty = Number((it.lots[0].qty + delta).toFixed(3));
        }

        it.onHand = newTotal;
        return { ...it };
      })
    );
  };

  const transfer = (
    itemId: string,
    lotId: string,
    to: Location,
    qty: number
  ) => {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== itemId) return it;

        const lot = it.lots.find((l) => l.id === lotId);
        if (!lot || qty <= 0 || qty > lot.qty) return it;

        lot.qty = Number((lot.qty - qty).toFixed(3));

        const existing = it.lots.find(
          (l) =>
            l.code === lot.code &&
            l.location === to &&
            l.unitCost === lot.unitCost &&
            l.expiry === lot.expiry
        );

        if (existing) {
          existing.qty = Number((existing.qty + qty).toFixed(3));
        } else {
          it.lots.push({
            id: uid(),
            code: lot.code,
            qty,
            uom: lot.uom,
            expiry: lot.expiry,
            location: to,
            unitCost: lot.unitCost,
            supplier: lot.supplier,
            createdAt: lot.createdAt,
          });
        }

        it.onHand = Number(it.lots.reduce((s, l) => s + l.qty, 0).toFixed(3));

        return { ...it };
      })
    );
  };

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
                  (l) => (dateDiffDays(l.expiry) ?? 9999) <= 5
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

      {drawer.open && drawerItem && Array.isArray(drawerItem.lots) && (
        <LotsDrawer
          item={drawerItem}
          onClose={() => setDrawer({ open: false })}
          onTransfer={openTransfer}
        />
      )}

      {move.open && move.item && (
        <TransferModal
          item={move.item}
          lotId={move.lotId}
          onClose={() => setMove({ open: false })}
          onTransfer={(lotId, to, qty) => {
            transfer(move.item!.id, lotId, to, qty);
            setMove({ open: false });
          }}
        />
      )}

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
 * Transfer Modal
 * ──────────────────────────────────────────────────────────────────────────── */
function TransferModal({
  item,
  lotId,
  onClose,
  onTransfer,
}: {
  item: InventoryItem;
  lotId?: string;
  onClose: () => void;
  onTransfer: (lotId: string, to: Location, qty: number) => void;
}) {
  const [targetLot, setTargetLot] = useState<string>(
    lotId || item.lots[0]?.id || ""
  );
  const [to, setTo] = useState<Location>("Kitchen");
  const [qty, setQty] = useState<number>(0);

  const lot = item.lots.find((l) => l.id === targetLot);
  const maxQty = lot ? lot.qty : 0;

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
          <div>
            <label className="text-xs text-gray-600">From Lot</label>
            <select
              value={targetLot}
              onChange={(e) => setTargetLot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {item.lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.qty} {l.uom} @ ${money(l.unitCost)} ·{" "}
                  {l.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">To Location</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Location)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
            />
            <div className="mt-1 text-xs text-gray-500">
              Max {maxQty} {lot?.uom}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              disabled={!targetLot || qty <= 0 || qty > maxQty}
              onClick={() => onTransfer(targetLot, to, qty)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <MoveRight className="h-4 w-4" /> Transfer
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
