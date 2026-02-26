
"use client";

import { AssignedModifier, Category, CurrencyOption, KitchenOption, MenuItem, ModifierOption, UnitOption } from "@/app/(main)/menu/items/page";
import axios from "axios";
import { BadgeCheck, CheckCircle2, CircleSlash2, Flame, ImageIcon, Salad, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useCallback, useState } from "react";

type FormState = {
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
  mi_is_available: boolean;
  mi_is_spicy: boolean;
  mi_is_vegetarian: boolean;
  mi_item_description: string;
  mi_loyalty_points: number;
  mi_preparation_time_minutes: number;
  mi_pos_order_display: number;
  mi_max_order_quantity: number;
  mi_is_active: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;


const API = process.env.NEXT_PUBLIC_API_LINK;

function inp(err?: string) {
  return `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-4 ${
    err
      ? "border-red-400 focus:ring-red-100"
      : "border-gray-200 focus:border-orange-400 focus:ring-orange-100"
  }`;
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

async function apiDeleteMenuItem(g_hash: string, user_id: string, mi_id: number) {
  const res = await axios.post(API + "/api/inventory/deletemenuitem", { g_hash, user_id, mi_id });
  return res.data as { is_error: number; error_msg: string };
}

async function apiSaveItemModifier(
  g_hash: string,
  user_id: string,
  fk_menu_item_id: number,
  fk_modifier_id: number,
) {
  const res = await axios.post(API + "/api/inventory/saveitemmodifier", {
    g_hash, user_id, fk_menu_item_id, fk_modifier_id,
  });
  return res.data as { is_error: number; error_msg: string; im_id?: number };
}

async function apiDeleteItemModifier(g_hash: string, user_id: string, im_id: number) {
  const res = await axios.post(API + "/api/inventory/deleteitemmodifier", {
    g_hash, user_id, im_id,
  });
  return res.data as { is_error: number; error_msg: string };
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

const money = (n: number) =>
  (n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ── Autocomplete ComboBox ── */
function ComboBox({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  error,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: { value: number; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const filtered = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  const handleSelect = (v: number | null) => {
    onChange(v);
    setQ("");
    setOpen(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQ("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); inputRef.current?.blur(); }
    if (e.key === "Enter" && filtered.length === 1) { handleSelect(filtered[0].value); e.preventDefault(); }
  };

  const cls = `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-4 ${
    error
      ? "border-red-400 focus:ring-red-100"
      : "border-gray-200 focus:border-orange-400 focus:ring-orange-100"
  } ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "bg-white"}`;

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        ref={inputRef}
        value={open ? q : selectedLabel}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(""); setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cls}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                  value === o.value ? "bg-orange-50 font-semibold text-orange-700" : "text-gray-800"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const ItemDrawer = React.memo(function ItemDrawer({
  item,
  categories,
  units,
  kitchens,
  currencies,
  g_hash,
  user_id,
  onClose,
  onSaved,
}: {
  item: MenuItem;
  categories: Category[];
  units: UnitOption[];
  kitchens: KitchenOption[];
  currencies: CurrencyOption[];
  g_hash: string;
  user_id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = item.id === 0;

  const [form, setForm] = useState<FormState>({
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
    mi_is_available: item.available,
    mi_is_spicy: item.spicy,
    mi_is_vegetarian: item.vegetarian,
    mi_item_description: item.description,
    mi_loyalty_points: item.loyaltyPoints,
    mi_preparation_time_minutes: item.preparationTime,
    mi_pos_order_display: item.posOrderDisplay,
    mi_max_order_quantity: item.maxOrderQuantity,
    mi_is_active: item.isActive,
  });

  const set = useCallback((patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);
  const clearErr = (k: keyof FormState) => setErrors((e) => ({ ...e, [k]: undefined }));

  const [errors, setErrors] = useState<FormErrors>({});

  // Image
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item.imageUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modifiers — edit only
  const [allModifiers, setAllModifiers]         = useState<ModifierOption[]>([]);
  const [assignedModifiers, setAssignedModifiers] = useState<AssignedModifier[]>([]);
  const [modLoading, setModLoading]   = useState(false);
  const [modSaving, setModSaving]     = useState(false);

  const loadModifiers = async () => {
    if (isNew) return;
    setModLoading(true);
    try {
      const [allRes, assignedRes] = await Promise.all([
        apiGetModifiers(g_hash, user_id),
        apiGetModifiersPerItem(g_hash, user_id, item.id),
      ]);
      const allMods = allRes.is_error ? [] : (allRes.lst_modifiers ?? []);
      setAllModifiers(allMods);
      if (!assignedRes.is_error) {
        setAssignedModifiers(
          (assignedRes.data ?? []).map((a) => {
            const mod = allMods.find((m) => m.m_id === a.fk_modifier_id);
            return {
              im_id: a.im_id,
              fk_modifier_id: a.fk_modifier_id,
              m_modifier_name: mod?.m_modifier_name ?? `Modifier #${a.fk_modifier_id}`,
              m_price_modifier: mod?.m_price_modifier ?? 0,
            };
          }),
        );
      }
    } catch {}
    finally { setModLoading(false); }
  };

  useEffect(() => { loadModifiers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [deleteDrawerConfirm, setDeleteDrawerConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteFromDrawer = async () => {
    setDeleting(true);
    try {
      const res = await apiDeleteMenuItem(g_hash, user_id, item.id);
      if (res.is_error) throw new Error(res.error_msg);
      onSaved();
    } catch (e: any) {
      setSaveError(e?.message ?? "Delete failed");
      setDeleteDrawerConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddModifier = async (modId: number) => {
    if (!modId || isNew) return;
    setModSaving(true);
    try {
      const res = await apiSaveItemModifier(g_hash, user_id, item.id, modId);
      if (!res.is_error) { await loadModifiers(); }
    } catch {}
    finally { setModSaving(false); }
  };

  const handleRemoveModifier = async (im_id: number) => {
    setModSaving(true);
    try {
      const res = await apiDeleteItemModifier(g_hash, user_id, im_id);
      if (!res.is_error) setAssignedModifiers((arr) => arr.filter((a) => a.im_id !== im_id));
    } catch {}
    finally { setModSaving(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  // Validation
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.mi_item_name.trim())             errs.mi_item_name          = "Item name is required";
    if (!form.mi_base_price || form.mi_base_price <= 0) errs.mi_base_price = "Price must be greater than 0";
    if (!form.mi_currency_id)                  errs.mi_currency_id        = "Currency is required";
    if (!form.mi_category_id)                  errs.mi_category_id        = "Category is required";
    if (!form.mi_kitchen_station_id)           errs.mi_kitchen_station_id = "Kitchen station is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiSaveMenuItem(
        g_hash,
        user_id,
        {
          mi_id: isNew ? null : item.id,
          mi_item_name: form.mi_item_name,
          mi_sku_code: form.mi_sku_code,
          mi_barcode: form.mi_barcode,
          mi_category_id: form.mi_category_id,
          mi_unit_id: form.mi_unit_id,
          mi_kitchen_station_id: form.mi_kitchen_station_id,
          mi_base_price: form.mi_base_price,
          mi_cost_price: form.mi_cost_price,
          mi_tax_percentage: form.mi_tax_percentage,
          mi_calories: form.mi_calories,
          mi_currency_id: form.mi_currency_id,
          mi_is_available: form.mi_is_available ? 1 : 0,
          mi_is_spicy: form.mi_is_spicy ? 1 : 0,
          mi_is_vegetarian: form.mi_is_vegetarian ? 1 : 0,
          mi_item_description: form.mi_item_description,
          mi_loyalty_points: form.mi_loyalty_points,
          mi_preparation_time_minutes: form.mi_preparation_time_minutes,
          mi_pos_order_display: form.mi_pos_order_display,
          mi_max_order_quantity: form.mi_max_order_quantity,
          mi_is_active: form.mi_is_active ? 1 : 0,
        },
        imageFile,
        imagePreview === null && !imageFile
      );
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
            {isNew ? "New Menu Item" : `Edit: ${item.name}`}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}

          {/* ── Essentials ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 font-semibold text-gray-800">Essentials</div>
            <div className="grid gap-3 sm:grid-cols-2">

              {/* Item Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-700">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.mi_item_name}
                  onChange={(e) => { set({ mi_item_name: e.target.value }); clearErr("mi_item_name"); }}
                  className={inp(errors.mi_item_name)}
                  placeholder="e.g. Margherita Pizza"
                />
                {errors.mi_item_name && <p className="mt-1 text-xs text-red-500">{errors.mi_item_name}</p>}
              </div>

              {/* SKU */}
              <div>
                <label className="text-xs text-gray-600">SKU</label>
                <input value={form.mi_sku_code} onChange={(e) => set({ mi_sku_code: e.target.value })} className={inp()} placeholder="e.g. MN-PIZ-001" />
              </div>

              {/* Barcode */}
              <div>
                <label className="text-xs text-gray-600">Barcode</label>
                <input value={form.mi_barcode} onChange={(e) => set({ mi_barcode: e.target.value })} className={inp()} />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <ComboBox
                  value={form.mi_category_id}
                  onChange={(v) => { set({ mi_category_id: v }); clearErr("mi_category_id"); }}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="— Select category —"
                  error={errors.mi_category_id}
                />
                {errors.mi_category_id && <p className="mt-1 text-xs text-red-500">{errors.mi_category_id}</p>}
              </div>

              {/* Kitchen Station */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Kitchen Station <span className="text-red-500">*</span>
                </label>
                <ComboBox
                  value={form.mi_kitchen_station_id}
                  onChange={(v) => { set({ mi_kitchen_station_id: v }); clearErr("mi_kitchen_station_id"); }}
                  options={kitchens.map((k) => ({ value: k.ks_id, label: k.ks_name }))}
                  placeholder="— Select station —"
                  error={errors.mi_kitchen_station_id}
                />
                {errors.mi_kitchen_station_id && <p className="mt-1 text-xs text-red-500">{errors.mi_kitchen_station_id}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs text-gray-600">Unit</label>
                <ComboBox
                  value={form.mi_unit_id}
                  onChange={(v) => set({ mi_unit_id: v })}
                  options={units.map((u) => ({ value: u.su_id, label: `${u.su_unit_label} (${u.su_unit_code})` }))}
                  placeholder="— None —"
                />
              </div>

              {/* Calories */}
              <div>
                <label className="text-xs text-gray-600">Calories</label>
                <input
                  type="number"
                  value={form.mi_calories}
                  onChange={(e) => set({ mi_calories: Number(e.target.value) || 0 })}
                  className={inp() + " text-right"}
                />
              </div>

              {/* Preparation Time */}
              <div>
                <label className="text-xs text-gray-600">Prep Time (min)</label>
                <input
                  type="number"
                  value={form.mi_preparation_time_minutes}
                  onChange={(e) => set({ mi_preparation_time_minutes: Number(e.target.value) || 0 })}
                  className={inp() + " text-right"}
                />
              </div>

              {/* Max Order Quantity */}
              <div>
                <label className="text-xs text-gray-600">Max Order Qty</label>
                <input
                  type="number"
                  value={form.mi_max_order_quantity}
                  onChange={(e) => set({ mi_max_order_quantity: Number(e.target.value) || 0 })}
                  className={inp() + " text-right"}
                />
              </div>

              {/* Loyalty Points */}
              <div>
                <label className="text-xs text-gray-600">Loyalty Points</label>
                <input
                  type="number"
                  value={form.mi_loyalty_points}
                  onChange={(e) => set({ mi_loyalty_points: Number(e.target.value) || 0 })}
                  className={inp() + " text-right"}
                />
              </div>

              {/* POS Order Display */}
              <div>
                <label className="text-xs text-gray-600">POS Display</label>
                <select
                  value={form.mi_pos_order_display}
                  onChange={(e) => set({ mi_pos_order_display: Number(e.target.value) })}
                  className={inp()}
                >
                  <option value={1}>Show</option>
                  <option value={0}>Hide</option>
                </select>
              </div>
            </div>

            {/* Prices */}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Base Price <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={form.mi_base_price}
                    onChange={(e) => { set({ mi_base_price: Number(e.target.value) || 0 }); clearErr("mi_base_price"); }}
                    className={`mt-0 w-full rounded-lg border pl-7 pr-2 py-2 text-sm text-right focus:outline-none focus:ring-4 ${errors.mi_base_price ? "border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-orange-400 focus:ring-orange-100"}`}
                  />
                </div>
                {errors.mi_base_price && <p className="mt-1 text-xs text-red-500">{errors.mi_base_price}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-600">Cost Price</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={form.mi_cost_price}
                    onChange={(e) => set({ mi_cost_price: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-2 text-sm text-right focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Tax (%)</label>
                <input
                  type="number"
                  value={form.mi_tax_percentage}
                  onChange={(e) => set({ mi_tax_percentage: Number(e.target.value) || 0 })}
                  className={inp() + " text-right"}
                />
              </div>
            </div>

            {/* Currency */}
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700">
                Currency <span className="text-red-500">*</span>
              </label>
              <ComboBox
                value={form.mi_currency_id}
                onChange={(v) => { set({ mi_currency_id: v }); clearErr("mi_currency_id"); }}
                options={currencies.map((c) => ({ value: c.currency_id, label: `${c.currency_code} — ${c.currency_name}` }))}
                placeholder="— Select currency —"
                error={errors.mi_currency_id}
              />
              {errors.mi_currency_id && <p className="mt-1 text-xs text-red-500">{errors.mi_currency_id}</p>}
            </div>

            {/* Description */}
            <div className="mt-3">
              <label className="text-xs text-gray-600">Description</label>
              <textarea
                value={form.mi_item_description}
                onChange={(e) => set({ mi_item_description: e.target.value })}
                rows={2}
                className={inp() + " resize-none"}
                placeholder="Optional description…"
              />
            </div>
          </section>

          {/* ── Image & Options ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 font-semibold text-gray-800">Image &amp; Options</div>

            <div className="mb-3">
              <label className="text-xs text-gray-600">Photo</label>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-gray-300">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                    {imagePreview ? "Change photo" : "Upload photo"}
                  </button>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }} className="block text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  )}
                  <p className="text-[11px] text-gray-400">JPG, PNG, WEBP — max 5 MB</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.mi_is_spicy} onChange={(e) => set({ mi_is_spicy: e.target.checked })} className="accent-orange-500" />
                <Flame className="h-4 w-4 text-amber-500" /> Spicy
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.mi_is_vegetarian} onChange={(e) => set({ mi_is_vegetarian: e.target.checked })} className="accent-emerald-500" />
                <Salad className="h-4 w-4 text-emerald-500" /> Veg
              </label>
              <button
                type="button"
                onClick={() => set({ mi_is_available: !form.mi_is_available })}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm ${form.mi_is_available ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}
              >
                {form.mi_is_available ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                {form.mi_is_available ? "Available" : "Unavailable"}
              </button>
              <button
                type="button"
                onClick={() => set({ mi_is_active: !form.mi_is_active })}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm ${form.mi_is_active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
              >
                {form.mi_is_active ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                {form.mi_is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </section>

          {/* ── Modifiers — edit only ── */}
          {!isNew && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 font-semibold text-gray-800">Modifiers</div>
              {modLoading ? (
                <div className="text-sm text-gray-400">Loading modifiers…</div>
              ) : (
                <>
                  <div className="mb-3 space-y-1">
                    {assignedModifiers.length === 0 && (
                      <p className="text-sm text-gray-400">No modifiers assigned.</p>
                    )}
                    {assignedModifiers.map((am) => (
                      <div key={am.im_id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-800">{am.m_modifier_name}</span>
                          {am.m_price_modifier > 0 && (
                            <span className="ml-2 text-xs text-gray-500">+{money(am.m_price_modifier)}</span>
                          )}
                        </div>
                        <button type="button" onClick={() => handleRemoveModifier(am.im_id)} disabled={modSaving} className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <ComboBox
                      value={null}
                      onChange={(modId) => { if (modId) handleAddModifier(modId); }}
                      options={allModifiers
                        .filter((m) => !assignedModifiers.some((a) => a.fk_modifier_id === m.m_id))
                        .map((m) => ({ value: m.m_id, label: m.m_modifier_name + (m.m_price_modifier > 0 ? ` (+${money(m.m_price_modifier)})` : "") }))}
                      placeholder="— Search modifier to add —"
                      disabled={modSaving}
                    />
                    {modSaving && <p className="text-xs text-gray-500">Saving modifier…</p>}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-2">
            {!isNew ? (
              deleteDrawerConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-red-600">Sure?</span>
                  <button
                    onClick={handleDeleteFromDrawer}
                    disabled={deleting}
                    className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setDeleteDrawerConfirm(false)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteDrawerConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )
            ) : <span />}
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Saving…" : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})
