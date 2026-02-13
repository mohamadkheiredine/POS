"use client";

import { useState } from "react";
import {
  Printer,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  TestTube,
  ArrowRight,
} from "lucide-react";

type PrinterType = "RECEIPT" | "KITCHEN";

type PrinterDevice = {
  id: number;
  name: string;
  type: PrinterType;
  ip: string;
  station?: string;
  active: boolean;
};

const KITCHEN_STATIONS = ["Grill", "Salad", "Bar", "Dessert", "Expo"];

export default function PrinterManagementPage() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([
    {
      id: 1,
      name: "Kitchen Printer - Grill",
      type: "KITCHEN",
      ip: "192.168.1.50",
      station: "Grill",
      active: true,
    },
    {
      id: 2,
      name: "Bar Printer",
      type: "KITCHEN",
      ip: "192.168.1.51",
      station: "Bar",
      active: true,
    },
    {
      id: 3,
      name: "Receipt Printer",
      type: "RECEIPT",
      ip: "192.168.1.60",
      active: true,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Printer & Kitchen Routing
            </h1>
            <p className="text-sm text-gray-600">
              Manage printers and route items to kitchen stations
            </p>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110">
            <Plus className="h-4 w-4" />
            Add Printer
          </button>
        </div>

        {/* Layout */}
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* LEFT: Printer List */}
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-gray-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Printer className="h-5 w-5 text-orange-500" />
              Printers
            </h2>

            <div className="space-y-3">
              {printers.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.ip} • {p.type}
                      </div>
                      {p.station && (
                        <div className="mt-1 text-xs font-medium text-orange-600">
                          Station: {p.station}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {p.active ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100">
                      <TestTube className="h-3 w-3" />
                      Test
                    </button>
                    <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100">
                      <Settings className="h-3 w-3" />
                      Edit
                    </button>
                    <button className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT: Kitchen Routing */}
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-gray-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ArrowRight className="h-5 w-5 text-orange-500" />
              Kitchen Station Routing
            </h2>

            <div className="space-y-4">
              {KITCHEN_STATIONS.map((station) => (
                <div
                  key={station}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="mb-2 font-semibold text-gray-900">
                    {station}
                  </div>

                  <select className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400">
                    <option>Select Printer</option>
                    {printers
                      .filter((p) => p.type === "KITCHEN")
                      .map((p) => (
                        <option key={p.id}>{p.name}</option>
                      ))}
                  </select>

                  <p className="mt-1 text-xs text-gray-500">
                    All items routed to <b>{station}</b> will print here
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}