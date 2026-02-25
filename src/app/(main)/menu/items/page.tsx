"use client";

import React, {  useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  Filter,
  Plus,
  Grid as GridIcon,
  List as ListIcon,
  Pencil,
  X,
  Flame,
  Salad,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { ItemDrawer } from "@/components/shared/item-drawer";

export type Category      = { id: number; name: string };
export type UnitOption    = { su_id: number; su_unit_label: string; su_unit_code: string };
export type KitchenOption = { ks_id: number; ks_name: string };
export type CurrencyOption = { currency_id: number; currency_code: string; currency_name: string };

export type ModifierOption = {
  m_id: number;
  m_modifier_name: string;
  m_price_modifier: number;
};

export type AssignedModifier = {
  im_id: number;
  fk_modifier_id: number;
  m_modifier_name: string;
  m_price_modifier: number;
};

export type MenuItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  categoryId: number;
  categoryName: string;
  unitId: number;
  kitchenStationId: number;
  price: number;
  costPrice: number;
  taxRate: number;
  calories: number;
  currencyId: number;
  currencyCode: string;
  spicy: boolean;
  vegetarian: boolean;
  available: boolean;
  imageUrl: string | null;
  description: string;
  loyaltyPoints: number;
  preparationTime: number;
  posOrderDisplay: number;
  maxOrderQuantity: number;
  isActive: boolean;
  modifierCount: number;
};

type ModPopover = {
  itemId: number;
  itemName: string;
  loading: boolean;
  modifiers: { name: string; price: number }[];
};

const money = (n: number) =>
  (n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const API = process.env.NEXT_PUBLIC_API_LINK;
const GRID_PER_PAGE = 10;
const LIST_PER_PAGE = 10;

async function apiGetCategories(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/inventory/listitemcategories", {
    params: { g_hash, user_id },
  });
  return res.data as {
    is_error: number;
    lst_item_categories?: { mc_id: number; mc_category_name: string }[];
  };
}

async function apiGetUnits(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/inventory/getlistunits", {
    params: { g_hash, user_id },
  });
  return res.data as {
    is_error: number;
    lst_units?: { su_id: number; su_unit_label: string; su_unit_code: string }[];
  };
}

async function apiGetKitchens(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/orders/getstationsname", {
    params: { g_hash, user_id },
  });
  return res.data as {
    is_error: number;
    lst_kitchens?: { ks_id: number; ks_name: string }[];
  };
}

async function apiGetCurrencies(g_hash: string, user_id: string) {
  const res = await axios.post(API + "/request/api/getlistcurrency", {
    g_hash,
    user_id,
  });
  return res.data as {
    currencies?: Record<string, { currency_id: number; currency_code: string; currency_name: string }>;
  };
}

async function apiGetItems(g_hash: string, user_id: string, category_id?: number | null) {
  const res = await axios.get(API + "/api/inventory/getlistofitems", {
    params: { g_hash, user_id, category_id: category_id ?? undefined },
  });
  return res.data as {
    is_error: number;
    error_msg: string;
    lst_items?: {
      mi_id: number;
      mi_item_name: string;
      mi_sku_code: string;
      mi_barcode: string;
      mi_category_id: number;
      category_name: string;
      mi_unit_id: number;
      mi_kitchen_station_id: number;
      mi_base_price: number;
      mi_cost_price: number;
      mi_tax_percentage: number;
      mi_calories: number;
      cc_id: number;
      currency_code: string;
      mi_is_spicy: number;
      mi_is_vegetarian: number;
      mi_is_available: number;
      mi_image: string | null;
      mi_item_description: string;
      mi_loyalty_points: number;
      mi_preparation_time_minutes: number;
      mi_pos_order_display: number;
      mi_max_order_quantity: number;
      mi_is_active: number;
      mi_modifier_count: number;
    }[];
  };
}

