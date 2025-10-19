"use client";

import React, { useMemo, useState } from "react";
import {
  Search, Filter, Plus, Grid as GridIcon, List as ListIcon, Pencil, X,
  CheckCircle2, Tags, Package, DollarSign, Flame, Salad, Coffee, UtensilsCrossed, CircleSlash2, BadgeCheck, Image as ImageIcon, ToggleLeft, ToggleRight
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UID = string;
type Category = "Pizza" | "Salads" | "Sandwiches" | "Burgers" | "Drinks" | "Desserts" | "Other";
type Size = { name: string; price: number };
type Modifier = { id: UID; name: string; price?: number; required?: boolean; group?: string };

type MenuItem = {
  id: UID;
  name: string;
  sku: string;
  category: Category;
  price: number;           // base price if no sizes
  sizes?: Size[];          // optional sizes override base price at POS
  taxRate?: number;        // %
  spicy?: boolean;
  vegetarian?: boolean;
  image?: string;          // URL
  tags?: string[];
  available: boolean;
  modifiers?: Modifier[];  // e.g., “Cheese +1”, “No Onions”
};

/* ─────────────────────────────────────────
 * Mock
 * ───────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: MenuItem[] = [
  {
    id: uid(), name: "Margherita", sku: "MN-PIZ-001", category: "Pizza", price: 9,
    sizes: [{ name: "M", price: 9 }, { name: "L", price: 12 }],
    vegetarian: true, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    available: true, tags: ["classic"],
    modifiers: [{ id: uid(), name: "Extra Cheese", price: 1, group: "Add-ons" }, { id: uid(), name: "No Basil", group: "No" }]
  },
  {
    id: uid(), name: "Chicken Caesar", sku: "MN-SAL-002", category: "Salads", price: 7.5,
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop",
    available: true, tags: ["fresh"], modifiers: [{ id: uid(), name: "No Croutons", group: "No" }]
  },
  {
    id: uid(), name: "Espresso", sku: "MN-DRK-010", category: "Drinks", price: 2.5,
    image: "https://images.unsplash.com/photo-1503481766315-7a586b20f66f?q=80&w=800&auto=format&fit=crop",
    available: false, tags: ["bar"], modifiers: [{ id: uid(), name: "Double Shot", price: 1, group: "Add-ons" }]
  },
  {
    id: uid(), name: "Cheeseburger", sku: "MN-BRG-003", category: "Burgers", price: 8.9,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop",
    available: true, tags: ["best-seller"]
  },
];

const CATEGORIES: Category[] = ["Pizza", "Salads", "Sandwiches", "Burgers", "Drinks", "Desserts", "Other"];

/* ─────────────────────────────────────────
 * Utils
 * ───────────────────────────────────────── */
const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function MenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>(MOCK);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [avail, setAvail] = useState<"All" | "Available" | "Unavailable">("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState<{ open: boolean; item?: MenuItem | null }>({ open: false, item: null });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((it) => {
      const txt = !t || it.name.toLowerCase().includes(t) || it.sku.toLowerCase().includes(t) || it.tags?.some(s => s.toLowerCase().includes(t));
      const c = cat === "All" || it.category === cat;
      const a = avail === "All" || (avail === "Available" ? it.available : !it.available);
      return txt && c && a;
    });
  }, [items, q, cat, avail]);

  const toggleAvailability = (id: string) => {
    setItems(arr => arr.map(it => it.id === id ? { ...it, available: !it.available } : it));
  };

  const startNew = () => setDrawer({ open: true, item: {
    id: uid(), name: "", sku: "", category: "Other", price: 0, sizes: [], available: true, tags: [], modifiers: []
  } });

  const startEdit = (it: MenuItem) => setDrawer({ open: true, item: { ...it } });

  const saveItem = (it: MenuItem) => {
    setItems(arr => {
      const exists = arr.some(x => x.id === it.id);
      return exists ? arr.map(x => x.id === it.id ? it : x) : [it, ...arr];
    });
    setDrawer({ open: false, item: null });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Menu</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Items</h1>
            <p className="mt-0.5 text-sm text-gray-600">Light TitanPOS design — quick edits, availability, sizes & modifiers</p>
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
                placeholder="Search name, SKU, tag…"
                className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as any)}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", ...CATEGORIES].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <select
              value={avail}
              onChange={(e) => setAvail(e.target.value as any)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {["All", "Available", "Unavailable"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView("grid")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view==="grid" ? "bg-orange-50 text-orange-700" : "text-gray-700"}`}
            >
              <GridIcon className="mr-1 inline h-4 w-4" /> Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${view==="list" ? "bg-orange-50 text-orange-700" : "text-gray-700"}`}
            >
              <ListIcon className="mr-1 inline h-4 w-4" /> List
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((it) => (
              <div key={it.id} className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
                <div className="relative h-36 w-full bg-gray-50">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-gray-300"><ImageIcon className="h-8 w-8" /></div>
                  )}
                  <button
                    onClick={() => toggleAvailability(it.id)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold ring-1 ring-gray-200"
                    title="Toggle availability"
                  >
                    {it.available ? "Available" : "Unavailable"}
                  </button>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="truncate text-base font-extrabold text-gray-900">{it.name}</div>
                      <div className="text-[11px] text-gray-500">{it.sku} · {it.category}</div>
                    </div>
                    <button
                      onClick={() => startEdit(it)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {it.spicy && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700"><Flame className="h-3.5 w-3.5" /> spicy</span>}
                    {it.vegetarian && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"><Salad className="h-3.5 w-3.5" /> veg</span>}
                    {it.tags?.slice(0,3).map(t => (
                      <span key={t} className="rounded-full bg-gray-50 px-2 py-0.5 font-semibold text-gray-600">#{t}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {it.sizes && it.sizes.length > 0 ? (
                        <span>
                          {it.sizes.map(s => `${s.name} ${money(s.price)}`).join(" · ")}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">{money(it.price)}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">{it.modifiers?.length || 0} modifier(s)</div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
                No items found…
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-white text-left text-gray-500">
                <tr className="[&>th]:py-3 [&>th]:px-3">
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price / Sizes</th>
                  <th>Tags</th>
                  <th>Avail</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((it) => (
                  <tr key={it.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td className="font-semibold text-gray-900">{it.name}</td>
                    <td className="text-gray-700">{it.sku}</td>
                    <td className="text-gray-700">{it.category}</td>
                    <td className="text-gray-700">
                      {it.sizes && it.sizes.length ? it.sizes.map(s => `${s.name} ${money(s.price)}`).join(" · ") : money(it.price)}
                    </td>
                    <td className="text-gray-700">{it.tags?.join(", ") || "—"}</td>
                    <td>
                      <button
                        onClick={() => toggleAvailability(it.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${it.available ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-50 text-gray-600 ring-gray-200"}`}
                      >
                        {it.available ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        {it.available ? "Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => startEdit(it)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">No items found…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Menu
        </p>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.item && (
        <ItemDrawer
          item={drawer.item}
          onClose={() => setDrawer({ open: false, item: null })}
          onSave={saveItem}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 * Edit / New Item Drawer
 * ───────────────────────────────────────── */
function ItemDrawer({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem;
  onClose: () => void;
  onSave: (it: MenuItem) => void;
}) {
  const [form, setForm] = useState<MenuItem>({ ...item });

  const set = (patch: Partial<MenuItem>) => setForm((f) => ({ ...f, ...patch }));

  const addSize = () => setForm((f) => ({ ...f, sizes: [...(f.sizes || []), { name: "", price: 0 }] }));
  const removeSize = (idx: number) => setForm((f) => ({ ...f, sizes: (f.sizes || []).filter((_, i) => i !== idx) }));

  const addModifier = () =>
    setForm((f) => ({
      ...f,
      modifiers: [...(f.modifiers || []), { id: (Math.random().toString(36).slice(2,9)), name: "", price: 0, group: "Add-ons" }],
    }));
  const removeModifier = (id: string) =>
    setForm((f) => ({ ...f, modifiers: (f.modifiers || []).filter((m) => m.id !== id) }));

  const addTag = (t: string) =>
    setForm((f) => ({ ...f, tags: Array.from(new Set([...(f.tags || []), t].filter(Boolean))) }));

  const removeTag = (t: string) =>
    setForm((f) => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));

  const baseOrSizes = (f: MenuItem) => (f.sizes && f.sizes.length ? f.sizes.map(s => s.price).every(p => p >= 0) : f.price >= 0);

  const canSave = form.name.trim() && form.sku.trim() && baseOrSizes(form);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">{item.name ? `Edit ${item.name}` : "New Menu Item"}</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-5">
          {/* Essentials */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-600">Name</label>
                <input value={form.name} onChange={(e)=>set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">SKU</label>
                <input value={form.sku} onChange={(e)=>set({ sku: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Category</label>
                <select value={form.category} onChange={(e)=>set({ category: e.target.value as Category })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2">
                  {["Pizza","Salads","Sandwiches","Burgers","Drinks","Desserts","Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Tax (%)</label>
                <input type="number" value={form.taxRate ?? 0} onChange={(e)=>set({ taxRate: Number(e.target.value)||0 })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right" />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-600">Base Price</label>
                <input type="number" value={form.price} onChange={(e)=>set({ price: Number(e.target.value)||0 })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right" />
                <div className="mt-1 text-[11px] text-gray-500">Ignored if sizes are defined.</div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Image URL</label>
                <input value={form.image || ""} onChange={(e)=>set({ image: e.target.value })} placeholder="https://…" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form.spicy} onChange={(e)=>set({ spicy: e.target.checked })} />
                <Flame className="h-4 w-4 text-amber-600" /> Spicy
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form.vegetarian} onChange={(e)=>set({ vegetarian: e.target.checked })} />
                <Salad className="h-4 w-4 text-emerald-600" /> Vegetarian
              </label>
            </div>
          </section>

          {/* Sizes */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <Package className="h-4 w-4 text-gray-500" /> Sizes (optional)
              </div>
              <button onClick={addSize} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add Size
              </button>
            </div>
            {(form.sizes || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-500">No sizes added.</div>
            ) : (
              <div className="space-y-2">
                {form.sizes!.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_160px_80px] items-center gap-2">
                    <input value={s.name} onChange={(e)=> {
                      const v = e.target.value;
                      setForm(f => ({ ...f, sizes: f.sizes!.map((x,idx)=> idx===i ? { ...x, name: v } : x)}));
                    }} placeholder="Size name (e.g., M)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" value={s.price} onChange={(e)=>{
                        const v = Number(e.target.value)||0;
                        setForm(f => ({ ...f, sizes: f.sizes!.map((x,idx)=> idx===i ? { ...x, price: v } : x)}));
                      }} className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-2 text-right text-sm" />
                    </div>
                    <button onClick={()=>removeSize(i)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Modifiers */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <UtensilsCrossed className="h-4 w-4 text-gray-500" /> Modifiers
              </div>
              <button onClick={addModifier} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add Modifier
              </button>
            </div>
            {(form.modifiers || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-500">No modifiers yet.</div>
            ) : (
              <div className="space-y-2">
                {form.modifiers!.map((m) => (
                  <div key={m.id} className="grid grid-cols-[1fr_160px_160px_60px] items-center gap-2">
                    <input value={m.name} onChange={(e)=> {
                      const v = e.target.value;
                      setForm(f => ({ ...f, modifiers: f.modifiers!.map(x => x.id===m.id ? { ...x, name: v } : x)}));
                    }} placeholder="Name (e.g., Extra Cheese)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <input value={m.group || ""} onChange={(e)=> {
                      const v = e.target.value;
                      setForm(f => ({ ...f, modifiers: f.modifiers!.map(x => x.id===m.id ? { ...x, group: v } : x)}));
                    }} placeholder="Group (Add-ons / No…)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" value={m.price ?? 0} onChange={(e)=> {
                        const v = Number(e.target.value)||0;
                        setForm(f => ({ ...f, modifiers: f.modifiers!.map(x => x.id===m.id ? { ...x, price: v } : x)}));
                      }} className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-2 text-right text-sm" />
                    </div>
                    <button onClick={()=>removeModifier(m.id)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tags & Availability */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-600">Tags</label>
                <TagEditor
                  tags={form.tags || []}
                  onAdd={(t)=> addTag(t)}
                  onRemove={(t)=> removeTag(t)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Availability</label>
                <div className="mt-1">
                  <button
                    onClick={()=> setForm(f => ({ ...f, available: !f.available }))}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${form.available ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-50 text-gray-700 ring-gray-200"}`}
                  >
                    {form.available ? <BadgeCheck className="h-4 w-4" /> : <CircleSlash2 className="h-4 w-4" />}
                    {form.available ? "Available" : "Unavailable"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              disabled={!canSave}
              onClick={() => onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Save Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Tag Editor
 * ───────────────────────────────────────── */
function TagEditor({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative grow">
          <Tags className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={val}
            onChange={(e)=>setVal(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==="Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
            placeholder="Type tag and Enter…"
            className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={()=>{ if(val.trim()) { onAdd(val.trim()); setVal(""); } }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs hover:bg-gray-50"
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-gray-500">No tags.</span>
        ) : tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
            #{t}
            <button onClick={()=>onRemove(t)} className="rounded p-0.5 hover:bg-gray-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}