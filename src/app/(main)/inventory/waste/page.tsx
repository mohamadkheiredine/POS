"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useAppSelector } from "@/store/hooks";
import type { GridColDef } from "@mui/x-data-grid";
import { Search, FileSpreadsheet, FileText } from "lucide-react";

//by3mel load lal mui datagrid only in browser
//avoids the internal server error because datagrid uses browser API(windows document), this api do not exist on server side rendering
const DataGrid = dynamic(
  () => import("@mui/x-data-grid").then((mod) => mod.DataGrid),
  { ssr: false }
);

type WasteRow = {
  ws_id: number;
  fk_product_id: number;
  fk_stock_id: number;
  fk_warehouse_id: number;
  ws_quantity: number | string;
  ws_unit: number | null;
  ws_date: string;
  ws_created_by: number;
  ws_created_at: string;
  product?: { p_id: number; p_product_name: string } | null;
  warehouse?: { w_id: number; w_warehouse_name: string } | null;
  unit?: { su_id: number; su_unit_label: string; su_unit_code: string } | null;
};


type DatePreset = "all" | "today" | "yesterday" | "last_week" | "last_month" | "custom";

// bye5d date bl parameters wbrje3 Date part only in YYYY-MM-DD format
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: DatePreset): [string, string] {
  const today = new Date();
  switch (preset) {
    case "today":
      //both from and to are today's date
      return [toISO(today), toISO(today)];
    case "yesterday": {
      const y = new Date(today);
      //subtracts 1 day
      y.setDate(y.getDate() - 1);
      return [toISO(y), toISO(y)];
    }
    case "last_week": {
      const end = new Date(today);
      const start = new Date(today);
      // from 7 days ago
      start.setDate(start.getDate() - 7);
      return [toISO(start), toISO(end)];
    }
    case "last_month": {
      const end = new Date(today);
      const start = new Date(today);
      //from 30 days
      start.setDate(start.getDate() - 30);
      return [toISO(start), toISO(end)];
    }
    default:
      return ["", ""];
  }
}

export default function WastePage() {
  //records fetched from api
  const [rows, setRows] = useState<WasteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* filters */
  const [debouncedSearch, setDebouncedSearch] = useState(""); // only this triggers re-render
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  /* useRef stores the typed value without causing re-renders */
  const searchRef = useRef("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* called on every keystroke — updates the ref (no re-render), then schedules one state update */
  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      searchRef.current = e.target.value;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setDebouncedSearch(searchRef.current);
      }, 300);
    },
    []
  );

  /* when a preset is picked, compute the from/to dates */
  const onPresetChange = useCallback((value: DatePreset) => {
    setDatePreset(value);
    if (value !== "custom") {
      const [from, to] = getPresetRange(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const auth = useAppSelector((s) => s.auth.loginData);
  const g_hash = auth.g_hash;
  const user_id = auth.user_id;
  const warehouse_id = auth.warehouse_id;

  //fetch waste list
  useEffect(() => {
    if (!user_id || !g_hash) return;

    setLoading(true);
    setErrorMsg("");

    axios
      .get(
        process.env.NEXT_PUBLIC_API_LINK + "/request/api/getlistofwastes",
        { params: { user_id, g_hash, warehouse_id } }
      )
      .then((res) => {
        const data: WasteRow[] = res.data.data ?? [];
        setRows(data);
      })
      .catch(() => setErrorMsg("Failed to load waste records"))
      .finally(() => setLoading(false));
  }, [user_id, g_hash, warehouse_id]);

  /* extract unique warehouses for the filter dropdown */
  const warehouses = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach((r) => {
      if (r.warehouse) {
        map.set(r.warehouse.w_id, r.warehouse.w_warehouse_name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [rows]);

  /* apply client-side filters */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      /* product name search (uses debounced value so DataGrid doesn't re-render on every keystroke) */
      if (debouncedSearch) {
        const productName = r.product?.p_product_name ?? "";
        if (
          !productName.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
          return false;
      }

      /* date range */
      // if a from date is set and the row's date is before it, exclude the row
      if (dateFrom && r.ws_date < dateFrom) return false;
      // if a to date is set and the row's date is after it, exclude the row
      if (dateTo && r.ws_date > dateTo) return false;

      /* warehouse */
      if (warehouseFilter && r.fk_warehouse_id !== Number(warehouseFilter))
        return false;

      return true;
    });
  }, [rows, debouncedSearch, dateFrom, dateTo, warehouseFilter]);

  /* download a file from the API as a blob, then trigger browser download */
  const exportFile = useCallback(
    async (endpoint: string, filename: string) => {
      try {
        const res = await axios.get(
          process.env.NEXT_PUBLIC_API_LINK + endpoint,
          {
            params: {
              user_id,
              g_hash,
              warehouse_id: warehouseFilter || warehouse_id,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            },
            responseType: "blob",
          }
        );
        const blob = new Blob([res.data]);
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(href);
      } catch {
        alert("Export failed.");
      }
    },
    [user_id, g_hash, warehouse_id, warehouseFilter, dateFrom, dateTo]
  );

  /* DataGrid columns */
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "ws_id",
        headerName: "#",
        width: 70,
      },
      {
        field: "ws_date",
        headerName: "Date",
        width: 130,
      },
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value: any, row: any) =>
          row.product?.p_product_name ?? `Product #${row.fk_product_id}`,
      },
      {
        field: "ws_quantity",
        headerName: "Quantity",
        width: 120,
        type: "number",
        valueGetter: (_value: any, row: any) => Number(row.ws_quantity),
      },
      {
        field: "unit",
        headerName: "Unit",
        width: 100,
        valueGetter: (_value: any, row: any) =>
          row.unit?.su_unit_label ?? "—",
      },
      {
        field: "warehouse_name",
        headerName: "Warehouse",
        width: 160,
        valueGetter: (_value: any, row: any) =>
          row.warehouse?.w_warehouse_name ??
          `Warehouse #${row.fk_warehouse_id}`,
      },
    ],
    []
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-gray-900">
              Inventory · Wastes
            </h1>
            <p className="text-sm text-gray-600">
              Track wasted inventory stock
            </p>

            {loading && (
              <p className="mt-2 text-sm text-gray-500">
                Loading waste records…
              </p>
            )}

            {!!errorMsg && (
              <p className="mt-2 text-sm font-semibold text-rose-700">
                {errorMsg}
              </p>
            )}
          </div>

          {/* export buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                exportFile(
                  "/request/api/downloadwasteexcel",
                  `waste_${toISO(new Date())}.xlsx`
                )
              }
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={() =>
                exportFile(
                  "/request/api/downloadwastepdf",
                  `waste_${toISO(new Date())}.pdf`
                )
              }
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* product search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              onChange={onSearchChange}
              placeholder="Search product…"
              className="w-64 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* date preset */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Period</label>
            <select
              value={datePreset}
              onChange={(e) => onPresetChange(e.target.value as DatePreset)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_week">Last 7 Days</option>
              <option value="last_month">Last 30 Days</option>
              <option value="custom">Date Range</option>
            </select>
          </div>

          {/* custom date inputs — only visible when "Date Range" is selected */}
          {datePreset === "custom" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {/* warehouse filter */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Warehouse
            </label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm"
          style={{ height: 631 }}
        >
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row: any) => row.ws_id}
            loading={loading}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: "none",
              fontFamily: "inherit",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f9fafb",
              },
              "& .MuiDataGrid-cell": {
                fontSize: "0.875rem",
              },
            }}
          />
        </div>

        <p className="text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-semibold">TitanPOS&reg;</span>
        </p>
      </div>
    </div>
  );
}
