"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Select from "react-select";
import { SearchableMenuList } from "@/components/shared/searchableMenuList";
import { useRouter } from "next/navigation";

type BalanceRow = {
  id: string;
  currencyId: string;
  currencyCode: string;
  amount: string;
};
type CurrencyData = {
  currency_id: number;
  currency_code: string;
  currency_name?: string;
};

/* ---------- component ---------- */
export default function OpenShift() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);

  const router = useRouter();

  const GetListCurrencies = async () => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const url =
      process.env.NEXT_PUBLIC_API_LINK + "/request/api/getlistcurrency";

    try {
      const { data } = await axios.post(url, { user_id, g_hash });

      if (data.is_error === 1) {
        alert(data.error_message);
        return;
      }

      const rawCurrencies = Object.values(
        data.currencies || {}
      ) as CurrencyData[];

      const uniqueCurrencies: CurrencyData[] = [];
      const seenCodes = new Set<string>();

      for (const c of rawCurrencies) {
        if (!seenCodes.has(c.currency_code)) {
          seenCodes.add(c.currency_code);
          uniqueCurrencies.push(c);
        }
      }
      setCurrencies(uniqueCurrencies);

      setRows([
        {
          id: crypto.randomUUID(),
          currencyId: "",
          currencyCode: "",
          amount: "",
        },
      ]);
    } catch (err) {
      console.error("GetListCurrencies failed", err);
      setCurrencies([]);
      setRows([
        {
          id: crypto.randomUUID(),
          currencyId: "",
          currencyCode: "",
          amount: "",
        },
      ]);
    }
  };

  useEffect(() => {
    GetListCurrencies();
  }, []);

  // base currency defaults from localStorage (falls back to "USD")
  const defaultBase: any =
    (typeof window !== "undefined" &&
      localStorage.getItem("company_currency")) ||
    248;

  const [baseCurrency, setBaseCurrency] = useState<string>(defaultBase);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  /* ---------- derived ---------- */
  const currencyMap = useMemo(() => {
    const map: Record<string, CurrencyData> = {};
    currencies.forEach((c) => {
      map[String(c.currency_id)] = c;
    });
    return map;
  }, [currencies]);

  /* ---------- handlers ---------- */
  const updateRow = (id: string, patch: Partial<BalanceRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        currencyId: "",
        currencyCode: "",
        amount: "",
        rateToBase: "",
      },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev
    ); // keep at least one row

  const resetForm = () => {
    setNote("");
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        amount: "",
      }))
    );
  };

  const isValidNumber = (v: string) =>
    v !== "" && !isNaN(Number(v)) && Number(v) >= 0;

  const submitOpen = async () => {
    if (!rows.length) return;

    for (const r of rows) {
      if (!r.currencyId) {
        alert("Please select a currency for all rows.");
        return;
      }

      if (!isValidNumber(r.amount)) {
        alert("Opening amount must be a valid non-negative number.");
        return;
      }
    }

    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    const payload = {
      user_id,
      g_hash,
      note: note || "",
      currencies: rows.map((r) => ({
        currency_id: Number(r.currencyId),
        open_value: Number(r.amount),
      })),
    };

    setSubmitting(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_LINK}/api/shift/openshift`;
      const res = await axios.post(url, payload);

      if (res.data?.is_error === 1) {
        alert(res.data.error_message || "Failed to open session.");
        return;
      }

      alert("Cash drawer opened.");
      resetForm();
      router.replace("/pos");
    } catch (e) {
      alert("Network error. Could not open cash drawer.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- ui ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-fuchsia-50">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold leading-5">Open Cash Drawer</h1>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Base currency + note */}
        <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">
                Opening Note (optional)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="E.g., morning float, shift A…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Rows */}
        <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Opening Balances</div>
            <button
              onClick={addRow}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              + Add Currency
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm table-fixed">
              <thead className="bg-sky-50/70">
                <tr className="text-left">
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const currencyOptions = currencies
                    .filter((curr) => {
                      const usedCodes = new Set(
                        rows
                          .filter((x) => x.id !== r.id)
                          .map((x) => x.currencyCode)
                      );

                      return (
                        !usedCodes.has(curr.currency_code) ||
                        curr.currency_code === r.currencyCode
                      );
                    })
                    .map((curr) => ({
                      value: String(curr.currency_id),
                      label: `${curr.currency_code} - ${curr.currency_name}`,
                      currency_code: curr.currency_code,
                    }));

                  return (
                    <tr key={r.id} className="border-t border-black/5">
                      <td className="px-3 py-2 w-[40%]">
                        <Select
                          options={currencyOptions}
                          placeholder="-- Select Currency --"
                          isSearchable
                          closeMenuOnSelect
                          hideSelectedOptions={false}
                          components={{ MenuList: SearchableMenuList }}
                          menuPortalTarget={
                            typeof window !== "undefined" ? document.body : null
                          }
                          onChange={(option) => {
                            if (!option) return;

                            updateRow(r.id, {
                              currencyId: option.value,
                              currencyCode: option.currency_code,
                            });
                          }}
                          menuPosition="fixed"
                          styles={{
                            container: (base) => ({
                              ...base,
                              width: "100%",
                            }),

                            control: (base) => ({
                              ...base,
                              width: "100%",
                              minWidth: "100%",
                              maxWidth: "100%",
                              borderRadius: "12px",
                              minHeight: "44px",
                            }),

                            valueContainer: (base) => ({
                              ...base,
                              width: "100%",
                              overflow: "hidden",
                              flexWrap: "nowrap",
                            }),

                            input: (base) => ({
                              ...base,
                              width: "100%",
                              maxWidth: "100%",
                              minWidth: "100%",
                              margin: 0,
                              padding: 0,
                            }),

                            singleValue: (base) => ({
                              ...base,
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }),

                            menuPortal: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          inputMode="decimal"
                          className="w-[100%] rounded-xl border border-black/10 px-3 py-2 text-right"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={(e) =>
                            updateRow(r.id, { amount: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeRow(r.id)}
                          className="rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-50"
                          title="Remove row"
                        >
                          ✖
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td
                      className="px-3 py-10 text-center text-slate-500"
                      colSpan={5}
                    >
                      No currencies yet. Add one to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={resetForm}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            onClick={submitOpen}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Opening…" : "🔓 Open Drawer"}
          </button>
        </section>
      </main>
    </div>
  );
}
