"use client";

import React, { useMemo, useState } from "react";

/** ---------------------------
 * Helpers
 * --------------------------*/
const money = (n: number, c = 2) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: c, maximumFractionDigits: c });

type DeviceKey = "printer" | "cashDrawer" | "paymentTerminal" | "network";

/** ---------------------------
 * Page
 * --------------------------*/
export default function ShiftOpenPage() {
  // Form state
  const [location, setLocation] = useState<string>("");
  const [register, setRegister] = useState<string>("");
  const [cashier, setCashier] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");

  // Device checks
  const [devices, setDevices] = useState<Record<DeviceKey, "idle" | "ok" | "fail">>({
    printer: "idle",
    cashDrawer: "idle",
    paymentTerminal: "idle",
    network: "idle",
  });

  // Denominations
  const denominationsByCurrency: Record<string, number[]> = {
    USD: [100, 50, 20, 10, 5, 1, 0.25, 0.1, 0.05, 0.01],
    EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05],
    LBP: [1000000, 500000, 100000, 50000, 20000, 10000, 5000, 1000], // example
  };
  const [counts, setCounts] = useState<Record<number, number>>({});

  const totalFloat = useMemo(
    () =>
      (denominationsByCurrency[currency] || []).reduce((sum, d) => {
        const qty = Number(counts[d] || 0);
        return sum + d * qty;
      }, 0),
    [counts, currency]
  );

  const [notes, setNotes] = useState<string>("");

  // Submit
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const allDevicesOk = Object.values(devices).every((s) => s === "ok");
  const formValid =
    location && register && cashier && allDevicesOk && totalFloat > 0;

  const testDevice = async (k: DeviceKey) => {
    setDevices((p) => ({ ...p, [k]: "idle" })); // reset (UI)
    try {
      // Simulate device test
      await new Promise((r) => setTimeout(r, 500));
      // Example: mark printer ok, others ok; you can branch by key if needed
      setDevices((p) => ({ ...p, [k]: "ok" }));
    } catch {
      setDevices((p) => ({ ...p, [k]: "fail" }));
    }
  };

  const bumpCount = (denom: number, delta: number) => {
    setCounts((p) => {
      const next = { ...p, [denom]: Math.max(0, Number(p[denom] || 0) + delta) };
      return next;
    });
  };

  const handleQtyChange = (denom: number, v: string) => {
    const n = Math.max(0, Number(v.replace(/[^\d]/g, "")) || 0);
    setCounts((p) => ({ ...p, [denom]: n }));
  };

  const openShift = async () => {
    if (!formValid) {
      setError("Please complete all required fields and device checks.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      // TODO: Replace with API call
      await new Promise((r) => setTimeout(r, 900));
      const id = `SHIFT-${Date.now()}`;
      setSavedId(id);
    } catch (e) {
      setError("Could not open shift. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 py-8 px-4">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Open Shift</h1>
            <p className="text-sm text-gray-600">Select your station, verify devices, and set your opening float.</p>
          </div>
          <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-white/60">
            TitanPOS · Shift Manager
          </div>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 md:grid-cols-5">
          {/* Left column: selections + devices */}
          <div className="md:col-span-2 space-y-6">
            {/* Station */}
            <div className="overflow-hidden rounded-2xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Station</h2>

              <label className="mb-1 block text-sm font-medium text-gray-700">Location/Branch</label>
              <select
                className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Select location…</option>
                <option value="Hamra">Hamra</option>
                <option value="Achrafieh">Achrafieh</option>
                <option value="Dbayeh">Dbayeh</option>
              </select>

              <label className="mb-1 block text-sm font-medium text-gray-700">Register / Terminal</label>
              <select
                className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                value={register}
                onChange={(e) => setRegister(e.target.value)}
              >
                <option value="">Select register…</option>
                <option value="Front-1">Front-1</option>
                <option value="Front-2">Front-2</option>
                <option value="Bar-1">Bar-1</option>
              </select>

              <label className="mb-1 block text-sm font-medium text-gray-700">Cashier</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="e.g. A. Haddad"
                value={cashier}
                onChange={(e) => setCashier(e.target.value)}
              />
            </div>

            {/* Device checks */}
            <div className="overflow-hidden rounded-2xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Device Checks</h2>

              <DeviceRow
                label="Receipt Printer"
                state={devices.printer}
                onTest={() => testDevice("printer")}
              />
              <DeviceRow
                label="Cash Drawer"
                state={devices.cashDrawer}
                onTest={() => testDevice("cashDrawer")}
              />
              <DeviceRow
                label="Payment Terminal"
                state={devices.paymentTerminal}
                onTest={() => testDevice("paymentTerminal")}
              />
              <DeviceRow
                label="Network"
                state={devices.network}
                onTest={() => testDevice("network")}
              />
              <p className="mt-3 text-xs text-gray-500">All devices must be OK to open the shift.</p>
            </div>

            {/* Notes */}
            <div className="overflow-hidden rounded-2xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Notes (optional)</h2>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Anything to mention about the float, petty cash, or device quirks?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Right column: float & confirmation */}
          <div className="md:col-span-3 space-y-6">
            {/* Opening float */}
            <div className="overflow-hidden rounded-2xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Opening Float</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Currency</label>
                  <select
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    value={currency}
                    onChange={(e) => {
                      setCounts({});
                      setCurrency(e.target.value);
                    }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(denominationsByCurrency[currency] || []).map((d) => {
                  const qty = Number(counts[d] || 0);
                  const lineTotal = d * qty;
                  return (
                    <div key={d} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">
                          {currency} {money(d, d < 1 ? 2 : 0)}
                        </span>
                        <span className="text-xs text-gray-500">x Qty</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          onClick={() => bumpCount(d, -1)}
                        >
                          −
                        </button>
                        <input
                          inputMode="numeric"
                          value={qty}
                          onChange={(e) => handleQtyChange(d, e.target.value)}
                          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-gray-900 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          onClick={() => bumpCount(d, +1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="mt-2 text-right text-sm font-semibold text-gray-900">
                        {currency} {money(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
                <span className="text-sm font-semibold text-orange-800">Float Total</span>
                <span className="text-lg font-extrabold text-orange-700">
                  {currency} {money(totalFloat)}
                </span>
              </div>
            </div>

            {/* Summary & confirm */}
            <div className="overflow-hidden rounded-2xl bg-white/80 p-5 backdrop-blur-xl ring-1 ring-white/60 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Review & Confirm</h2>

              <ul className="grid gap-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600">Location</span>
                  <span className="font-semibold text-gray-900">{location || "—"}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Register</span>
                  <span className="font-semibold text-gray-900">{register || "—"}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Cashier</span>
                  <span className="font-semibold text-gray-900">{cashier || "—"}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Devices</span>
                  <span className={`font-semibold ${allDevicesOk ? "text-emerald-600" : "text-red-600"}`}>
                    {allDevicesOk ? "All OK" : "Pending"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Opening Float</span>
                  <span className="font-semibold text-gray-900">
                    {currency} {money(totalFloat)}
                  </span>
                </li>
              </ul>

              {error && (
                <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              {savedId ? (
                <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
                  ✅ Shift opened successfully. Ref: <span className="font-semibold">{savedId}</span>
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  onClick={() => {
                    setCounts({});
                    setNotes("");
                    setError("");
                  }}
                >
                  Reset Float
                </button>
                <button
                  type="button"
                  onClick={openShift}
                  disabled={!formValid || saving}
                  className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "Opening…" : "Open Shift 🚀"}
                  <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — shift control
        </p>
      </div>
    </div>
  );
}

/** ---------------------------
 * Components
 * --------------------------*/
function DeviceRow({
  label,
  state,
  onTest,
}: {
  label: string;
  state: "idle" | "ok" | "fail";
  onTest: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <StatusPill state={state} />
      </div>
      <button
        type="button"
        onClick={onTest}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        Test
      </button>
    </div>
  );
}

function StatusPill({ state }: { state: "idle" | "ok" | "fail" }) {
  const map = {
    idle: { text: "Not tested", cls: "bg-gray-100 text-gray-700" },
    ok: { text: "OK", cls: "bg-emerald-100 text-emerald-700" },
    fail: { text: "Failed", cls: "bg-red-100 text-red-700" },
  }[state];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map.cls}`}>
      {map.text}
    </span>
  );
}