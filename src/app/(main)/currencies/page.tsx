"use client";

import axios from "axios";
import { useEffect, useState } from "react";

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

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

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
          ? {
              ...currency,
              rate: Number(value),
              isChanged: true,
            }
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Currencies</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage allowed currencies and update their exchange rates.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto p-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={saveMultipleRates}
              disabled={loadingAll}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center disabled:opacity-50"
            >
              {loadingAll && (
                <svg
                  className="animate-spin h-4 w-4 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                  />
                </svg>
              )}
              {loadingAll ? "Saving..." : "Save All Changed Rates"}
            </button>
          </div>

          <table className="w-full text-sm table-auto">
  <thead className="bg-gray-50 text-gray-600">
    <tr>
      <th className="px-4 py-2 text-left font-medium w-1/3">Currency</th>
      <th className="px-4 py-2 text-left font-medium w-1/3">Code</th>
      <th className="px-4 py-2 text-left font-medium w-1/3">Exchange Rate</th>
    </tr>
  </thead>

  <tbody className="divide-y">
    {currencies.map((currency) => (
      <tr key={currency.id}>
        {/* Currency Name */}
        <td className="px-4 py-2 font-medium text-gray-800 w-1/3">
          {currency.currencyName}
        </td>

        {/* Currency Code */}
        <td className="px-4 py-2 text-gray-600 w-1/3">
          {currency.currencyCode}
        </td>

        {/* Exchange Rate */}
        <td className="px-4 py-2 w-1/3">
          <input
            type="number"
            name="ac_rate_to_original[]"
            value={currency.rate}
            onChange={(e) => handleRateChange(currency.id, e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input type="hidden" name="ac_id[]" value={currency.id} />
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
      </div>
    </div>
  );
}
