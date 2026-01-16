"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileSpreadsheet, FileText } from "lucide-react";
import "react-day-picker/dist/style.css";
import { DayPicker } from "react-day-picker";
import axios from "axios";
import { useI18n } from "@/hooks/useI18n";
import { api } from "@/lib/api";
import { forceLogout } from "@/lib/logout";
import { Printer } from "lucide-react";

// ───────────────────────────────
// Types
// ───────────────────────────────
type Status = "open" | "in-progress" | "served" | "paid" | "void";

type Order = {
  id: number;
  code: string;
  warehouse: number;
  total: number;
  currencyCode: string;
  createdAt: string;
};

type DateFilter =
  | "today"
  | "currentdate"
  | "yesterday"
  | "lastweek"
  | "lastmonth"
  | "daterange";

// Utils
const money = (n: number, code: string) =>
  `${code} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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

export default function OrdersPage({ lang }: { lang: "en" | "fr" }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [receiptHTML, setReceiptHTML] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<{ open: boolean; order?: Order | null }>(
    { open: false, order: null }
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const { t } = useI18n(lang);

  // useEffect(() => {
  //   const token = localStorage.getItem("access_token");

  //   if (!token) {
  //     forceLogout("You are not logged in. Please login.");
  //   }
  // }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      try {
        const params: any = {
          g_hash: localStorage.getItem("g_hash"),
          user_id: localStorage.getItem("user_id"),
          filter: dateFilter,
        };

        if (dateFilter === "daterange") {
          if (dateFrom) params.date_from = dateFrom.toISOString().slice(0, 10);
          if (dateTo) params.date_to = dateTo.toISOString().slice(0, 10);
        }

        const res = await api.get(
          process.env.NEXT_PUBLIC_API_LINK + "/api/inventory/getlistoforders",
          { params }
        );

        if (res.data?.is_error === 0) {
          setOrders(
            res.data.lst_orders.map((o: any) => ({
              id: o.fo_id,
              code: o.fo_order_code,
              total: o.fo_total_amount,
              currencyCode: o.currency_code,
              warehouse: o.warehouse_id,
              createdAt: o.fo_order_datetime,
            }))
          );
        } else {
          setOrders([]);
        }
      } catch (e) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [dateFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();

    return orders.filter((o) => {
      const code = (o.code ?? "").toString().toLowerCase();
      const w = (o.warehouse ?? "").toString();

      return code.includes(t) || w.includes(t);
    });
  }, [orders, search]);

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(
      filtered.map((o) => ({
        Code: o.code,
        Total: money(o.total, o.currencyCode),
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
      money(o.total, o.currencyCode),
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

  const printOrder = async (order: Order) => {
    try {
      const res = await api.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/orders/reprintreceipt`,
        {
          params: {
            user_id: localStorage.getItem("user_id"),
            g_hash: localStorage.getItem("g_hash"),
            order_code: order.code,
          },
        }
      );

      if (res.data?.is_error === 0) {
        setReceiptHTML(res.data.receipt_html);
      } else {
        alert("Failed to load receipt");
      }
    } catch {
      alert("Print failed");
    }
  };

  const printReceipt = () => {
    if (!receiptHTML) return;

    const iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
    const doc = iframe.contentWindow?.document;

    doc?.open();
    doc?.write(`
    <html>
      <head>
        <style>
          body { font-family: Arial; }
          @page { margin: 0; }
        </style>
      </head>
      <body>${receiptHTML}</body>
    </html>
  `);
    doc?.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {t.orders.orders}
            </h1>
            <p className="text-sm text-gray-600">{t.orders.ordersList}</p>
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
          {/* Search */}
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search..."
              className="w-full rounded-2xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Date filter dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as DateFilter);
              if (e.target.value !== "daterange") {
                setDateFrom(undefined);
                setDateTo(undefined);
              }
            }}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="currentdate">Current Shift (Open → Close)</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="lastweek">Last Week</option>
            <option value="lastmonth">Last Month</option>
            <option value="daterange">Date Range</option>
          </select>

          {/* Date range pickers */}
          {dateFilter === "daterange" && (
            <div className="flex items-center gap-2">
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
          )}
        </div>

        {/* Table */}
        <div className="rounded-3xl bg-white shadow ring-1 ring-gray-200 overflow-x-auto">
          <table className="table-auto w-full border-collapse text-sm">
            <thead className="bg-white text-left text-gray-500">
              <tr className="[&>th]:py-3 [&>th]:px-3">
                <th>{t.orders.code}</th>
                <th>{t.orders.warehouse}</th>
                <th>{t.orders.total}</th>
                <th>{t.orders.created}</th>
                <th></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="py-6 text-center" colSpan={5}>
                    {t.orders.loading}
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((o) => (
                  <tr key={o.id} className="[&>td]:px-3 [&>td]:py-3">
                    <td className="font-semibold text-gray-900">{o.code}</td>
                    <td>{o.warehouse ?? 0}</td>
                    <td className="text-left font-semibold">
                      {money(o.total, o.currencyCode)}
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>

                    <td className="text-right">
                      <button
                        onClick={() => printOrder(o)}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-amber-600"
                        title="Print receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    {t.orders.noOrders}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receiptHTML && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-6 py-3">
              <h2 className="text-lg font-bold text-gray-900">
                Receipt Preview
              </h2>
              <button
                onClick={() => setReceiptHTML(null)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-5 max-h-[70vh] overflow-auto">
              <div
                className="receipt-preview"
                dangerouslySetInnerHTML={{ __html: receiptHTML }}
              />
            </div>

            {/* FOOTER */}
            <div className="border-t px-6 py-3 flex justify-end gap-2">
              <button
                onClick={() => setReceiptHTML(null)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Close
              </button>

              <button
                onClick={printReceipt}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-sm font-semibold text-white"
              >
                <Printer className="inline h-4 w-4 mr-1" />
                Print
              </button>
            </div>
          </div>

          {/* hidden iframe */}
          <iframe id="print-iframe" className="hidden" />
        </div>
      )}
    </div>
  );
}
