"use client";

import React, { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Clock, ShoppingCart, DollarSign, Ticket,
  ChefHat, AlertTriangle, Users, UtensilsCrossed
} from "lucide-react";

/* ---------------------------
 * Helpers & Mock
 * --------------------------*/
const money = (n: number) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MOCK = {
  kpis: {
    salesToday: 4680.25,
    orders: 192,
    avgTicket: 24.38,
    openTickets: 7,
    salesDeltaPct: 12.4, // vs yesterday
    ordersDeltaPct: -3.1,
  },
  hourlySales: [120, 180, 260, 350, 420, 510, 620, 700, 560, 480, 520, 610], // last 12 hours
  channels: [
    { label: "Dine-in", value: 58 },
    { label: "Takeaway", value: 27 },
    { label: "Delivery", value: 15 },
  ],
  topItems: [
    { name: "Margherita Pizza", qty: 86, sales: 774.0 },
    { name: "Chicken Shawarma", qty: 72, sales: 648.0 },
    { name: "Caesar Salad", qty: 55, sales: 495.0 },
    { name: "Mango Juice", qty: 49, sales: 220.5 },
    { name: "Cheesecake Slice", qty: 41, sales: 318.7 },
  ],
  kds: [
    { station: "Grill", waiting: 6, avgMin: 11 },
    { station: "Salad", waiting: 2, avgMin: 5 },
    { station: "Bar", waiting: 4, avgMin: 7 },
    { station: "Dessert", waiting: 1, avgMin: 6 },
  ],
  lowStock: [
    { item: "Tomato (kg)", onHand: 4, uom: "kg" },
    { item: "Burger Buns", onHand: 12, uom: "pcs" },
    { item: "Mozzarella", onHand: 2.5, uom: "kg" },
  ],
  staffOnShift: [
    { name: "H. Nassar", role: "Cashier", since: "10:00" },
    { name: "M. Karam", role: "Waiter", since: "09:45" },
    { name: "L. Saad", role: "Barista", since: "09:30" },
    { name: "A. Haddad", role: "Chef", since: "09:00" },
  ],
};

/* ---------------------------
 * Page
 * --------------------------*/
export default function DashboardPage() {
  const maxHourly = useMemo(() => Math.max(...MOCK.hourlySales, 1), []);
  const channelTotal = useMemo(() => MOCK.channels.reduce((s, c) => s + c.value, 0), []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Today’s performance at a glance</p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
            TitanPOS · Realtime KPIs
          </div>
        </div>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Sales Today"
            value={`$ ${money(MOCK.kpis.salesToday)}`}
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ pct: MOCK.kpis.salesDeltaPct }}
          />
          <StatCard
            title="Orders"
            value={`${MOCK.kpis.orders}`}
            icon={<ShoppingCart className="h-5 w-5" />}
            trend={{ pct: MOCK.kpis.ordersDeltaPct }}
          />
          <StatCard
            title="Avg Ticket"
            value={`$ ${money(MOCK.kpis.avgTicket)}`}
            icon={<Ticket className="h-5 w-5" />}
          />
          <StatCard
            title="Open Tickets"
            value={`${MOCK.kpis.openTickets}`}
            icon={<Clock className="h-5 w-5" />}
            tone="warn"
          />
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Hourly Sales */}
          <div className="lg:col-span-2 overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Hourly Sales</h2>
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-3 py-1 rounded-full">Last 12h</span>
            </div>
            <BarChart data={MOCK.hourlySales} max={maxHourly} />
          </div>

          {/* Channels */}
          <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Channel Mix</h2>
              <span className="text-xs font-semibold text-gray-600">{channelTotal}%</span>
            </div>
            <DonutChart
              data={MOCK.channels}
              strokeWidth={22}
              colors={["#F59E0B", "#10B981", "#6366F1"]}
            />
            <ul className="mt-4 space-y-1 text-sm">
              {MOCK.channels.map((c, i) => (
                <li key={c.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: ["#F59E0B", "#10B981", "#6366F1"][i] }}
                    />
                    {c.label}
                  </span>
                  <span className="font-semibold text-gray-900">{c.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Lower grid */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Top Items */}
          <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Top Items</h2>
            <ul className="divide-y divide-gray-100">
              {MOCK.topItems.map((it) => (
                <li key={it.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-800">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Qty {it.qty}</div>
                    <div className="text-sm font-semibold text-gray-900">$ {money(it.sales)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Kitchen Status */}
          <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Kitchen Status (KDS)</h2>
            <ul className="space-y-3">
              {MOCK.kds.map((k) => (
                <li key={k.station} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-800">{k.station}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Waiting <span className="font-semibold">{k.waiting}</span> · Avg <span className="font-semibold">{k.avgMin}m</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Stock Alerts + Staff */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Low Stock Alerts</h2>
              <ul className="space-y-3">
                {MOCK.lowStock.map((s) => (
                  <li key={s.item} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">{s.item}</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-800">
                      {s.onHand} {s.uom}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Staff on Shift</h2>
              <ul className="space-y-3">
                {MOCK.staffOnShift.map((p) => (
                  <li key={p.name} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-500">({p.role})</span>
                    </div>
                    <span className="text-xs text-gray-600">since {p.since}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — dashboard
        </p>
      </div>
    </div>
  );
}

/* ---------------------------
 * Components
 * --------------------------*/
function StatCard({
  title,
  value,
  icon,
  trend,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { pct: number };
  tone?: "warn" | "ok";
}) {
  const trendUp = trend && trend.pct >= 0;
  const trendColor = trend
    ? trendUp
      ? "text-emerald-700 bg-emerald-50"
      : "text-amber-700 bg-amber-50"
    : "text-gray-600 bg-gray-50";
  const trendIcon = trend ? (trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />) : null;

  const ring =
    tone === "warn" ? "ring-amber-100" : tone === "ok" ? "ring-emerald-100" : "ring-white/60";

  return (
    <div className={`overflow-hidden rounded-3xl bg-white/80 p-5 backdrop-blur-xl ring-1 ${ring} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-500">{icon}<span className="text-sm font-semibold">{title}</span></div>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trendColor}`}>
            {trendIcon}
            {Math.abs(trend.pct).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

function BarChart({ data, max }: { data: number[]; max: number }) {
  const pad = 24;
  const width = 640;
  const height = 220;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const barW = w / data.length - 8;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
      {/* axes */}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e5e7eb" />
      {data.map((v, i) => {
        const x = pad + i * (w / data.length) + 4;
        const barH = (v / max) * (h - 8);
        const y = height - pad - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="6"
              className="fill-orange-400/80"
            />
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({
  data,
  strokeWidth = 18,
  colors = [],
}: {
  data: { label: string; value: number }[];
  strokeWidth?: number;
  colors?: string[];
}) {
  const size = 180;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colors[i % colors.length] || "#F59E0B"}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += len;
          return el;
        })}
        <text
          x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          className="fill-gray-900 text-sm font-bold"
        >
          {total}%
        </text>
      </svg>
    </div>
  );
}
