"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useAppSelector } from "@/store/hooks";
import {
  Search,
  ChefHat,
  Plus,
  Minus,
  Trash2,
  Save,
  Scale,
  NotebookText,
  Package2,
  Printer,
  Download,
  Percent,
  Calculator,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import BufferedInput from "@/components/shared/buffered-input";


type SysUnit = {
  su_id: number;
  su_unit_label: string;
  su_unit_code: string;
};

type MenuItem = {
  mi_id: number;
  mi_item_name: string;
  mi_category_id: number;
  category_name: string;
  mi_base_price: number;
  mi_cost_price: number;
  currency_code: string;
  cc_id: number;
  mi_unit_id: number | null;
  unit_label: string;
  mi_is_available: number;
  mi_item_description: string | null;
};

type Ingredient = {
  in_id: number | null;
  in_ingredient_name: string;
  in_stock_quantity: number;
  in_unit_of_measure: number | null;
  unit_label: string;
  in_cost_per_unit: number;
  in_currency_id: number | null;
  currency_code: string;
  in_waste_percent: number;
  in_line_cost: number;
  in_notes: string;
  _dirty?: boolean;
  _deleted?: boolean;
};

export default function RecipesPage() {
  const auth = useAppSelector((s) => s.auth.loginData);
  const API = process.env.NEXT_PUBLIC_API_LINK;
  const currencySymbol = auth.currency_symbol || "";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [units, setUnits] = useState<SysUnit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [targetMargin, setTargetMargin] = useState(70);
  const [scale, setScale] = useState(1);
  const [steps, setSteps] = useState("");
  const [stepsModified, setStepsModified] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const initialFetch = useRef(false);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const authParams = useMemo(
    () => ({ user_id: auth.user_id, g_hash: auth.g_hash }),
    [auth.user_id, auth.g_hash],
  );

  //fetch menu items
  useEffect(() => {
    if (!auth.user_id || !auth.g_hash || initialFetch.current) {
      return;
    }

    initialFetch.current = true;
    setLoadingItems(true);
    axios
      .get(`${API}/api/inventory/getlistofitems`, {
        params: { user_id: auth.user_id, g_hash: auth.g_hash },
      })
      .then((res) => {
        if (res.data.is_error) {
          showToast("error", res.data.error_msg);
          return;
        }
        const items: MenuItem[] = Object.values(res.data.lst_items || {});
        setMenuItems(items);
        // iza fi items 3mal awal w7de heye l active by default
        if (items.length > 0) {
          setActiveId(items[0].mi_id);
        }
      })
      .catch(() => showToast("error", "Failed to load menu items"))
      .finally(() => setLoadingItems(false));
  }, [API, auth.user_id, auth.g_hash, showToast]);

  //fetch units
  useEffect(() => {
    if (!auth.user_id || !auth.g_hash) return;
    axios
      .get(`${API}/api/inventory/getlistunits`, {
        params: { user_id: auth.user_id, g_hash: auth.g_hash },
      })
      .then((res) => {
        if (!res.data.is_error)
          setUnits(Object.values(res.data.lst_units || {}));
      })
      .catch(() => {});
  }, [API, auth.user_id, auth.g_hash]);

  //fetch ingredients when active item changes
  useEffect(() => {
    if (!activeId || !auth.user_id || !auth.g_hash) {
      setIngredients([]);
      return;
    }
    setLoadingIngredients(true);
    setScale(1);
    axios
      .get(`${API}/api/inventory/getlistingredientsformenuitem`, {
        params: {
          user_id: auth.user_id,
          g_hash: auth.g_hash,
          item_id: activeId,
        },
      })
      .then((res) => {
        if (res.data.is_error) {
          showToast("error", res.data.error_msg);
          return;
        }
        const ings: Ingredient[] = Object.values(res.data.ingredients || {});
        setIngredients(
          ings.map((ing) => ({
            ...ing,
            in_ingredient_name: ing.in_ingredient_name || "",
            in_stock_quantity: Number(ing.in_stock_quantity) || 0,
            in_cost_per_unit: Number(ing.in_cost_per_unit) || 0,
            in_waste_percent: Number(ing.in_waste_percent) || 0,
            in_line_cost: Number(ing.in_line_cost) || 0,
            in_notes: ing.in_notes || "",
            _dirty: false,
            _deleted: false,
          })),
        );
      })
      .catch(() => showToast("error", "Failed to load ingredients"))
      .finally(() => setLoadingIngredients(false));
  }, [API, activeId, auth.user_id, auth.g_hash, showToast]);

  console.log("active id ", activeId);

  //active item
  const active = menuItems.find((m) => m.mi_id === activeId) || null;

  //load steps when active changes
  useEffect(() => {
    setSteps(active?.mi_item_description || "");
    setStepsModified(false);
  }, [activeId, active?.mi_item_description]);

  //categories lal filter
  const categories = useMemo(() => {
    const cats = new Set(
      menuItems.map((m) => m.category_name || "Uncategorized"),
    );
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  //filtered sidebar
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return menuItems.filter((m) => {
      const catOk =
        cat === "All" || (m.category_name || "Uncategorized") === cat;
      const txtOk = !t || m.mi_item_name.toLowerCase().includes(t);
      return catOk && txtOk;
    });
  }, [menuItems, q, cat]);

  //unit
  const getUnitLabel = useCallback(
    (unitId: number | null) => {
      if (!unitId) return "—";
      const u = units.find((u) => u.su_id === unitId);
      return u ? u.su_unit_label : "—";
    },
    [units],
  );

  //ingredient CRUD
  const visibleIngredients = useMemo(
    () => ingredients.filter((ing) => !ing._deleted),
    [ingredients],
  );

  const addLine = () => {
    setIngredients((prev) => [
      ...prev,
      {
        in_id: null,
        in_ingredient_name: "",
        in_stock_quantity: 0,
        in_unit_of_measure: units.length > 0 ? units[0].su_id : null,
        unit_label: units.length > 0 ? units[0].su_unit_label : "",
        in_cost_per_unit: 0,
        in_currency_id: active?.cc_id || null,
        currency_code: active?.currency_code || "",
        in_waste_percent: 0,
        in_line_cost: 0,
        in_notes: "",
        _dirty: true,
        _deleted: false,
      },
    ]);
  };

  const updateLine = useCallback((idx: number, patch: Partial<Ingredient>) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch, _dirty: true };
      const qty = patch.in_stock_quantity ?? next[idx].in_stock_quantity;
      const cost = patch.in_cost_per_unit ?? next[idx].in_cost_per_unit;
      const waste = patch.in_waste_percent ?? next[idx].in_waste_percent;
      next[idx].in_line_cost = qty * cost * (1 + waste);
      return next;
    });
  }, []);

  const removeLine = useCallback((idx: number) => {
    setIngredients((prev) => {
      const next = [...prev];
      if (next[idx].in_id === null) return next.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], _deleted: true };
      return next;
    });
  }, []);

  //costing
  const batchCost = useMemo(
    () =>
      visibleIngredients.reduce((sum, ln) => sum + (ln.in_line_cost || 0), 0),
    [visibleIngredients],
  );
  const hasDirtyRows = ingredients.some((ing) => ing._dirty || ing._deleted);
  const canSave = hasDirtyRows || stepsModified;

  const suggestPrice = (cost: number, marginPct: number) => {
    const m = Math.min(95, Math.max(0, marginPct)) / 100;
    if (m >= 0.95) return cost * 4;
    return cost / (1 - m);
  };

  //scaled preview
  const scaledIngredients = useMemo(() => {
    const s = Math.max(0.1, scale);
    return visibleIngredients.map((ln) => {
      const qty = round(ln.in_stock_quantity * s);
      const lc = qty * ln.in_cost_per_unit * (1 + (ln.in_waste_percent || 0));
      return { ...ln, in_stock_quantity: qty, in_line_cost: lc };
    });
  }, [visibleIngredients, scale]);

  const scaledBatchCost = useMemo(
    () =>
      scaledIngredients.reduce((sum, ln) => sum + (ln.in_line_cost || 0), 0),
    [scaledIngredients],
  );

  const handleSave = async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      // save preparation steps (mi_item_description)
      if (stepsModified) {
        await axios.post(`${API}/api/inventory/updateitemdescription`, {
          ...authParams,
          mi_id: activeId,
          mi_item_description: steps,
        });
        // update local menuItems cache
        setMenuItems((prev) =>
          prev.map((m) =>
            m.mi_id === activeId ? { ...m, mi_item_description: steps } : m,
          ),
        );
        setStepsModified(false);
      }

      // delete ingredients marked for deletion
      const toDelete = ingredients.filter(
        (ing) => ing._deleted && ing.in_id !== null,
      );
      for (const ing of toDelete) {
        await axios.post(`${API}/api/inventory/deleteingredient`, {
          ...authParams,
          in_id: ing.in_id,
        });
      }

      // save new / updated ingredients
      const toSave = ingredients.filter((ing) => ing._dirty && !ing._deleted);
      for (const ing of toSave) {
        await axios.post(`${API}/api/inventory/saveingredientforitem`, {
          ...authParams,
          in_id: ing.in_id,
          item_id: activeId,
          in_ingredient_name: ing.in_ingredient_name,
          in_stock_quantity: ing.in_stock_quantity,
          in_unit_of_measure: ing.in_unit_of_measure,
          in_cost_per_unit: ing.in_cost_per_unit,
          in_currency_id: ing.in_currency_id,
          in_waste_percent: ing.in_waste_percent,
          in_notes: ing.in_notes,
        });
      }

      // refresh ingredients from server
      if (hasDirtyRows) {
        const res = await axios.get(
          `${API}/api/inventory/getlistingredientsformenuitem`,
          {
            params: { ...authParams, item_id: activeId },
          },
        );
        if (!res.data.is_error) {
          const ings: Ingredient[] = Object.values(res.data.ingredients || {});
          setIngredients(
            ings.map((ing) => ({
              ...ing,
              in_ingredient_name: ing.in_ingredient_name || "",
              in_stock_quantity: Number(ing.in_stock_quantity) || 0,
              in_cost_per_unit: Number(ing.in_cost_per_unit) || 0,
              in_waste_percent: Number(ing.in_waste_percent) || 0,
              in_line_cost: Number(ing.in_line_cost) || 0,
              in_notes: ing.in_notes || "",
              _dirty: false,
              _deleted: false,
            })),
          );
        }
      }

      showToast("success", "Saved successfully");
    } catch {
      showToast("error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const money = useCallback(
    (n: number | undefined) => {
      return (
        (n ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) +
        " " +
        currencySymbol
      );
    },
    [currencySymbol],
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar: Library */}
        <aside className="overflow-hidden rounded-3xl bg-white/80 p-4 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search recipes…"
                className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {loadingItems ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ul className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto">
              {filtered.map((m) => {
                const activeCls =
                  m.mi_id === activeId
                    ? "border-orange-300 bg-orange-50"
                    : "border-gray-200 bg-white";
                return (
                  <li key={m.mi_id}>
                    <button
                      onClick={() => setActiveId(m.mi_id)}
                      className={`w-full rounded-2xl border p-3 text-left transition hover:bg-orange-50 ${activeCls}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-gray-400" />
                          <div className="font-semibold text-gray-900">
                            {m.mi_item_name}
                          </div>
                        </div>
                        <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {m.category_name || "—"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Unit: {m.unit_label || getUnitLabel(m.mi_unit_id)} ·
                        Price: {num(m.mi_base_price)} {currencySymbol}
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-8 text-center text-sm text-gray-400">
                  No items found
                </li>
              )}
            </ul>
          )}
        </aside>

        {/* Main: Editor */}
        <main className="space-y-4">
          {!active ? (
            <div className="grid h-[60vh] place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              Select a recipe…
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-gray-500" />
                      <div className="min-w-0 flex-1 text-2xl font-extrabold text-gray-900">
                        {active.mi_item_name}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">
                        {active.category_name || "Uncategorized"}
                      </span>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">
                        Unit:{" "}
                        {active.unit_label || getUnitLabel(active.mi_unit_id)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const url = `${API}/api/inventory/printrecipepdf?user_id=${auth.user_id}&g_hash=${auth.g_hash}&mi_id=${active.mi_id}`;
                        try {
                          const res = await fetch(url);
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const iframe = document.createElement("iframe");
                          iframe.style.display = "none";
                          iframe.src = blobUrl;
                          document.body.appendChild(iframe);
                          iframe.onload = () => {
                            iframe.contentWindow?.print();
                            setTimeout(() => {
                              document.body.removeChild(iframe);
                              URL.revokeObjectURL(blobUrl);
                            }, 1000);
                          };
                        } catch {
                          showToast("error", "Failed to load PDF for printing");
                        }
                      }}
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${API}/api/inventory/printrecipepdf?user_id=${auth.user_id}&g_hash=${auth.g_hash}&mi_id=${active.mi_id}&download=1`;
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Recipe_${active.mi_item_name}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !canSave}
                      className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Base Price
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">
                      {num(active.mi_base_price)} {currencySymbol}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Cost Price
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">
                      {num(active.mi_cost_price)} {currencySymbol}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Target Margin
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Percent className="h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={targetMargin}
                        onChange={(e) =>
                          setTargetMargin(Number(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <Calculator className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOM Table */}
              <section className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Bill of Materials
                    </h2>
                  </div>
                  <button
                    onClick={addLine}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" /> Add Ingredient
                  </button>
                </div>

                {loadingIngredients ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "5%" }} />
                      </colgroup>
                      <thead className="text-left text-gray-500">
                        <tr className="[&>th]:py-2 [&>th]:px-2">
                          <th>Ingredient</th>
                          <th>Qty</th>
                          <th>UoM</th>
                          <th>Waste</th>
                          <th>Unit Cost</th>
                          <th>Line Cost</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ingredients.map((ln, idx) => {
                          if (ln._deleted) return null;
                          return (
                            <IngredientRow
                              key={ln.in_id ?? `new-${idx}`}
                              ln={ln}
                              idx={idx}
                              units={units}
                              money={money}
                              updateLine={updateLine}
                              removeLine={removeLine}
                            />
                          );
                        })}
                        {visibleIngredients.length === 0 &&
                          !loadingIngredients && (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-10 text-center text-sm text-gray-400"
                              >
                                No ingredients yet. Click &quot;Add
                                Ingredient&quot; to start building the recipe.
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Mini total label="Batch Cost" value={money(batchCost)} />
                  <Mini
                    label="Ingredients"
                    value={`${visibleIngredients.length}`}
                  />
                  <Mini label="Cost / Item" value={money(batchCost)} />
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Scale Preview & Pricing
                    </h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Scale Factor
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() =>
                          setScale((s) => round(Math.max(0.1, s - 0.1)))
                        }
                        className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={scale}
                        onChange={(e) =>
                          setScale(Math.max(0.1, Number(e.target.value) || 1))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                        step="0.1"
                      />
                      <button
                        onClick={() => setScale((s) => round(s + 0.1))}
                        className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      e.g., 0.5 half-batch, 2.0 double-batch
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Suggested Price
                    </div>
                    <div className="mt-1">
                      <div className="text-lg font-extrabold text-gray-900">
                        {money(suggestPrice(batchCost, targetMargin))}
                      </div>
                      <div className="text-xs text-gray-600">
                        at {targetMargin}% margin
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">
                      Scaled Batch (preview)
                    </div>
                    <div className="mt-1 text-sm">
                      Scale <b>×{scale}</b> · Cost{" "}
                      <b>{money(scaledBatchCost)}</b>
                    </div>
                  </div>
                </div>

                {/* scaled ingredients preview */}
                {scaledIngredients.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr className="[&>th]:py-2 [&>th]:px-2">
                          <th style={{ minWidth: 220 }}>Ingredient (scaled)</th>
                          <th>Qty</th>
                          <th>UoM</th>
                          <th>Line Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {scaledIngredients.map((ln, i) => (
                          <tr key={i} className="[&>td]:py-2 [&>td]:px-2">
                            <td>{ln.in_ingredient_name || "—"}</td>
                            <td className="text-right">
                              {num(ln.in_stock_quantity)}
                            </td>
                            <td>
                              {ln.unit_label ||
                                getUnitLabel(ln.in_unit_of_measure)}
                            </td>
                            <td className="font-semibold text-gray-900 whitespace-nowrap">
                              {money(ln.in_line_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* steps / notes — saved as mi_item_description */}
              <section className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <NotebookText className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Preparation Steps
                  </h2>
                  {stepsModified && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      modified
                    </span>
                  )}
                </div>
                <textarea
                  value={steps}
                  onChange={(e) => {
                    setSteps(e.target.value);
                    setStepsModified(true);
                  }}
                  rows={6}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Add clear, step-by-step instructions…"
                />
              </section>

              <p className="pb-4 text-center text-xs text-gray-500">
                © {new Date().getFullYear()}{" "}
                <span className="font-semibold">TitanPOS®</span> — Recipes & BOM
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Ingredient Row — memoized to avoid full-table re-renders
 * ───────────────────────────────────────── */
const IngredientRow = React.memo(function IngredientRow({
  ln,
  idx,
  units,
  money,
  updateLine,
  removeLine,
}: {
  ln: Ingredient;
  idx: number;
  units: SysUnit[];
  money: (n: number | undefined) => string;
  updateLine: (idx: number, patch: Partial<Ingredient>) => void;
  removeLine: (idx: number) => void;
}) {
  return (
    <tr
      className={`[&>td]:py-2 [&>td]:px-2 ${ln._dirty ? "bg-amber-50/40" : ""}`}
    >
      <td>
        <BufferedInput
          value={ln.in_ingredient_name}
          onCommit={(v) => updateLine(idx, { in_ingredient_name: v })}
          placeholder="Ingredient name"
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5"
        />
      </td>
      <td>
        <BufferedInput
          type="number"
          value={ln.in_stock_quantity}
          onCommit={(v) =>
            updateLine(idx, { in_stock_quantity: Number(v) || 0 })
          }
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
          step="0.01"
        />
      </td>
      <td>
        <select
          value={ln.in_unit_of_measure ?? ""}
          onChange={(e) => {
            const unitId = Number(e.target.value) || null;
            const unitObj = units.find((u) => u.su_id === unitId);
            updateLine(idx, {
              in_unit_of_measure: unitId,
              unit_label: unitObj?.su_unit_label || "",
            });
          }}
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5"
        >
          <option value="">—</option>
          {units.map((u) => (
            <option key={u.su_id} value={u.su_id}>
              {u.su_unit_label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <BufferedInput
          type="number"
          value={ln.in_waste_percent || 0}
          onCommit={(v) =>
            updateLine(idx, { in_waste_percent: Number(v) || 0 })
          }
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
          step="0.01"
        />
      </td>
      <td>
        <BufferedInput
          type="number"
          value={ln.in_cost_per_unit}
          onCommit={(v) =>
            updateLine(idx, { in_cost_per_unit: Number(v) || 0 })
          }
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
          step="0.01"
        />
      </td>
      <td className="font-semibold text-gray-900 whitespace-nowrap">
        {money(ln.in_line_cost)}
      </td>
      <td>
        <BufferedInput
          value={ln.in_notes || ""}
          onCommit={(v) => updateLine(idx, { in_notes: v })}
          placeholder="optional"
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5"
        />
      </td>
      <td className="text-right">
        <button
          onClick={() => removeLine(idx)}
          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

function Mini({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${total ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"} px-4 py-3`}
    >
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}


const num = (n: number, d = 2) =>
  (n || 0).toLocaleString(undefined, { maximumFractionDigits: d });

const round = (n: number, d = 2) =>
  Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
