"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Edit3,
  Eye,
  Trash2,
  Download,
  X,
  CheckCircle2,
  Printer,
} from "lucide-react";
import "react-day-picker/dist/style.css";
import { DayPicker } from "react-day-picker";
import axios from "axios";

// ───────────────────────────────
// Types
// ───────────────────────────────
type Status = "open" | "in-progress" | "served" | "paid" | "void";

type Order = {
  id: number;
  code: string;
  warehouse: number;
  total: number;
  createdAt: string;
};

// Utils
const money = (n: number) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// ───────────────────────────────
// Page
// ───────────────────────────────

function DatePopup({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected?: Date;
  onSelect: (d?: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
      >
        {label}: {selected ? selected.toISOString().slice(0, 10) : "Select…"}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 rounded-xl border bg-white shadow-lg p-2">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onSelect(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [drawer, setDrawer] = useState<{ open: boolean; order?: Order | null }>(
    { open: false, order: null }
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const params: any = {
          g_hash: localStorage.getItem("g_hash"),
          user_id: localStorage.getItem("user_id"),
        };

        if (dateFrom) {
          params.date_from = dateFrom.toISOString().slice(0, 10); // YYYY-MM-DD
        }
        if (dateTo) {
          params.date_to = dateTo.toISOString().slice(0, 10);
        }

        const res = await axios.get(
          process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistoforders",
          { params }
        );

        if (res.data?.is_error === 0) {
          setOrders(
            res.data.lst_orders.map((o: any) => ({
              id: o.fo_id,
              code: o.fo_order_code,
              total: o.fo_total_amount,
              warehouse: o.warehouse_id,
              createdAt: o.fo_order_datetime,
            }))
          );
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Fetch orders error:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();

    return orders.filter((o) => {
      const w = String(o.warehouse ?? 0);
      return o.code.toLowerCase().includes(t) || w.includes(t);
    });
  }, [orders, search]);

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(
      filtered.map((o) => ({
        Code: o.code,
        Total: money(o.total),
        Warehouse: o.warehouse,
        Created: new Date(o.createdAt).toLocaleString(),
      }))
    );

    ws["!cols"] = [
      { wch: 12 }, // Code
      { wch: 12 }, // Warehouse
      { wch: 12 }, // Total
      { wch: 25 }, // Created
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Orders");
    writeFile(wb, "orders.xlsx");
  };

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Orders Report", 14, 15);

    const tableRows = filtered.map((o) => [
      o.code,
      o.warehouse ?? "",
      money(o.total),
      new Date(o.createdAt).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Code", "Warehouse", "Total", "Created"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [243, 114, 44] }, // orange header
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 70 },
      },
    });

    doc.save("orders.pdf");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-600">List of restaurant orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <DatePopup
            label="From"
            selected={dateFrom}
            onSelect={(d) => setDateFrom(d)}
          />

          <DatePopup
            label="To"
            selected={dateTo}
            onSelect={(d) => setDateTo(d)}
          />
        </div>

        {/* Table */}
        <div className="rounded-3xl bg-white shadow ring-1 ring-gray-200 overflow-x-auto">
          <table className="table-auto w-full border-collapse text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>Code</th>
                <th>Warehouse</th>
                <th>Total</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="py-6 text-center" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((o) => (
                  <tr key={o.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td className="font-semibold text-gray-900">{o.code}</td>
                    <td>{o.warehouse ?? 0}</td>
                    <td className="text-left font-semibold">
                      {money(o.total)}
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No orders found…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
