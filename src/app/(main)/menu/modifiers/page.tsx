"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Search, Plus, Pencil, Trash2, X, CheckCircle2, BadgeCheck,
  CircleSlash2, ArrowUpDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { ComboBox } from "@/components/shared/combo-box";

const API = process.env.NEXT_PUBLIC_API_LINK;
const PER_PAGE = 12;

type Modifier = {
  m_id: number;
  m_modifier_name: string;
  m_modifier_description: string;
  m_item_id: number | null;
  m_unit_id: number | null;
  m_currency_id: number | null;
  m_quantity: number;
  m_cost_modifier: number;
  m_price_modifier: number;
  m_is_active: number;
  m_is_required: number;
  m_is_single: number;
};

type ProductOption  = { p_id: number; p_product_name: string };
type UnitOption     = { su_id: number; su_unit_label: string; su_unit_code: string };
type CurrencyOption = { currency_id: number; currency_code: string; currency_name: string };

type FormState = {
  m_modifier_name: string;
  m_modifier_description: string;
  m_item_id: number | null;
  m_unit_id: number | null;
  m_currency_id: number | null;
  m_quantity: number;
  m_cost_modifier: number;
  m_price_modifier: number;
  m_is_active: boolean;
  m_is_required: boolean;
  m_is_single: boolean;
};

const EMPTY_FORM: FormState = {
  m_modifier_name: "",
  m_modifier_description: "",
  m_item_id: null,
  m_unit_id: null,
  m_currency_id: null,
  m_quantity: 0,
  m_cost_modifier: 0,
  m_price_modifier: 0,
  m_is_active: true,
  m_is_required: false,
  m_is_single: false,
};

/* ─────────────────────────────────────────
 * API helpers
 * ───────────────────────────────────────── */
async function apiGetModifiers(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/inventory/getlistmodifiers", {
    params: { g_hash, user_id },
  });
  return res.data as { is_error: number; error_msg: string; lst_modifiers?: Modifier[] };
}

async function apiSaveModifier(data: Omit<Modifier, "m_id"> & { m_id?: number; g_hash: string; user_id: string }) {
  const res = await axios.post(API + "/api/inventory/savemodifier", data);
  return res.data as { is_error: number; error_msg: string; m_id?: number };
}

async function apiDeleteModifier(m_id: number, g_hash: string, user_id: string) {
  const res = await axios.delete(API + "/api/inventory/deletemodifier", { data: { m_id, g_hash, user_id } });
  return res.data as { is_error: number; error_msg: string };
}

async function apiGetProducts(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/request/api/getlistproducts", {
    params: { g_hash, user_id, has_pagination: 0 },
  });
  return res.data as { is_error?: number; products?: Record<string, ProductOption> };
}

async function apiGetUnits(g_hash: string, user_id: string) {
  const res = await axios.get(API + "/api/inventory/getlistunits", {
    params: { g_hash, user_id },
  });
  return res.data as { is_error: number; lst_units?: UnitOption[] };
}

async function apiGetCurrencies(g_hash: string, user_id: string) {
  const res = await axios.post(API + "/request/api/getlistcurrency", { g_hash, user_id });
  return res.data as { currencies?: Record<string, { currency_id: number; currency_code: string; currency_name: string }> };
}

