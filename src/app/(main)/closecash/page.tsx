"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

type BalanceRow = {
  id: string;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  openValue: number;
  expectedValue: number;
  counted: string;
};

export default function CloseShift() {
  const API_LINK = process.env.NEXT_PUBLIC_API_LINK;

  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  const resetForm = () => {
    setNote("");
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        counted: "",
        expected: "",
      }))
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev
    );
  };

  const submitClose = async () => {
    if (!rows.length) return;

    for (const r of rows) {
      if (!r.currencyId) {
        alert("Choose a currency for all rows.");
        return;
      }
      if (!r.counted || isNaN(Number(r.counted))) {
        alert("Enter a valid counted for all rows.");
        return;
      }
    }

    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    if (!user_id || !g_hash) {
      alert("Missing user_id or g_hash. Please login again.");
      return;
    }

    const closing_cash: Record<string, number> = {};
    rows.forEach((r) => {
      closing_cash[String(Number(r.currencyId))] = Number(r.counted);
    });

    const expected_cash: Record<string, number> = {};
    rows.forEach((r) => {
      expected_cash[String(Number(r.currencyId))] = Number(
        r.expectedValue || 0
      );
    });

    const payload = {
      user_id,
      g_hash,
      closing_cash,
      expected: expected_cash,
      notes: note || "",
    };

    setSubmitting(true);
    try {
      const url = `${API_LINK}/api/shift/closeshift`;
      const res = await axios.post(url, payload);

      if (res.data?.is_error === 1) {
        alert(
          res.data.error_msg ||
            res.data.error_message ||
            "Failed to close shift."
        );
        return;
      }

      alert("Shift closed successfully.");
      resetForm();
      router.replace('/pos');
    } catch (e) {
      alert("Network error. Could not close cash drawer.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOpenCurrencies = async () => {
    const user_id = localStorage.getItem("user_id");
    const g_hash = localStorage.getItem("g_hash");

    if (!user_id || !g_hash) {
      alert("Missing user session. Please login again.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.get(`${API_LINK}/api/shift/getopencurrencies`, {
        params: {
          user_id,
          g_hash,
        },
      });

      if (res.data?.is_error === 1) {
        alert(res.data.error_msg || "No open shift found");
        return;
      }

      const rowsFromApi = res.data.data.map((c: any) => ({
        id: crypto.randomUUID(),
        currencyId: String(c.currency_id),
        currencyCode: c.currency_code,
        currencyName: c.currency_name,
        openValue: Number(c.open_value),
        expectedValue: Number(c.expected_value),
        counted: "",
      }));

      setRows(rowsFromApi);
    } catch (e) {
      console.error(e);
      alert("Failed to load open currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOpenCurrencies();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow">
            🧮
          </div>
          <div>
            <h1 className="text-lg font-bold leading-5">Close Cash Drawer</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">
                Closing Note (optional)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="E.g., end of day, shift B…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {loading && (
            <div className="text-xs text-slate-500">Loading currencies…</div>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Closing Balances</div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-sky-50/70">
                <tr className="text-left">
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Open</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Counted</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  return (
                    <tr key={r.id} className="border-t border-black/5">
                      <td className="px-3 py-2 font-medium">
                        {r.currencyCode} – {r.currencyName}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-xl border border-black/10 px-3 py-2 text-right bg-slate-50"
                          value={r.openValue.toFixed(2)}
                          readOnly
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-xl border border-black/10 px-3 py-2 text-right bg-slate-50"
                          value={r.expectedValue.toFixed(2)}
                          readOnly
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          inputMode="decimal"
                          className="w-full rounded-xl border border-black/10 px-3 py-2 text-right"
                          placeholder="0.00"
                          value={r.counted}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id
                                  ? { ...x, counted: e.target.value }
                                  : x
                              )
                            )
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
                      colSpan={3}
                    >
                      No currencies yet. Add one to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={resetForm}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>

          <button
            onClick={submitClose}
            disabled={submitting}
            className="rounded-xl bg-rose-600 px-6 py-2 font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? "Closing…" : "🔒 Close Drawer"}
          </button>
        </section>
      </main>
    </div>
  );
}
