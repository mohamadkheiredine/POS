"use client";

import React, { useMemo, useState } from "react";
import {
  Search, ChefHat, Plus, Minus, Trash2, Save, Scale, NotebookText,
  Package2, Printer, Download, AlertTriangle, Percent, Calculator, Tags
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UOM = "kg" | "g" | "L" | "ml" | "pcs";
type Category = "Pizzas" | "Sandwiches" | "Salads" | "Drinks" | "Desserts" | "Sauces";

type CatalogItem = {
  id: string;
  name: string;
  uom: UOM;            // purchase/base UoM
  unitCost: number;    // cost per UOM (e.g., 1 kg cost)
  allergens?: string[]; // simple tags
};

type IngredientLine = {
  id: string;           // catalog id
  qty: number;          // qty used in recipe
  uom: UOM;             // qty UoM
  wastePct?: number;    // trimming loss (0-100)
  notes?: string;
};

type Recipe = {
  id: string;
  name: string;
  category: Category;
  yieldQty: number;     // total batch yield quantity
  yieldUom: UOM;        // e.g., "kg", "pcs", "L"
  portionSize: number;  // portion qty (same UoM as yieldUom)
  ingredients: IngredientLine[];
  steps?: string;
  version?: string;
  allergens?: string[]; // extra tags (e.g., “contains nuts” via sauce)
};

/* ─────────────────────────────────────────
 * Mock Catalog
 * ───────────────────────────────────────── */
const CATALOG: CatalogItem[] = [
  { id: "flour-00", name: "Flour 00", uom: "kg", unitCost: 1.7, allergens: ["gluten"] },
  { id: "yeast", name: "Dry Yeast", uom: "g", unitCost: 0.008 },
  { id: "salt", name: "Sea Salt", uom: "g", unitCost: 0.002 },
  { id: "water", name: "Water", uom: "L", unitCost: 0.001 },
  { id: "tomato", name: "Tomato Passata", uom: "kg", unitCost: 2.1 },
  { id: "mozz", name: "Mozzarella", uom: "kg", unitCost: 6.8, allergens: ["dairy"] },
  { id: "basil", name: "Fresh Basil", uom: "g", unitCost: 0.02 },
  { id: "olive", name: "Olive Oil", uom: "L", unitCost: 6.0 },
  { id: "chicken", name: "Chicken Breast", uom: "kg", unitCost: 5.2 },
  { id: "lettuce", name: "Romaine Lettuce", uom: "kg", unitCost: 3.0 },
  { id: "sugar", name: "Sugar", uom: "kg", unitCost: 1.5 },
  { id: "creamcheese", name: "Cream Cheese", uom: "kg", unitCost: 5.9, allergens: ["dairy"] },
];

const RECIPES_MOCK: Recipe[] = [
  {
    id: "r-margherita",
    name: "Margherita Pizza",
    category: "Pizzas",
    yieldQty: 8,
    yieldUom: "pcs",
    portionSize: 1,
    ingredients: [
      { id: "flour-00", qty: 1.6, uom: "kg", wastePct: 0 },
      { id: "water", qty: 1.0, uom: "L", wastePct: 0 },
      { id: "yeast", qty: 8, uom: "g", wastePct: 0 },
      { id: "salt", qty: 28, uom: "g", wastePct: 0 },
      { id: "tomato", qty: 1.4, uom: "kg", wastePct: 2 },
      { id: "mozz", qty: 1.2, uom: "kg", wastePct: 0 },
      { id: "olive", qty: 0.08, uom: "L", wastePct: 0 },
      { id: "basil", qty: 30, uom: "g", wastePct: 10 },
    ],
    steps:
      "1) Mix dough, cold ferment 24h.\n2) Portion 250g balls.\n3) Top with passata, mozzarella, basil.\n4) Bake 450°C for 90s.",
    version: "1.2",
    allergens: ["gluten", "dairy"],
  },
  {
    id: "r-cheesecake",
    name: "Baked Cheesecake",
    category: "Desserts",
    yieldQty: 12,
    yieldUom: "pcs",
    portionSize: 1,
    ingredients: [
      { id: "creamcheese", qty: 2.4, uom: "kg" },
      { id: "sugar", qty: 0.5, uom: "kg" },
      { id: "egg", qty: 12, uom: "pcs", notes: "purchase cost to be added in catalog" },
    ],
    steps:
      "1) Blend batter.\n2) Bake at 160°C (fan) 55–65m.\n3) Chill overnight; slice 12.",
    version: "0.9",
    allergens: ["dairy", "egg"],
  },
];

/* ─────────────────────────────────────────
 * Unit helpers & costing
 * ───────────────────────────────────────── */
const toBase = (qty: number, u: UOM) => {
  // Convert to a canonical base for comparison: kg for weight, L for volume, pcs for pieces
  // We only need cross-UOM conversion for g<->kg and ml<->L
  if (u === "g") return { qty: qty / 1000, uom: "kg" as UOM };
  if (u === "ml") return { qty: qty / 1000, uom: "L" as UOM };
  return { qty, uom: u };
};

function matchUom(catalog: CatalogItem, line: IngredientLine): number {
  // returns multiplier to express `line.qty line.uom` in catalog.uom
  const baseLine = toBase(line.qty, line.uom);
  const baseCat = toBase(1, catalog.uom);
  if (baseLine.uom !== baseCat.uom) {
    // incompatible (e.g., pcs vs kg) — assume 1:1 fallback; real app should use yield/conv table.
    return baseLine.qty; // naive
  }
  // quantity in catalog units
  const multiplier = baseLine.qty / baseCat.qty; // how many catalog UOMs
  return multiplier;
}

function lineCost(line: IngredientLine, catalog: CatalogItem | undefined) {
  if (!catalog) return 0;
  const mult = matchUom(catalog, line);
  const wasteFactor = 1 + (line.wastePct ? line.wastePct / 100 : 0);
  return mult * wasteFactor * catalog.unitCost;
}

function rollupCost(recipe: Recipe, catalogMap: Record<string, CatalogItem>) {
  const batch = recipe.ingredients.reduce((sum, ln) => sum + lineCost(ln, catalogMap[ln.id]), 0);
  const portions = Math.max(1, Math.floor(recipe.yieldQty / recipe.portionSize));
  const perPortion = batch / portions;
  return { batch, portions, perPortion };
}

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPES_MOCK);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [activeId, setActiveId] = useState<string>(recipes[0]?.id || "");
  const [targetMargin, setTargetMargin] = useState(70); // %
  const [scale, setScale] = useState(1); // preview scaler for batch

  const catalogMap = useMemo(() => {
    const m: Record<string, CatalogItem> = {};
    CATALOG.forEach((c) => (m[c.id] = c));
    return m;
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return recipes.filter((r) => {
      const catOk = cat === "All" || r.category === cat;
      const txtOk = !t || r.name.toLowerCase().includes(t);
      return catOk && txtOk;
    });
  }, [recipes, q, cat]);

  const active = recipes.find((r) => r.id === activeId) || null;
  const cost = active ? rollupCost(active, catalogMap) : { batch: 0, portions: 1, perPortion: 0 };

  const scaled = useMemo(() => {
    if (!active) return null;
    const s = Math.max(0.1, scale);
    const r: Recipe = {
      ...active,
      yieldQty: round(active.yieldQty * s),
      portionSize: round(active.portionSize), // portion stays same (usually)
      ingredients: active.ingredients.map((ln) => ({ ...ln, qty: round(ln.qty * s) })),
    };
    const rc = rollupCost(r, catalogMap);
    return { recipe: r, cost: rc };
  }, [active, scale, catalogMap]);

  const suggestPrice = (portionCost: number, marginPct: number) => {
    // Price = cost / (1 - margin)
    const m = Math.min(95, Math.max(0, marginPct)) / 100;
    if (m >= 0.95) return portionCost * 4; // safeguard
    return portionCost / (1 - m);
  };

  const addLine = () => {
    if (!active) return;
    const updated: Recipe = {
      ...active,
      ingredients: [
        ...active.ingredients,
        { id: CATALOG[0].id, qty: 1, uom: CATALOG[0].uom as UOM, wastePct: 0 },
      ],
    };
    setRecipes((rs) => rs.map((r) => (r.id === active.id ? updated : r)));
  };

  const updateLine = (idx: number, patch: Partial<IngredientLine>) => {
    if (!active) return;
    const lines = [...active.ingredients];
    lines[idx] = { ...lines[idx], ...patch };
    const updated = { ...active, ingredients: lines };
    setRecipes((rs) => rs.map((r) => (r.id === active.id ? updated : r)));
  };

  const removeLine = (idx: number) => {
    if (!active) return;
    const lines = active.ingredients.filter((_, i) => i !== idx);
    const updated = { ...active, ingredients: lines };
    setRecipes((rs) => rs.map((r) => (r.id === active.id ? updated : r)));
  };

  const patchRecipe = (patch: Partial<Recipe>) => {
    if (!active) return;
    const updated = { ...active, ...patch };
    setRecipes((rs) => rs.map((r) => (r.id === active.id ? updated : r)));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
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
              onChange={(e) => setCat(e.target.value as any)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {["All", "Pizzas", "Sandwiches", "Salads", "Drinks", "Desserts", "Sauces"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <ul className="space-y-2">
            {filtered.map((r) => {
              const activeCls = r.id === activeId ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white";
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setActiveId(r.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition hover:bg-orange-50 ${activeCls}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-gray-400" />
                        <div className="font-semibold text-gray-900">{r.name}</div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        {r.category}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Yield {r.yieldQty} {r.yieldUom} · Portion {r.portionSize} {r.yieldUom}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
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
                      <input
                        value={active.name}
                        onChange={(e) => patchRecipe({ name: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent text-2xl font-extrabold text-gray-900 outline-none focus:border-gray-200"
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">{active.category}</span>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5">v{active.version || "1.0"}</span>
                      {active.allergens?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> {active.allergens.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105">
                      <Save className="h-4 w-4" /> Save
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Batch Yield</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={active.yieldQty}
                        onChange={(e) => patchRecipe({ yieldQty: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <select
                        value={active.yieldUom}
                        onChange={(e) => patchRecipe({ yieldUom: e.target.value as UOM })}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                      >
                        {["kg", "g", "L", "ml", "pcs"].map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Portion Size</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={active.portionSize}
                        onChange={(e) => patchRecipe({ portionSize: Math.max(0.01, Number(e.target.value) || 1) })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right"
                      />
                      <span className="text-xs text-gray-600">{active.yieldUom}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Target Margin</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Percent className="h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(Number(e.target.value) || 0)}
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
                    <h2 className="text-lg font-bold text-gray-900">Bill of Materials</h2>
                  </div>
                  <button
                    onClick={addLine}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" /> Add Ingredient
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500">
                      <tr className="[&>th]:py-2 [&>th]:px-2">
                        <th style={{minWidth: 220}}>Ingredient</th>
                        <th>Qty</th>
                        <th>UoM</th>
                        <th>Waste %</th>
                        <th>Unit Cost</th>
                        <th>Line Cost</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {active.ingredients.map((ln, idx) => {
                        const cat = catalogMap[ln.id];
                        const lc = lineCost(ln, cat);
                        return (
                          <tr key={idx} className="[&>td]:py-2 [&>td]:px-2">
                            <td>
                              <select
                                value={ln.id}
                                onChange={(e) => updateLine(idx, { id: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5"
                              >
                                {CATALOG.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {cat?.allergens?.length ? (
                                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  <Tags className="h-3 w-3" /> {cat.allergens.join(", ")}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <input
                                type="number"
                                value={ln.qty}
                                onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                                className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
                              />
                            </td>
                            <td>
                              <select
                                value={ln.uom}
                                onChange={(e) => updateLine(idx, { uom: e.target.value as UOM })}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5"
                              >
                                {["kg", "g", "L", "ml", "pcs"].map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={ln.wastePct || 0}
                                onChange={(e) => updateLine(idx, { wastePct: Number(e.target.value) || 0 })}
                                className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right"
                              />
                            </td>
                            <td className="whitespace-nowrap">
                              {cat ? `${currency(cat.unitCost)} / ${cat.uom}` : "—"}
                            </td>
                            <td className="font-semibold text-gray-900 whitespace-nowrap">
                              {currency(lc)}
                            </td>
                            <td>
                              <input
                                value={ln.notes || ""}
                                onChange={(e) => updateLine(idx, { notes: e.target.value })}
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
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Mini total label="Batch Cost" value={currency(cost.batch)} />
                  <Mini label="Portions" value={`${cost.portions}`} />
                  <Mini label="Cost / Portion" value={currency(cost.perPortion)} />
                </div>
              </section>

              {/* Pricing & Scaling */}
              <section className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-900">Scale Preview & Pricing</h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Scale Factor</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => setScale((s) => round(Math.max(0.1, s - 0.1)))}
                        className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={scale}
                        onChange={(e) => setScale(Math.max(0.1, Number(e.target.value) || 1))}
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
                    <p className="mt-1 text-xs text-gray-600">e.g., 0.5 half-batch, 2.0 double-batch</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Suggested Price</div>
                    <div className="mt-1">
                      <div className="text-lg font-extrabold text-gray-900">
                        {currency(suggestPrice(cost.perPortion, targetMargin))}
                      </div>
                      <div className="text-xs text-gray-600">at {targetMargin}% margin</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="text-xs font-semibold text-gray-600">Scaled Batch (preview)</div>
                    <div className="mt-1 text-sm">
                      Yield <b>{scaled?.recipe.yieldQty}</b> {active.yieldUom} · Cost{" "}
                      <b>{currency(scaled?.cost.batch || 0)}</b>
                    </div>
                  </div>
                </div>

                {/* Scaled Ingredients Preview */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500">
                      <tr className="[&>th]:py-2 [&>th]:px-2">
                        <th style={{minWidth:220}}>Ingredient (scaled)</th>
                        <th>Qty</th>
                        <th>UoM</th>
                        <th>Line Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scaled?.recipe.ingredients.map((ln, i) => {
                        const cat = catalogMap[ln.id];
                        const lc = lineCost(ln, cat);
                        return (
                          <tr key={i} className="[&>td]:py-2 [&>td]:px-2">
                            <td>{cat?.name || ln.id}</td>
                            <td className="text-right">{num(ln.qty)}</td>
                            <td>{ln.uom}</td>
                            <td className="font-semibold text-gray-900 whitespace-nowrap">{currency(lc)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Steps / Notes */}
              <section className="overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <NotebookText className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Preparation Steps</h2>
                </div>
                <textarea
                  value={active.steps || ""}
                  onChange={(e) => patchRecipe({ steps: e.target.value })}
                  rows={6}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Add clear, step-by-step instructions…"
                />
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                  <span>Version note:</span>
                  <input
                    value={active.version || ""}
                    onChange={(e) => patchRecipe({ version: e.target.value })}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1"
                    placeholder="e.g., 1.2 – swapped oil"
                  />
                </div>
              </section>

              <p className="pb-4 text-center text-xs text-gray-500">
                © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Recipes & BOM
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * UI bits
 * ───────────────────────────────────────── */
function Mini({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div className={`rounded-2xl border ${total ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"} px-4 py-3`}>
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * util
 * ───────────────────────────────────────── */
const currency = (n: number | undefined, c = 2) =>
  (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: c });

const num = (n: number, d = 2) =>
  (n || 0).toLocaleString(undefined, { maximumFractionDigits: d });

const round = (n: number, d = 2) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