/* ─────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────── */
const money = (n: number) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const stripHtml = (html: string) =>
  (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function inp(err?: string) {
  return `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-4 ${
    err ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-orange-400 focus:ring-orange-100"
  }`;
}

function PaginationBar({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => setPage(p as number)}
            className={`min-w-[2rem] rounded-xl border px-2 py-1 text-sm ${
              p === page
                ? "border-orange-400 bg-orange-50 font-semibold text-orange-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ModifiersPage() {
  const { g_hash, user_id } = useAppSelector((s: any) => s.auth.loginData) ?? {};

  const [modifiers,  setModifiers]  = useState<Modifier[]>([]);
  const [products,   setProducts]   = useState<ProductOption[]>([]);
  const [units,      setUnits]      = useState<UnitOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [q,             setQ]             = useState("");
  const [page,          setPage]          = useState(1);
  const [drawer,        setDrawer]        = useState<{ open: boolean; modifier: Modifier | null }>({ open: false, modifier: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadModifiers = async () => {
    if (!g_hash || !user_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetModifiers(g_hash, user_id);
      if (data.is_error) throw new Error(data.error_msg);
      setModifiers(data.lst_modifiers ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load modifiers");
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    if (!g_hash || !user_id) return;
    try {
      const [prodRes, unitRes, currRes] = await Promise.all([
        apiGetProducts(g_hash, user_id),
        apiGetUnits(g_hash, user_id),
        apiGetCurrencies(g_hash, user_id),
      ]);
      if (prodRes.products) setProducts(Object.values(prodRes.products));
      if (!unitRes.is_error) setUnits(unitRes.lst_units ?? []);
      if (currRes.currencies) setCurrencies(Object.values(currRes.currencies));
    } catch {}
  };

  useEffect(() => {
    loadLookups();
    loadModifiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g_hash, user_id]);

  useEffect(() => { setPage(1); }, [q]);

  /* ── filter + paginate ── */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return modifiers;
    return modifiers.filter(
      (m) => (m.m_modifier_name ?? "").toLowerCase().includes(t) ||
             (m.m_modifier_description ?? "").toLowerCase().includes(t),
    );
  }, [modifiers, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );
  const from = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to   = Math.min(page * PER_PAGE, filtered.length);

  const handleDelete = async (id: number) => {
    try {
      await apiDeleteModifier(id, g_hash, user_id);
      setModifiers((arr) => arr.filter((m) => m.m_id !== id));
      setDeleteConfirm(null);
    } catch {}
  };

  const exportExcel = () => {
    const cols = ["ID", "Name", "Description", "Price", "Cost", "Quantity", "Active", "Required", "Single"];
    const rows = modifiers.map((m) => [
      m.m_id,
      m.m_modifier_name,
      stripHtml(m.m_modifier_description ?? ""),
      m.m_price_modifier,
      m.m_cost_modifier,
      m.m_quantity,
      m.m_is_active  ? "Yes" : "No",
      m.m_is_required ? "Yes" : "No",
      m.m_is_single  ? "Yes" : "No",
    ]);
    const csv = [
      cols.join(","),
      ...rows.map((r) => r.map((x) => typeof x === "string" && x.includes(",") ? `"${x}"` : x).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "modifiers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Menu</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Modifiers</h1>
            <p className="mt-0.5 text-sm text-gray-600">Manage your modifier options — price add-ons, removals, and extras</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <ArrowUpDown className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={() => setDrawer({ open: true, modifier: null })}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
            >
              <Plus className="h-4 w-4" /> New Modifier
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modifier name or description…"
              className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
          <span className="text-xs text-gray-500">
            {filtered.length === 0
              ? "0 modifiers"
              : `${from}–${to} of ${filtered.length} modifiers`}
          </span>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
            Loading modifiers…
          </div>
        )}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((m) => (
                <div key={m.m_id} className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-extrabold text-gray-900">{m.m_modifier_name}</div>
                        {m.m_modifier_description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-gray-500">{stripHtml(m.m_modifier_description)}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => setDrawer({ open: true, modifier: m })}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(m.m_id)}
                          className="rounded-lg border border-red-100 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {!!m.m_is_active   && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>}
                      {!!m.m_is_required && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Required</span>}
                      {!!m.m_is_single   && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Single</span>}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-baseline gap-3">
                        <span className="font-semibold text-gray-900">+{money(m.m_price_modifier)}</span>
                        {Number(m.m_cost_modifier) > 0 && (
                          <span className="text-xs text-gray-500">Cost: {money(m.m_cost_modifier)}</span>
                        )}
                      </div>
                      {Number(m.m_quantity) > 0 && (
                        <span className="text-xs text-gray-500">Qty: {m.m_quantity}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {paginated.length === 0 && (
                <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
                  No modifiers found…
                </div>
              )}
            </div>
            <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
          </>
        )}

        <p className="pb-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Modifiers
        </p>
      </div>

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-80 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 font-bold text-gray-900">Delete modifier?</div>
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

      {/* Add / Edit drawer */}
      {drawer.open && (
        <ModifierDrawer
          modifier={drawer.modifier}
          products={products}
          units={units}
          currencies={currencies}
          onClose={() => setDrawer({ open: false, modifier: null })}
          onSaved={() => { setDrawer({ open: false, modifier: null }); loadModifiers(); }}
        />
      )}
    </div>
  );
}

function ModifierDrawer({
  modifier, products, units, currencies, onClose, onSaved,
}: {
  modifier: Modifier | null;
  products: ProductOption[];
  units: UnitOption[];
  currencies: CurrencyOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { g_hash, user_id } = useAppSelector((s: any) => s.auth.loginData) ?? {};
  const isNew = !modifier;

  const [form, setForm] = useState<FormState>(
    isNew ? EMPTY_FORM : {
      m_modifier_name:        modifier.m_modifier_name,
      m_modifier_description: modifier.m_modifier_description ?? "",
      m_item_id:              modifier.m_item_id  || null,
      m_unit_id:              modifier.m_unit_id  || null,
      m_currency_id:          modifier.m_currency_id || null,
      m_quantity:             Number(modifier.m_quantity)      || 0,
      m_cost_modifier:        Number(modifier.m_cost_modifier) || 0,
      m_price_modifier:       Number(modifier.m_price_modifier) || 0,
      m_is_active:            !!modifier.m_is_active,
      m_is_required:          !!modifier.m_is_required,
      m_is_single:            !!modifier.m_is_single,
    },
  );

  const set = useCallback((patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch })), []);
  const [errors,    setErrors]    = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.m_modifier_name.trim()) errs.m_modifier_name = "Modifier name is required";
    if (!form.m_unit_id)             errs.m_unit_id       = "Unit is required";
    if (!form.m_currency_id)         errs.m_currency_id   = "Currency is required";
    if (form.m_quantity <= 0)        errs.m_quantity       = "Quantity must be greater than 0";
    if (form.m_price_modifier < 0)   errs.m_price_modifier = "Price cannot be negative";
    if (form.m_cost_modifier < 0)    errs.m_cost_modifier  = "Cost cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiSaveModifier({
        ...(isNew ? {} : { m_id: modifier!.m_id }),
        g_hash,
        user_id,
        m_modifier_name:        form.m_modifier_name,
        m_modifier_description: form.m_modifier_description,
        m_item_id:              form.m_item_id,
        m_unit_id:              form.m_unit_id,
        m_currency_id:          form.m_currency_id,
        m_quantity:             form.m_quantity,
        m_cost_modifier:        form.m_cost_modifier,
        m_price_modifier:       form.m_price_modifier,
        m_is_active:            form.m_is_active  ? 1 : 0,
        m_is_required:          form.m_is_required ? 1 : 0,
        m_is_single:            form.m_is_single  ? 1 : 0,
      } as any);
      if (res.is_error) throw new Error(res.error_msg);
      onSaved();
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">
            {isNew ? "New Modifier" : `Edit: ${modifier?.m_modifier_name}`}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}

          {/* ── Modifier Details ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 font-semibold text-gray-800">Modifier Details</div>
            <div className="grid gap-3 sm:grid-cols-2">

              {/* Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-700">
                  Modifier Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.m_modifier_name}
                  onChange={(e) => { set({ m_modifier_name: e.target.value }); setErrors((er) => ({ ...er, m_modifier_name: undefined })); }}
                  className={inp(errors.m_modifier_name)}
                  placeholder="e.g. Extra Cheese"
                />
                {errors.m_modifier_name && <p className="mt-1 text-xs text-red-500">{errors.m_modifier_name}</p>}
              </div>

              {/* Product (raw material) */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Product (Raw Material)</label>
                <ComboBox
                  value={form.m_item_id}
                  onChange={(v) => set({ m_item_id: v })}
                  options={products.map((p) => ({ value: p.p_id, label: p.p_product_name }))}
                  placeholder="— Select product —"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Modifier Description</label>
                <textarea
                  value={form.m_modifier_description}
                  onChange={(e) => set({ m_modifier_description: e.target.value })}
                  rows={2}
                  className={inp() + " resize-none"}
                  placeholder="Enter description…"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs font-medium text-gray-700">Unit <span className="text-red-500">*</span></label>
                <ComboBox
                  value={form.m_unit_id}
                  onChange={(v) => { set({ m_unit_id: v }); setErrors((er) => ({ ...er, m_unit_id: undefined })); }}
                  options={units.map((u) => ({ value: u.su_id, label: `${u.su_unit_code} - ${u.su_unit_label}` }))}
                  placeholder="— Select unit —"
                  error={errors.m_unit_id}
                />
                {errors.m_unit_id && <p className="mt-1 text-xs text-red-500">{errors.m_unit_id}</p>}
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-medium text-gray-700">Currency <span className="text-red-500">*</span></label>
                <ComboBox
                  value={form.m_currency_id}
                  onChange={(v) => { set({ m_currency_id: v }); setErrors((er) => ({ ...er, m_currency_id: undefined })); }}
                  options={currencies.map((c) => ({ value: c.currency_id, label: `${c.currency_code} — ${c.currency_name}` }))}
                  placeholder="— Select currency —"
                  error={errors.m_currency_id}
                />
                {errors.m_currency_id && <p className="mt-1 text-xs text-red-500">{errors.m_currency_id}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-medium text-gray-700">Quantity <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.m_quantity}
                  onChange={(e) => { set({ m_quantity: Number(e.target.value) || 0 }); setErrors((er) => ({ ...er, m_quantity: undefined })); }}
                  className={inp(errors.m_quantity) + " text-right"}
                />
                {errors.m_quantity && <p className="mt-1 text-xs text-red-500">{errors.m_quantity}</p>}
              </div>

              {/* Cost */}
              <div>
                <label className="text-xs text-gray-600">Cost</label>
                <input
                  type="number"
                  value={form.m_cost_modifier}
                  onChange={(e) => { set({ m_cost_modifier: Number(e.target.value) || 0 }); setErrors((er) => ({ ...er, m_cost_modifier: undefined })); }}
                  className={inp(errors.m_cost_modifier) + " text-right"}
                />
                {errors.m_cost_modifier && <p className="mt-1 text-xs text-red-500">{errors.m_cost_modifier}</p>}
              </div>

              {/* Price */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Price</label>
                <input
                  type="number"
                  value={form.m_price_modifier}
                  onChange={(e) => { set({ m_price_modifier: Number(e.target.value) || 0 }); setErrors((er) => ({ ...er, m_price_modifier: undefined })); }}
                  className={inp(errors.m_price_modifier) + " text-right"}
                />
                {errors.m_price_modifier && <p className="mt-1 text-xs text-red-500">{errors.m_price_modifier}</p>}
              </div>
            </div>
          </section>

          {/* ── Options ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 font-semibold text-gray-800">Options</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => set({ m_is_active: !form.m_is_active })}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm ${
                  form.m_is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {form.m_is_active ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                {form.m_is_active ? "Active" : "Inactive"}
              </button>

              <button
                type="button"
                onClick={() => set({ m_is_required: !form.m_is_required })}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm ${
                  form.m_is_required ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {form.m_is_required ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                {form.m_is_required ? "Required" : "Optional"}
              </button>

              <button
                type="button"
                onClick={() => set({ m_is_single: !form.m_is_single })}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm ${
                  form.m_is_single ? "border-violet-200 bg-violet-50 text-violet-700" : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {form.m_is_single ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                {form.m_is_single ? "Single" : "Multi"}
              </button>
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? "Saving…" : "Save Modifier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
