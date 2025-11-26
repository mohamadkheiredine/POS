"use client";

import React, { useMemo, useState } from "react";
import {
  Search, Filter, Plus, Pencil, Gift, Coins, Crown, X, CheckCircle2, TrendingUp, User, ArrowUpCircle, ArrowDownCircle, Trash2, Users2
} from "lucide-react";

/* ───────────────────────────────
 * Types
 * ─────────────────────────────── */
type UID = string;
type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

type LoyaltyMember = {
  id: UID;
  name: string;
  phone?: string;
  tier: Tier;
  points: number;
  redeemed: number;
  active: boolean;
  transactions: { id: UID; date: string; type: "Earned" | "Redeemed"; amount: number; note?: string }[];
};

const uid = () => Math.random().toString(36).slice(2, 9);

const MOCK: LoyaltyMember[] = [
  {
    id: uid(),
    name: "John Doe",
    phone: "0321456789",
    tier: "Gold",
    points: 320,
    redeemed: 80,
    active: true,
    transactions: [
      { id: uid(), date: "2025-10-12", type: "Earned", amount: 200, note: "POS order #101" },
      { id: uid(), date: "2025-10-18", type: "Redeemed", amount: 80, note: "Discount voucher" },
    ],
  },
  {
    id: uid(),
    name: "Sara Haddad",
    phone: "0344555777",
    tier: "Silver",
    points: 180,
    redeemed: 0,
    active: true,
    transactions: [{ id: uid(), date: "2025-10-20", type: "Earned", amount: 180 }],
  },
  {
    id: uid(),
    name: "Ahmad Khalil",
    phone: "0377999111",
    tier: "Bronze",
    points: 60,
    redeemed: 0,
    active: false,
    transactions: [],
  },
];

/* ───────────────────────────────
 * Page
 * ─────────────────────────────── */
export default function LoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>(MOCK);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<"All" | Tier>("All");
  const [drawer, setDrawer] = useState<{ open: boolean; member?: LoyaltyMember | null }>({ open: false });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return members.filter((m) => {
      const txt = !t || m.name.toLowerCase().includes(t) || (m.phone || "").includes(t);
      const matchTier = tier === "All" || m.tier === tier;
      return txt && matchTier;
    });
  }, [members, search, tier]);

  const startNew = () =>
    setDrawer({ open: true, member: { id: uid(), name: "", phone: "", tier: "Bronze", points: 0, redeemed: 0, active: true, transactions: [] } });

  const startEdit = (m: LoyaltyMember) =>
    setDrawer({ open: true, member: { ...m } });

  const saveMember = (m: LoyaltyMember) => {
    setMembers((arr) => {
      const exists = arr.some((x) => x.id === m.id);
      return exists ? arr.map((x) => (x.id === m.id ? m : x)) : [m, ...arr];
    });
    setDrawer({ open: false });
  };

  const totalPoints = members.reduce((a, b) => a + b.points, 0);
  const activeMembers = members.filter((m) => m.active).length;
  const totalRedeemed = members.reduce((a, b) => a + b.redeemed, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(1200px_800px_at_20%_-10%,#fff,rgba(255,189,89,0.25)_25%,rgba(255,150,0,0.15)_45%,rgba(16,185,129,0.15)_70%)] px-4 py-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-orange-300/30 to-amber-200/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-gradient-to-tr from-teal-200/30 to-orange-100/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">POS · F&B</div>
            <h1 className="text-3xl font-extrabold text-gray-900">Loyalty Program</h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Manage customer points, tiers, and reward redemptions.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Member
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<Coins className="h-6 w-6 text-orange-500" />} title="Total Points" value={totalPoints.toLocaleString()} />
          <SummaryCard icon={<Users2 className="h-6 w-6 text-emerald-500" />} title="Active Members" value={activeMembers} />
          <SummaryCard icon={<Gift className="h-6 w-6 text-amber-500" />} title="Total Redeemed" value={totalRedeemed.toLocaleString()} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as any)}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {["All", "Bronze", "Silver", "Gold", "Platinum"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Members List */}
        <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>Name</th>
                <th>Phone</th>
                <th>Tier</th>
                <th>Points</th>
                <th>Redeemed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <tr key={m.id} className="[&>td]:px-3 [&>td]:py-3">
                  <td className="font-semibold text-gray-900 flex items-center gap-1">
                    <User className="h-4 w-4 text-gray-400" /> {m.name}
                  </td>
                  <td>{m.phone}</td>
                  <td>
                    <TierBadge tier={m.tier} />
                  </td>
                  <td className="font-semibold text-gray-800">{m.points}</td>
                  <td>{m.redeemed}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                        m.active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-gray-50 text-gray-600 ring-gray-200"
                      }`}
                    >
                      {m.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => startEdit(m)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No loyalty members found…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — Loyalty Program
        </p>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.member && (
        <LoyaltyDrawer member={drawer.member} onClose={() => setDrawer({ open: false })} onSave={saveMember} />
      )}
    </div>
  );
}

/* ───────────────────────────────
 * Summary Card
 * ─────────────────────────────── */
function SummaryCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-4 flex items-center gap-3">
      <div className="rounded-2xl bg-orange-50 p-3">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

/* ───────────────────────────────
 * Tier Badge
 * ─────────────────────────────── */
function TierBadge({ tier }: { tier: Tier }) {
  const colorMap: Record<Tier, string> = {
    Bronze: "bg-amber-50 text-amber-700 ring-amber-200",
    Silver: "bg-gray-50 text-gray-700 ring-gray-200",
    Gold: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    Platinum: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${colorMap[tier]}`}>
      <Crown className="h-3.5 w-3.5 inline mr-1" /> {tier}
    </span>
  );
}

/* ───────────────────────────────
 * Drawer (Add/Edit Member)
 * ─────────────────────────────── */
function LoyaltyDrawer({
  member,
  onClose,
  onSave,
}: {
  member: LoyaltyMember;
  onClose: () => void;
  onSave: (m: LoyaltyMember) => void;
}) {
  const [form, setForm] = useState<LoyaltyMember>({ ...member });
  const set = (p: Partial<LoyaltyMember>) => setForm((f) => ({ ...f, ...p }));

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">
            {member.name ? `Edit ${member.name}` : "New Loyalty Member"}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs text-gray-600">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Phone</label>
            <input
              value={form.phone || ""}
              onChange={(e) => set({ phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => set({ tier: e.target.value as Tier })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              {["Bronze", "Silver", "Gold", "Platinum"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Points</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => set({ points: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Redeemed</label>
              <input
                type="number"
                value={form.redeemed}
                onChange={(e) => set({ redeemed: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            Active Member
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!canSave}
              onClick={() => onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}