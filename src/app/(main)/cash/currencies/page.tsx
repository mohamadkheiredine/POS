"use client";

import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";

type Currency = {
  id: number;
  storeId: number;
  companyId: number;
  currencyId: number;
  currencyCode: string;
  currencyName: string;
  rate: number;
  originalCurrency: string;
  isChanged?: boolean;
};

type MasterCurrency = {
  currency_id: number;
  currency_code: string;
  currency_name: string;
};

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const [allCurrencies, setAllCurrencies] = useState<MasterCurrency[]>([]);

  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | "">("");
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState("");
  const [rateValue, setRateValue] = useState<number>(1);

  const [editCurrencyId, setEditCurrencyId] = useState<number | null>(null);

  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const allowedCurrencyIds = useMemo(
    () => currencies.map((c) => c.currencyId),
    [currencies]
  );

  const openMenuForRow = (
    e: React.MouseEvent<HTMLButtonElement>,
    rowId: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // toggle close
    if (openActionId === rowId) {
      setOpenActionId(null);
      setMenuPos(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    setMenuPos({
      top: rect.bottom + 8,
      left: rect.right - 160,
    });

    setOpenActionId(rowId);
  };

  useEffect(() => {
    const close = () => {
      setOpenActionId(null);
      setMenuPos(null);
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  useEffect(() => {
    const fetchCurrencies = async () => {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/getallowedcurrencies`,
        {
          params: {
            user_id: localStorage.getItem("user_id"),
            g_hash: localStorage.getItem("g_hash"),
            company_id: localStorage.getItem("company_id"),
            store_id: localStorage.getItem("store_id"),
          },
        }
      );

      const mapped = response.data.allowed_currencies.map((c: any) => ({
        id: c.ac_id,
        storeId: c.ac_store_id,
        companyId: c.ac_company_id,
        currencyId: c.ac_currency_id,
        rate: c.ac_rate_to_original,
        currencyName: c.cc_currency_name,
        currencyCode: c.cc_currency_code,
        originalCurrency:
          c.ac_original_currency === 0
            ? localStorage.getItem("company_currency")
            : c.ac_original_currency,
      }));

      setCurrencies(mapped);
    };

    fetchCurrencies();
  }, []);

  const handleRateChange = (id: number, value: string) => {
    setCurrencies((prev) =>
      prev.map((currency) =>
        currency.id === id
          ? { ...currency, rate: Number(value), isChanged: true }
          : currency
      )
    );
  };

  const saveMultipleRates = async () => {
    setLoadingAll(true);

    const ac_ids = currencies.map((c) => c.id);
    const ac_rates = currencies.map((c) => c.rate);

    await axios.put(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/savecurrencyrate`,
      {
        user_id: localStorage.getItem("user_id"),
        g_hash: localStorage.getItem("g_hash"),
        ac_id: ac_ids,
        ac_rate_to_original: ac_rates,
      }
    );

    setLoadingAll(false);
    alert("All currency rates updated successfully!");
  };

  useEffect(() => {
    const fetchAllCurrencies = async () => {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_LINK}/request/api/getlistcurrency`,
        {
          user_id: localStorage.getItem("user_id"),
          g_hash: localStorage.getItem("g_hash"),
        }
      );

      setAllCurrencies(Object.values(res.data.currencies));
    };

    fetchAllCurrencies();

  }, []);

  const handleCurrencySelect = (currencyId: number) => {
    const selected = allCurrencies.find((c) => c.currency_id === currencyId);
    if (!selected) return;

    setSelectedCurrencyId(currencyId);
    setSelectedCurrencyCode(selected.currency_code);
  };

  const addAllowedCurrency = async () => {
    if (selectedCurrencyId === "" || allowedCurrencyIds.includes(Number(selectedCurrencyId))) {
      alert("Currency already allowed");
      return;
    }

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/add`,
      {
        user_id: localStorage.getItem("user_id"),
        g_hash: localStorage.getItem("g_hash"),
        store_id: localStorage.getItem("store_id"),
        company_id: localStorage.getItem("company_id"),
        ac_currency_id: selectedCurrencyId,
        ac_rate_to_original: rateValue,
      }
    );

    if (res.data.is_error) {
      alert(res.data.error_message);
      return;
    }

    const master = allCurrencies.find((c) => c.currency_id === selectedCurrencyId);

    setCurrencies((prev) => [
      ...prev,
      {
        id: res.data.ac_id ?? Date.now(),
        storeId: Number(localStorage.getItem("store_id")),
        companyId: Number(localStorage.getItem("company_id")),
        currencyId: selectedCurrencyId as number,
        currencyName: master?.currency_name || "",
        currencyCode: master?.currency_code || "",
        rate: rateValue,
        originalCurrency: localStorage.getItem("company_currency") || "",
      },
    ]);

    setShowAddPopup(false);
  };

  const editAllowedCurrency = async () => {
    if (!editCurrencyId) return;

    await axios.put(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/edit`,
      {
        user_id: localStorage.getItem("user_id"),
        g_hash: localStorage.getItem("g_hash"),
        ac_id: editCurrencyId,
        ac_rate_to_original: rateValue,
      }
    );

    setCurrencies((prev) =>
      prev.map((c) => (c.id === editCurrencyId ? { ...c, rate: rateValue } : c))
    );

    setShowEditPopup(false);
  };

  const handleDeleteCurrency = async (acId: number) => {
    const confirmed = confirm("Are you sure you want to delete this currency?");
    if (!confirmed) return;

    await axios.delete(
      `${process.env.NEXT_PUBLIC_API_LINK}/api/allowedcurrencies/delete`,
      {
        data: {
          user_id: localStorage.getItem("user_id"),
          g_hash: localStorage.getItem("g_hash"),
          ac_id: acId,
        },
      }
    );

    setCurrencies((prev) => prev.filter((c) => c.id !== acId));
  };

  return (
    <div className="p-6 bg-white">
      <h1 className="text-2xl font-semibold mb-1">Currencies</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage allowed currencies and update their exchange rates.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto p-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setSelectedCurrencyId("");
                setSelectedCurrencyCode("");
                setRateValue(1);
                setShowAddPopup(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold mr-3"
            >
              Add Currency
            </button>

            <button
              onClick={saveMultipleRates}
              disabled={loadingAll}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center disabled:opacity-50"
            >
              {loadingAll ? "Saving..." : "Save All Changed Rates"}
            </button>
          </div>

          <table className="w-full text-sm table-auto">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium w-2/6">
                  Currency
                </th>
                <th className="px-4 py-2 text-left font-medium w-1/6">Code</th>
                <th className="px-4 py-2 text-left font-medium w-2/6">
                  Exchange Rate
                </th>
                <th className="px-4 py-2 text-right font-medium w-1/6">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {currencies.map((currency) => (
                <tr key={currency.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {currency.currencyName}
                  </td>

                  <td className="px-4 py-2 text-gray-600">
                    {currency.currencyCode}
                  </td>

                  <td className="px-4 py-2">
                    <input
                      type="number"
                      name="ac_rate_to_original[]"
                      value={currency.rate}
                      onChange={(e) =>
                        handleRateChange(currency.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <input type="hidden" name="ac_id[]" value={currency.id} />
                  </td>

                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => openMenuForRow(e, currency.id)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 border border-gray-200"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currencies.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No currencies found.
            </div>
          )}
        </div>

        {openActionId !== null && menuPos && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setOpenActionId(null);
                setMenuPos(null);
              }}
            />

            <div
              className="fixed z-[9999] w-40 bg-white border border-gray-200 rounded-md shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                onClick={() => {
                  const row = currencies.find((c) => c.id === openActionId);
                  if (!row) return;

                  setEditCurrencyId(row.id);
                  setSelectedCurrencyCode(row.currencyCode);
                  setRateValue(row.rate);
                  setShowEditPopup(true);

                  setOpenActionId(null);
                  setMenuPos(null);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDeleteCurrency(openActionId);
                  setOpenActionId(null);
                  setMenuPos(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {showAddPopup && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-[420px]">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">
                  Add Currency
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Currency
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={selectedCurrencyId}
                    onChange={(e) =>
                      handleCurrencySelect(Number(e.target.value))
                    }
                  >
                    <option value="">Select currency</option>
                    {allCurrencies.map((c) => {
                      const isDisabled = allowedCurrencyIds.includes(
                        c.currency_id
                      );

                      return (
                        <option
                          key={c.currency_id}
                          value={c.currency_id}
                          disabled={isDisabled}
                        >
                          {c.currency_name}
                          {isDisabled ? " (Already added)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCurrencyCode}
                    className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Exchange Rate
                  </label>
                  <input
                    type="number"
                    value={rateValue}
                    onChange={(e) => setRateValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Enter rate"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddPopup(false)}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addAllowedCurrency}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditPopup && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-[420px]">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">
                  Edit Currency
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCurrencyCode}
                    className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Exchange Rate
                  </label>
                  <input
                    type="number"
                    value={rateValue}
                    onChange={(e) => setRateValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Enter rate"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditPopup(false)}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editAllowedCurrency}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md font-semibold"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
