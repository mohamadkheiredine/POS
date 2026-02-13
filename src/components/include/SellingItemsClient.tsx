"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileSpreadsheet, FileText } from "lucide-react";
import "react-day-picker/dist/style.css";
import { DayPicker } from "react-day-picker";
import { useI18n } from "@/hooks/useI18n";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

type SellingItem = {
  mi_id: number;
  mi_item_name: string;
  category_name: string;
  total_qty: number;
  total_revenue: number;
  order_count: number;
  currency_code: string;
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
        {label}: {selected ? selected.toISOString().slice(0, 10) : "Select\u2026"}
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

export default function SellingItemsPage({ lang }: { lang: "en" | "fr" }) {
  const [items, setItems] = useState<SellingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const { t } = useI18n(lang);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const auth = useAppSelector((s) => s.auth.loginData);
  const g_hash = auth.g_hash;
  const user_id = auth.user_id;

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);

      try {
        const params: any = {
          g_hash,
          user_id,
          filter: dateFilter,
        };

        if (dateFilter === "daterange") {
          if (dateFrom) params.date_from = dateFrom.toISOString().slice(0, 10);
          if (dateTo) params.date_to = dateTo.toISOString().slice(0, 10);
        }

        const res = await api.get(
          process.env.NEXT_PUBLIC_API_LINK + "/api/orders/menuitems",
          { params },
        );

        if (res.data?.is_error === 0) {
          setItems(
            (res.data.lst_menu_items || []).map((o: any) => ({
              mi_id: o.mi_id,
              mi_item_name: o.mi_item_name,
              category_name: o.category_name ?? "",
              total_qty: Number(o.total_qty),
              total_revenue: Number(o.total_revenue),
              order_count: Number(o.order_count),
              currency_code: o.currency_code || "USD",
            })),
          );
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [dateFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((i) => {
      const name = (i.mi_item_name ?? "").toLowerCase();
      const cat = (i.category_name ?? "").toLowerCase();

      return name.includes(q) || cat.includes(q);
    });
  }, [items, search]);

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(
      filtered.map((i) => ({
        "Item Name": i.mi_item_name,
        Category: i.category_name,
        "Qty Sold": i.total_qty,
        Revenue: money(i.total_revenue, i.currency_code),
        "Number of Orders": i.order_count,
      })),
    );

    ws["!cols"] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Selling Items");
    writeFile(wb, "selling_items.xlsx");
  };

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Selling Items Report", 14, 15);

    const tableRows = filtered.map((i) => [
      i.mi_item_name,
      i.category_name,
      String(i.total_qty),
      money(i.total_revenue, i.currency_code),
      String(i.order_count),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Item Name", "Category", "Qty Sold", "Revenue", "Number of Orders"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [243, 114, 44] },
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
      },
    });

    doc.save("selling_items.pdf");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, dateFrom, dateTo]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {t.sellingItems.title}
            </h1>
            <p className="text-sm text-gray-600">{t.sellingItems.subtitle}</p>
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
            <option value="currentdate">Current Shift (Open &rarr; Close)</option>
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
                <th>{t.sellingItems.itemName}</th>
                <th>{t.sellingItems.category}</th>
                <th>{t.sellingItems.qtySold}</th>
                <th>{t.sellingItems.revenue}</th>
                <th>{t.sellingItems.orders}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="py-6 text-center" colSpan={5}>
                    {t.sellingItems.loading}
                  </td>
                </tr>
              )}

              {!loading &&
                paginated.map((i) => (
                  <tr key={i.mi_id} className="[&>td]:px-3 [&>td]:py-3">
                    <td className="font-semibold text-gray-900">
                      {i.mi_item_name}
                    </td>
                    <td>{i.category_name}</td>
                    <td className="font-semibold">{i.total_qty}</td>
                    <td className="font-semibold">
                      {money(i.total_revenue, i.currency_code)}
                    </td>
                    <td>{i.order_count}</td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    {t.sellingItems.noItems}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Prev
                </button>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