async function apiSaveMenuItem(
  g_hash: string,
  user_id: string,
  data: {
    mi_id: number | null;
    mi_item_name: string;
    mi_sku_code: string;
    mi_barcode: string;
    mi_category_id: number | null;
    mi_unit_id: number | null;
    mi_kitchen_station_id: number | null;
    mi_base_price: number;
    mi_cost_price: number;
    mi_tax_percentage: number;
    mi_calories: number;
    mi_currency_id: number | null;
    mi_is_available: number;
    mi_is_spicy: number;
    mi_is_vegetarian: number;
    mi_item_description: string;
    mi_loyalty_points: number;
    mi_preparation_time_minutes: number;
    mi_pos_order_display: number;
    mi_max_order_quantity: number;
    mi_is_active: number;
  },
  imageFile: File | null,
  removeImage: boolean = false
) {
  const fd = new FormData();
  fd.append("g_hash", g_hash);
  fd.append("user_id", user_id);
  if (data.mi_id != null) fd.append("mi_id", String(data.mi_id));
  fd.append("mi_item_name", data.mi_item_name);
  fd.append("mi_sku_code", data.mi_sku_code);
  fd.append("mi_barcode", data.mi_barcode);
  fd.append("mi_category_id", String(data.mi_category_id ?? ""));
  fd.append("mi_unit_id", String(data.mi_unit_id ?? ""));
  fd.append("mi_kitchen_station_id", String(data.mi_kitchen_station_id ?? ""));
  fd.append("mi_base_price", String(data.mi_base_price));
  fd.append("mi_cost_price", String(data.mi_cost_price));
  fd.append("mi_tax_percentage", String(data.mi_tax_percentage));
  fd.append("mi_calories", String(data.mi_calories));
  fd.append("mi_currency_id", String(data.mi_currency_id ?? ""));
  fd.append("mi_is_available", String(data.mi_is_available));
  fd.append("mi_is_spicy", String(data.mi_is_spicy));
  fd.append("mi_is_vegetarian", String(data.mi_is_vegetarian));
  fd.append("mi_item_description", data.mi_item_description);
  fd.append("mi_loyalty_points", String(data.mi_loyalty_points));
  fd.append("mi_preparation_time_minutes", String(data.mi_preparation_time_minutes));
  fd.append("mi_pos_order_display", String(data.mi_pos_order_display));
  fd.append("mi_max_order_quantity", String(data.mi_max_order_quantity));
  fd.append("mi_is_active", String(data.mi_is_active));
  if (imageFile) {
    fd.append("mi_avatar_pic", imageFile);
  }

  if (removeImage) {
    fd.append("remove_image", "1");
  }
  const res = await axios.post(API + "/api/inventory/savemenuitemfrompos", fd);
  return res.data as { is_error: number; error_msg: string; mi_id?: number };
}

async function apiDeleteMenuItem(g_hash: string, user_id: string, mi_id: number) {
  const res = await axios.post(API + "/api/inventory/deletemenuitem", { g_hash, user_id, mi_id });
  return res.data as { is_error: number; error_msg: string };
}

async function apiGetModifiers(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/inventory/getlistmodifiers", {
    params: { g_hash, user_id },
  });
  return res.data as {
    is_error: number;
    lst_modifiers?: { m_id: number; m_modifier_name: string; m_price_modifier: number }[];
  };
}

async function apiGetModifiersPerItem(g_hash: string, user_id: string, item_id: number) {
  const res = await axios.get(API + "/api/inventory/getlistmodifiersperitem", {
    params: { g_hash, user_id, item_id },
  });
  return res.data as {
    is_error: number;
    data?: { im_id: number; fk_modifier_id: number }[];
  };
}


