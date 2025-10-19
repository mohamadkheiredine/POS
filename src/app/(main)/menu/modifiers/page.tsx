"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ListTree, Plus, GripVertical, Pencil, Trash2, X, CheckCircle2, Info, DollarSign, Hash, ArrowUpDown
} from "lucide-react";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UID = string;

type ModifierOption = {
  id: UID;
  name: string;
  price?: number;
  sku?: string;
  default?: boolean;
};

type ModifierGroup = {
  id: UID;
  name: string;
  required?: boolean;
  min?: number;   // minimum selections
  max?: number;   // maximum selections
  options: ModifierOption[];
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* Seed */
const SEED: ModifierGroup[] = [
  {
    id: uid(),
    name: "Add-ons",
    max: 3,
    options: [
      { id: uid(), name: "Extra Cheese", price: 1 },
      { id: uid(), name: "Olives", price: 0.5 },
      { id: uid(), name: "Mushrooms", price: 0.7 },
    ],
  },
  {
    id: uid(),
    name: "No / Remove",
    max: 5,
    options: [
      { id: uid(), name: "No Onions" },
      { id: uid(), name: "No Basil" },
    ],
  },
  {
    id: uid(),
    name: "Sauces",
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: uid(), name: "Garlic Sauce", default: true },
      { id: uid(), name: "Spicy Sauce" },
      { id: uid(), name: "BBQ Sauce" },
    ],
  },
];

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function ModifiersManagerPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>(SEED);
  const [filter, setFilter] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; option?: ModifierOption | null; groupId?: string | null }>({ open: false });
  const [editingGroup, setEditingGroup] = useState<{ open: boolean; group?: ModifierGroup | null }>({ open: false });

  /* Filtered memo */
  const filtered = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return groups;
    return groups.map(g => ({
      ...g,
      options: g.options.filter(o =>
        o.name.toLowerCase().includes(t) || (o.sku || "").toLowerCase().includes(t)
      )
    }));
  }, [groups, filter]);

  /* DnD state */
  const dragData = useRef<{ type: "group" | "option"; groupId?: string; optionId?: string } | null>(null);

  /* Group ops */
  const addGroup = () => {
    const g: ModifierGroup = { id: uid(), name: "New Group", options: [] };
    setGroups((arr) => [g, ...arr]);
    setEditingGroup({ open: true, group: g });
  };
  const updateGroup = (id: string, patch: Partial<ModifierGroup>) =>
    setGroups(arr => arr.map(g => g.id === id ? { ...g, ...patch } : g));
  const removeGroup = (id: string) =>
    setGroups(arr => arr.filter(g => g.id !== id));

  const moveGroup = (dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    setGroups(arr => {
      const a = [...arr];
      const i = a.findIndex(g => g.id === dragId);
      const j = a.findIndex(g => g.id === dropId);
      if (i < 0 || j < 0) return arr;
      const [g] = a.splice(i, 1);
      a.splice(j, 0, g);
      return a;
    });
  };

  /* Option ops */
  const addOption = (groupId: string) => {
    const opt: ModifierOption = { id: uid(), name: "New Option", price: 0 };
    setGroups(arr => arr.map(g => g.id === groupId ? { ...g, options: [opt, ...g.options] } : g));
    setDrawer({ open: true, option: opt, groupId });
  };

  const updateOption = (groupId: string, optionId: string, patch: Partial<ModifierOption>) =>
    setGroups(arr => arr.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...patch } : o) };
    }));

  const removeOption = (groupId: string, optionId: string) =>
    setGroups(arr => arr.map(g => g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g));

  const reorderOptionWithin = (groupId: string, dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    setGroups(arr => arr.map(g => {
      if (g.id !== groupId) return g;
      const opts = [...g.options];
      const i = opts.findIndex(o => o.id === dragId);
      const j = opts.findIndex(o => o.id === dropId);
      if (i < 0 || j < 0) return g;
      const [o] = opts.splice(i, 1);
      opts.splice(j, 0, o);
      return { ...g, options: opts };
    }));
  };

  const moveOptionAcross = (fromGroupId: string, toGroupId: string, optionId: string, dropBeforeId?: string) => {
    if (fromGroupId === toGroupId) return;
    setGroups(arr => {
      const a = [...arr];
      const gi = a.findIndex(g => g.id === fromGroupId);
      const gj = a.findIndex(g => g.id === toGroupId);
      if (gi < 0 || gj < 0) return arr;
      const from = a[gi];
      const to = a[gj];
      const idx = from.options.findIndex(o => o.id === optionId);
      if (idx < 0) return arr;
      const [opt] = from.options.splice(idx, 1);
      if (dropBeforeId) {
        const ins = to.options.findIndex(o => o.id === dropBeforeId);
        if (ins >= 0) to.options.splice(ins, 0, opt);
        else to.options.push(opt);
      } else {
        to.options.push(opt);
      }
      a[gi] = { ...from };
      a[gj] = { ...to };
      return a;
    });
  };

  /* Export CSV (groups & options) */
  const exportCSV = () => {
    const cols = ["Group","Required","Min","Max","Option","Price","SKU","Default"];
    const rows: string[][] = [];
    groups.forEach(g => {
      if (g.options.length === 0) {
        rows.push([g.name, String(!!g.required), String(g.min ?? ""), String(g.max ?? ""), "", "", "", ""]);
      } else {
        g.options.forEach(o => {
          rows.push([g.name, String(!!g.required), String(g.min ?? ""), String(g.max ?? ""), o.name, String(o.price ?? ""), o.sku ?? "", String(!!o.default)]);
        });
      }
    });
    const csv = [cols.join(","), ...rows.map(r => r.map(x => typeof x === "string" && x.includes(",") ? `"${x}"` : x).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "modifiers.csv"; a.click(); URL.revokeObjectURL(url);
  };

  /* Render */
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Menu</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Modifiers</h1>
            <p className="mt-0.5 text-sm text-gray-600">Drag groups & options to reorder or move across groups · TitanPOS light style</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addGroup}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
            >
              <Plus className="h-4 w-4" /> New Group
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <ArrowUpDown className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <input
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
            placeholder="Search option or SKU…"
            className="w-80 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          <div className="hidden text-xs text-gray-500 md:block">
            Tip: Drag the <b className="text-gray-700">grip</b> to reorder. Drop an option into another group to move it.
          </div>
        </div>

        {/* Board */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GroupColumn
              key={g.id}
              group={g}
              onEdit={() => setEditingGroup({ open: true, group: g })}
              onDelete={() => removeGroup(g.id)}
              onAddOption={() => addOption(g.id)}
              onDragStartGroup={() => { dragData.current = { type: "group", groupId: g.id }; }}
              onDropGroup={(dropId) => {
                const data = dragData.current;
                if (data?.type === "group" && data.groupId) moveGroup(data.groupId, dropId);
                dragData.current = null;
              }}
              /* Option handlers within group */
              onOptionDragStart={(optionId) => { dragData.current = { type: "option", groupId: g.id, optionId }; }}
              onOptionDropInside={(beforeId?: string) => {
                const data = dragData.current;
                if (!data) return;
                if (data.type === "option" && data.groupId && data.optionId) {
                  if (data.groupId === g.id) {
                    // reorder within same group
                    if (beforeId) reorderOptionWithin(g.id, data.optionId, beforeId);
                  } else {
                    // move across groups
                    moveOptionAcross(data.groupId, g.id, data.optionId, beforeId);
                  }
                }
                dragData.current = null;
              }}
              onOpenOption={(o) => setDrawer({ open: true, option: o, groupId: g.id })}
              onRemoveOption={(o) => removeOption(g.id, o.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No groups or options match…
            </div>
          )}
        </div>

        <p className="pb-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Modifiers
        </p>
      </div>

      {/* Group editor */}
      {editingGroup.open && editingGroup.group && (
        <GroupModal
          group={editingGroup.group}
          onClose={() => setEditingGroup({ open: false })}
          onSave={(patch) => { updateGroup(editingGroup.group!.id, patch); setEditingGroup({ open: false }); }}
        />
      )}

      {/* Option editor */}
      {drawer.open && drawer.option && (
        <OptionDrawer
          option={drawer.option}
          groupId={drawer.groupId!}
          onClose={() => setDrawer({ open: false })}
          onSave={(patch) => {
            updateOption(drawer.groupId!, drawer.option!.id, patch);
            setDrawer({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 * Group Column
 * ───────────────────────────────────────── */
function GroupColumn({
  group,
  onEdit,
  onDelete,
  onAddOption,
  onDragStartGroup,
  onDropGroup,
  onOptionDragStart,
  onOptionDropInside,
  onOpenOption,
  onRemoveOption,
}: {
  group: ModifierGroup;
  onEdit: () => void;
  onDelete: () => void;
  onAddOption: () => void;
  onDragStartGroup: () => void;
  onDropGroup: (dropId: string) => void;
  onOptionDragStart: (optionId: string) => void;
  onOptionDropInside: (beforeId?: string) => void;
  onOpenOption: (o: ModifierOption) => void;
  onRemoveOption: (o: ModifierOption) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStartGroup}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropGroup(group.id)}
      className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
          <div className="truncate font-bold text-gray-900">{group.name}</div>
          <span className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {group.options.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {group.required && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">required</span>
          )}
          {(group.min !== undefined || group.max !== undefined) && (
            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">min {group.min ?? "0"} · max {group.max ?? "∞"}</span>
          )}
          <button title="Edit group" onClick={onEdit} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
            <Pencil className="h-4 w-4" />
          </button>
          <button title="Delete group" onClick={onDelete} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Options list */}
      <div
        className="min-h-[140px] space-y-2 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onOptionDropInside(undefined)}
      >
        {group.options.map((o, idx) => (
          <div
            key={o.id}
            draggable
            onDragStart={() => onOptionDragStart(o.id)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => onOptionDropInside(o.id)}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-900">{o.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                {o.price !== undefined && <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{o.price}</span>}
                {o.sku && <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{o.sku}</span>}
                {o.default && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">default</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onOpenOption(o)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => onRemoveOption(o)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {group.options.length === 0 && (
          <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-xs text-gray-500">
            Drop options here…
          </div>
        )}

        <button
          onClick={onAddOption}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" /> Add Option
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Group Modal
 * ───────────────────────────────────────── */
function GroupModal({
  group,
  onClose,
  onSave,
}: {
  group: ModifierGroup;
  onClose: () => void;
  onSave: (patch: Partial<ModifierGroup>) => void;
}) {
  const [form, setForm] = useState<Partial<ModifierGroup>>({
    name: group.name,
    required: group.required ?? false,
    min: group.min,
    max: group.max,
  });

  const set = (p: Partial<ModifierGroup>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-gray-500" />
            <div className="font-bold text-gray-900">Edit Group</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input value={form.name as string} onChange={(e)=>set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!form.required} onChange={(e)=>set({ required: e.target.checked })} />
              Required
            </label>
            <div className="text-[11px] text-gray-500">
              If required and <b>min/max</b> are empty, min=1, max=1 will apply at POS.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Min selections</label>
              <input type="number" value={form.min ?? ""} onChange={(e)=>set({ min: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Max selections</label>
              <input type="number" value={form.max ?? ""} onChange={(e)=>set({ max: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            POS will enforce <b>min/max</b> per group; if <b>max = 1</b>, options behave like radio buttons.
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={()=> onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
 * Option Drawer
 * ───────────────────────────────────────── */
function OptionDrawer({
  option, groupId, onClose, onSave
}: {
  option: ModifierOption;
  groupId: string;
  onClose: () => void;
  onSave: (patch: Partial<ModifierOption>) => void;
}) {
  const [form, setForm] = useState<Partial<ModifierOption>>({
    name: option.name, price: option.price ?? 0, sku: option.sku ?? "", default: option.default ?? false
  });
  const set = (p: Partial<ModifierOption>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-gray-900">Edit Option</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input value={form.name as string} onChange={(e)=>set({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="text-xs text-gray-600">Price</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" value={form.price as number} onChange={(e)=>set({ price: Number(e.target.value)||0 })} className="mt-1 w-full rounded-lg border border-gray-200 pl-7 pr-2 py-2 text-right" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600">SKU (optional)</label>
              <input value={form.sku as string} onChange={(e)=>set({ sku: e.target.value })} placeholder="e.g., MOD-EXTRA-CHS" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!form.default} onChange={(e)=>set({ default: e.target.checked })} />
            Set as default (pre-selected)
          </label>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={()=> onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}