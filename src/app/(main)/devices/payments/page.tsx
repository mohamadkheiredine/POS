"use client";

import React, { useMemo, useState } from "react";
import {
  CreditCard,
  Plus,
  X,
  Pencil,
  Trash2,
  PlugZap,
  CheckCircle2,
  AlertTriangle,
  Link2,
} from "lucide-react";

type MachineProvider =
  | "Areeba"
  | "Network"
  | "Stripe Terminal"
  | "MyPOS"
  | "Other";

type MachineStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

type PaymentMachine = {
  id: number;
  name: string;
  provider: MachineProvider;
  model?: string;
  ip?: string;
  port?: number;
  serial?: string;
  active: boolean;
  status: MachineStatus;
  assignedStationId: number | null;
};

type Station = { id: number; name: string; location?: string };

const brandBg =
  "bg-[radial-gradient(1200px_800px_at_20%_-10%,#ffffff,rgba(255,122,0,0.18)_25%,rgba(0,166,166,0.14)_70%,#ffffff_100%)]";

export default function PaymentMachinesPage() {
  // Mock stations (replace with API)
  const stations: Station[] = useMemo(
    () => [
      { id: 1, name: "POS Station 1", location: "Front Cashier" },
      { id: 2, name: "POS Station 2", location: "Bar" },
      { id: 3, name: "POS Station 3", location: "Terrace" },
    ],
    []
  );

  // Mock machines (replace with API)
  const [machines, setMachines] = useState<PaymentMachine[]>([
    {
      id: 1,
      name: "Areeba Terminal - Cashier",
      provider: "Areeba",
      model: "Verifone V200c",
      ip: "192.168.1.80",
      port: 9100,
      serial: "AR-0012",
      active: true,
      status: "ONLINE",
      assignedStationId: 1,
    },
    {
      id: 2,
      name: "Bar Terminal",
      provider: "Network",
      model: "PAX A920",
      ip: "192.168.1.81",
      port: 9000,
      serial: "PX-8831",
      active: true,
      status: "OFFLINE",
      assignedStationId: 2,
    },
  ]);

  const [search, setSearch] = useState("");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMachine | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<MachineProvider>("Areeba");
  const [model, setModel] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState<number>(9100);
  const [serial, setSerial] = useState("");
  const [active, setActive] = useState(true);
  const [assignedStationId, setAssignedStationId] = useState<number | null>(
    null
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((m) =>
      [m.name, m.provider, m.model, m.ip, m.serial]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [machines, search]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setProvider("Areeba");
    setModel("");
    setIp("");
    setPort(9100);
    setSerial("");
    setActive(true);
    setAssignedStationId(null);
    setDrawerOpen(true);
  };

  const openEdit = (m: PaymentMachine) => {
    setEditing(m);
    setName(m.name);
    setProvider(m.provider);
    setModel(m.model || "");
    setIp(m.ip || "");
    setPort(m.port || 9100);
    setSerial(m.serial || "");
    setActive(m.active);
    setAssignedStationId(m.assignedStationId);
    setDrawerOpen(true);
  };

  const saveMachine = () => {
    if (!name.trim()) return alert("Machine name is required.");
    if (!assignedStationId) return alert("Please assign a POS station.");
    // IP/Port optional depending on provider; keep simple validation:
    if (ip && !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
      return alert("Invalid IP address format.");

    if (editing) {
      setMachines((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? {
                ...x,
                name: name.trim(),
                provider,
                model: model.trim(),
                ip: ip.trim(),
                port,
                serial: serial.trim(),
                active,
                assignedStationId,
              }
            : x
        )
      );
    } else {
      const newId = Math.max(0, ...machines.map((m) => m.id)) + 1;
      setMachines((prev) => [
        ...prev,
        {
          id: newId,
          name: name.trim(),
          provider,
          model: model.trim(),
          ip: ip.trim(),
          port,
          serial: serial.trim(),
          active,
          status: "UNKNOWN",
          assignedStationId,
        },
      ]);
    }

    setDrawerOpen(false);
    setEditing(null);
  };

  const removeMachine = (id: number) => {
    if (!confirm("Remove this payment machine?")) return;
    setMachines((prev) => prev.filter((m) => m.id !== id));
  };

  const stationName = (id: number | null) =>
    stations.find((s) => s.id === id)?.name || "Unassigned";

  const statusBadge = (st: MachineStatus) => {
    if (st === "ONLINE")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> ONLINE
        </span>
      );
    if (st === "OFFLINE")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> OFFLINE
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-700">
        <PlugZap className="h-3.5 w-3.5" /> UNKNOWN
      </span>
    );
  };

  return (
    <div className={`min-h-screen ${brandBg} p-6`}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Payment Machines
            </h1>
            <p className="text-sm text-gray-600">
              Add/edit terminals and link each machine to a POS station.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add Machine
          </button>
        </div>

        {/* Search */}
        <div className="rounded-3xl bg-white/80 p-4 backdrop-blur ring-1 ring-white/60 shadow-sm">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machines (name, provider, IP, serial)…"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-3xl bg-white/80 p-4 backdrop-blur ring-1 ring-white/60 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-500">
                        {m.provider}
                        {m.model ? ` • ${m.model}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {statusBadge(m.status)}
                    {m.active ? (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                        DISABLED
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeMachine(m.id)}
                    className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">POS Station</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                    <Link2 className="h-4 w-4 text-orange-500" />
                    {stationName(m.assignedStationId)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">IP / Port</span>
                  <span className="font-semibold text-gray-900">
                    {m.ip ? `${m.ip}:${m.port || ""}` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Serial</span>
                  <span className="font-semibold text-gray-900">
                    {m.serial || "—"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button className="flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                  Test Connection
                </button>
                <button className="flex-1 rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow hover:brightness-110">
                  Test Payment
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-3xl bg-white/80 p-8 text-center text-sm text-gray-600 ring-1 ring-white/60 shadow-sm">
            No payment machines found.
          </div>
        )}
      </div>

      {/* ========================= Drawer Add/Edit ========================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="h-full w-full max-w-md overflow-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-xs text-gray-500">
                  Settings / Payment Machines
                </div>
                <div className="text-lg font-extrabold text-gray-900">
                  {editing ? "Edit Machine" : "Add Machine"}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Machine Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="e.g., Areeba Terminal - Front"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as MachineProvider)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option>Areeba</option>
                    <option>Network</option>
                    <option>Stripe Terminal</option>
                    <option>MyPOS</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Model (optional)
                  </label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="PAX A920, Verifone…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    IP (optional)
                  </label>
                  <input
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="192.168.1.80"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Port (optional)
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="9100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Serial (optional)
                </label>
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="AR-0012"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Assign to POS Station
                </label>
                <select
                  value={assignedStationId ?? ""}
                  onChange={(e) =>
                    setAssignedStationId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select station…</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.location ? `— ${s.location}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Orders from this station will use this machine for card payments.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                Active (available for checkout)
              </label>
            </div>

            <div className="border-t p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveMachine}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
              >
                {editing ? "Save Changes" : "Create Machine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}