/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function MenuItemsPage() {
  const { g_hash, user_id } = useAppSelector((s: any) => s.auth.loginData) ?? {};

  const [items, setItems]         = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits]         = useState<UnitOption[]>([]);
  const [kitchens, setKitchens]   = useState<KitchenOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [q, setQ]       = useState("");
  const [cat, setCat]   = useState<number | "All">("All");
  const [avail, setAvail] = useState<"All" | "Available" | "Unavailable">("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const [drawer, setDrawer] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [modPopover, setModPopover] = useState<ModPopover | null>(null);

  const openModifiers = async (item: MenuItem) => {
    setModPopover({ itemId: item.id, itemName: item.name, loading: true, modifiers: [] });
    try {
      const [allRes, assignedRes] = await Promise.all([
        apiGetModifiers(g_hash, user_id),
        apiGetModifiersPerItem(g_hash, user_id, item.id),
      ]);
      const allMods = allRes.is_error ? [] : (allRes.lst_modifiers ?? []);
      const modifiers = (assignedRes.data ?? []).map((a) => {
        const mod = allMods.find((m) => m.m_id === a.fk_modifier_id);
        return { name: mod?.m_modifier_name ?? `Modifier #${a.fk_modifier_id}`, price: mod?.m_price_modifier ?? 0 };
      });
      setModPopover((p) => p ? { ...p, loading: false, modifiers } : null);
    } catch {
      setModPopover(null);
    }
  };

  /* ── loaders ── */
  const loadItems = async () => {
    if (!g_hash || !user_id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetItems(g_hash, user_id);
      if (data.is_error) throw new Error(data.error_msg);
      setItems(
        (data.lst_items ?? []).map((it) => ({
          id: it.mi_id,
          name: it.mi_item_name,
          sku: it.mi_sku_code ?? "",
          barcode: it.mi_barcode ?? "",
          categoryId: it.mi_category_id,
          categoryName: it.category_name,
          unitId: it.mi_unit_id ?? 0,
          kitchenStationId: it.mi_kitchen_station_id ?? 0,
          price: Number(it.mi_base_price) || 0,
          costPrice: Number(it.mi_cost_price) || 0,
          taxRate: Number(it.mi_tax_percentage) || 0,
          calories: Number(it.mi_calories) || 0,
          currencyId: it.cc_id,
          currencyCode: it.currency_code,
          spicy: !!it.mi_is_spicy,
          vegetarian: !!it.mi_is_vegetarian,
          available: !!it.mi_is_available,
          imageUrl: it.mi_image ?? null,
          description: it.mi_item_description ?? "",
          loyaltyPoints: Number(it.mi_loyalty_points) || 0,
          preparationTime: Number(it.mi_preparation_time_minutes) || 0,
          posOrderDisplay: Number(it.mi_pos_order_display) ?? 1,
          maxOrderQuantity: Number(it.mi_max_order_quantity) || 0,
          isActive: !!it.mi_is_active,
          modifierCount: Number(it.mi_modifier_count) || 0,
        })),
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    if (!g_hash || !user_id) return;
    try {
      const [catRes, unitRes, kitchenRes, currencyRes] = await Promise.all([
        apiGetCategories(g_hash, user_id),
        apiGetUnits(g_hash, user_id),
        apiGetKitchens(g_hash, user_id),
        apiGetCurrencies(g_hash, user_id),
      ]);
      if (!catRes.is_error)
        setCategories((catRes.lst_item_categories ?? []).map((c) => ({ id: c.mc_id, name: c.mc_category_name })));
      if (!unitRes.is_error)
        setUnits(unitRes.lst_units ?? []);
      if (!kitchenRes.is_error)
        setKitchens(kitchenRes.lst_kitchens ?? []);
      if (currencyRes.currencies)
        setCurrencies(Object.values(currencyRes.currencies));
    } catch {}
  };

  useEffect(() => {
    loadLookups();
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g_hash, user_id]);

  // Reset page when filters or view change
  useEffect(() => { setPage(1); }, [q, cat, avail, view]);

  /* ── filter + paginate ── */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((it) => {
      const txt = !t || it.name.toLowerCase().includes(t) || it.sku.toLowerCase().includes(t) || it.barcode.toLowerCase().includes(t);
      const c = cat === "All" || it.categoryId === cat;
      const a = avail === "All" || (avail === "Available" ? it.available : !it.available);
      return txt && c && a;
    });
  }, [items, q, cat, avail]);

  const perPage    = view === "grid" ? GRID_PER_PAGE : LIST_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage],
  );

  /* ── toggle availability ── */
  const toggleAvailability = async (item: MenuItem) => {
    const next = !item.available;
    setItems((arr) => arr.map((it) => (it.id === item.id ? { ...it, available: next } : it)));
    try {
      await apiSaveMenuItem(g_hash, user_id, {
        mi_id: item.id,
        mi_item_name: item.name,
        mi_sku_code: item.sku,
        mi_barcode: item.barcode,
        mi_category_id: item.categoryId || null,
        mi_unit_id: item.unitId || null,
        mi_kitchen_station_id: item.kitchenStationId || null,
        mi_base_price: item.price,
        mi_cost_price: item.costPrice,
        mi_tax_percentage: item.taxRate,
        mi_calories: item.calories,
        mi_currency_id: item.currencyId || null,
        mi_is_available: next ? 1 : 0,
        mi_is_spicy: item.spicy ? 1 : 0,
        mi_is_vegetarian: item.vegetarian ? 1 : 0,
        mi_item_description: item.description,
        mi_loyalty_points: item.loyaltyPoints,
        mi_preparation_time_minutes: item.preparationTime,
        mi_pos_order_display: item.posOrderDisplay,
        mi_max_order_quantity: item.maxOrderQuantity,
        mi_is_active: item.isActive ? 1 : 0,
      }, null);
    } catch {
      setItems((arr) => arr.map((it) => (it.id === item.id ? { ...it, available: item.available } : it)));
    }
  };

  /* ── new / edit ── */
  const startNew = () => {
    const autoBarcode = (Math.floor(Math.random() * 900000000000) + 100000000000).toString();
    setDrawer({
      open: true,
      item: {
        id: 0, name: "", sku: autoBarcode, barcode: autoBarcode,
        categoryId: 0, categoryName: "",
        unitId: 0, kitchenStationId: 0,
        price: 0, costPrice: 0, taxRate: 0, calories: 0,
        currencyId: 0, currencyCode: "",
        spicy: false, vegetarian: false, available: true,
        imageUrl: null, description: "",
        loyaltyPoints: 0, preparationTime: 0, posOrderDisplay: 1,
        maxOrderQuantity: 0, isActive: true, modifierCount: 0,
      },
    });
  };

  const startEdit  = (it: MenuItem) => setDrawer({ open: true, item: { ...it } });
  const handleSaved = () => { setDrawer({ open: false, item: null }); loadItems(); };

  /* ── delete ── */
  const handleDelete = async (id: number) => {
    try {
      await apiDeleteMenuItem(g_hash, user_id, id);
      setItems((arr) => arr.filter((it) => it.id !== id));
      setDeleteConfirm(null);
    } catch {}
  };

  /* ── pagination bar ── */
  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce<(number | "…")[]>((acc, p, i, arr) => {
        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
        acc.push(p);
        return acc;
      }, []);
    return (
      <div className="flex items-center justify-center gap-1.5 pt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-xl border border-gray-200 bg-white p-2 disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p as number)}
              className={`min-w-[2rem] rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                page === p
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl border border-gray-200 bg-white p-2 disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Menu</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Items</h1>
            <p className="mt-0.5 text-sm text-gray-600">Manage your FnB menu items — add, edit, availability</p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Item
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="w-72 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value === "All" ? "All" : Number(e.target.value))}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <select
              value={avail}
              onChange={(e) => setAvail(e.target.value as any)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {["All", "Available", "Unavailable"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{filtered.length} items</span>
            <div className="rounded-2xl border border-gray-200 bg-white p-1">
              <button
                onClick={() => setView("grid")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view === "grid" ? "bg-orange-50 text-orange-700" : "text-gray-700"}`}
              >
                <GridIcon className="mr-1 inline h-4 w-4" /> Grid
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-orange-50 text-orange-700" : "text-gray-700"}`}
              >
                <ListIcon className="mr-1 inline h-4 w-4" /> List
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
            Loading items…
          </div>
        )}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Grid */}
        {!loading && !error && view === "grid" && (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {paginated.map((it) => (
                <div key={it.id} className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                  <div className="relative h-36 w-full bg-gray-50">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-gray-300">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <button
                      onClick={() => toggleAvailability(it)}
                      className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold ring-1 ring-gray-200"
                    >
                      {it.available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="truncate text-base font-extrabold text-gray-900">{it.name}</div>
                        <div className="text-[11px] text-gray-500">{it.sku} · {it.categoryName}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(it)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(it.id)} className="rounded-lg border border-red-100 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {it.spicy && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                          <Flame className="h-3.5 w-3.5" /> spicy
                        </span>
                      )}
                      {it.vegetarian && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          <Salad className="h-3.5 w-3.5" /> veg
                        </span>
                      )}
                      {it.modifierCount > 0 && (
                        <button
                          onClick={() => openModifiers(it)}
                          className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
                        >
                          {it.modifierCount} mod{it.modifierCount !== 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{money(it.price)} {it.currencyCode}</span>
                      {it.taxRate > 0 && <span className="text-[11px] text-gray-500">Tax {it.taxRate}%</span>}
                    </div>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
                  No items found…
                </div>
              )}
            </div>
            <PaginationBar />
          </>
        )}

        {/* List */}
        {!loading && !error && view === "list" && (
          <>
            <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-white text-left text-gray-500">
                  <tr className="[&>th]:py-3 [&>th]:px-3">
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Tax</th>
                    <th>Mods</th>
                    <th>Avail</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((it) => (
                    <tr key={it.id} className="[&>td]:px-3 [&>td]:py-3">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {it.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-gray-300">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{it.name}</div>
                            <div className="flex gap-1 text-[11px]">
                              {it.spicy && <span className="text-amber-600">🌶 spicy</span>}
                              {it.vegetarian && <span className="text-emerald-600">🥗 veg</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-700">{it.sku || "—"}</td>
                      <td className="text-gray-700">{it.categoryName}</td>
                      <td className="text-gray-700">{money(it.price)} {it.currencyCode}</td>
                      <td className="text-gray-700">{it.taxRate > 0 ? `${it.taxRate}%` : "—"}</td>
                      <td>
                        {it.modifierCount > 0 ? (
                          <button
                            onClick={() => openModifiers(it)}
                            className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
                          >
                            {it.modifierCount}
                          </button>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleAvailability(it)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                            it.available
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-gray-50 text-gray-600 ring-gray-200"
                          }`}
                        >
                          {it.available ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {it.available ? "Available" : "Unavailable"}
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(it)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(it.id)} className="rounded-lg border border-red-100 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">No items found…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar />
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Menu
        </p>
      </div>

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-80 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 font-bold text-gray-900">Delete item?</div>
            <p className="mb-4 text-sm text-gray-600">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifiers view modal */}
      {modPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModPopover(null)}>
          <div className="w-80 rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{modPopover.itemName}</p>
                <div className="font-bold text-gray-900">Modifiers</div>
              </div>
              <button onClick={() => setModPopover(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {modPopover.loading ? (
              <p className="text-sm text-gray-500">Loading modifiers…</p>
            ) : modPopover.modifiers.length === 0 ? (
              <p className="text-sm text-gray-500">No modifiers assigned.</p>
            ) : (
              <ul className="space-y-1.5">
                {modPopover.modifiers.map((m, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">{m.name}</span>
                    {m.price > 0 && <span className="text-xs text-gray-500">+{money(m.price)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawer.open && drawer.item && (
        <ItemDrawer
          item={drawer.item}
          categories={categories}
          units={units}
          kitchens={kitchens}
          currencies={currencies}
          g_hash={g_hash}
          user_id={user_id}
          onClose={() => setDrawer({ open: false, item: null })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
