"use client";

import React, { useEffect, useState } from "react";
import { Search, Filter, Plus, X, CheckCircle2 } from "lucide-react";
import CustomerCard from "@/components/shared/customer-card";
import axios from "axios";
import { api } from "@/lib/api";
import { forceLogout } from "@/lib/logout";

/* ─────────────────────────────────────────
 * Types
 * ───────────────────────────────────────── */
type UID = number;
type CustomerType = "Dine-in" | "Takeaway" | "Delivery";

type Customer = {
  id: UID;
  accountNumber?: number;
  customerCode?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type: CustomerType;
  company?: string;
  loyaltyPoints?: number;
  active: number;
  website: string;
  hobbies: string;
  birthDate: string;
  favoriteFoods?: string;
  workTitle?: string;
  sports?: string;
};

/* ─────────────────────────────────────────
 * Page
 * ───────────────────────────────────────── */
export default function POSCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  //filter 7asab type of customer
  const [filter, setFilter] = useState<"All" | CustomerType>("All");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{
    open: boolean;
    customer?: Customer | null;
  }>({ open: false });

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      forceLogout("You are not logged in. Please login.");
    }
  }, []);

  const getCustomers = async () => {
    try {
      const { data } = await api.get(
        process.env.NEXT_PUBLIC_API_LINK + "/request/api/listcustomers",
        {
          params: {
            user_id: localStorage.getItem("user_id"),
            g_hash: localStorage.getItem("g_hash"),
            searchquery: search,
            customer_type: filter === "All" ? "" : filter.toLowerCase(),
            current_page: 1,
          },
        }
      );

      if (data.is_error === 1) return;

      const mapped = data.customers_array.map((c: any) => ({
        id: c.ic_id,
        name: c.ic_customer_name,
        email: c.ic_customer_email,
        phone: c.ic_customer_phone,
        address: c.ic_customer_address,
        type:
          c.ic_customer_type === "dine_in"
            ? "Dine-in"
            : c.ic_customer_type === "takeaway"
            ? "Takeaway"
            : "Delivery",
        company: "",
        loyaltyPoints: c.ic_loyality_point ?? 0,
        active: c.ic_is_active === 1 ? 1 : 0,
        website: c.ic_customer_website,
        hobbies: c.ic_hobbies,
        birthDate: c.ic_birth_date,
        // favoriteFoods: c.ic_favorite_foods,
        // workTitle: c.ic_work_title,
        // sports: c.ic_sports,
      }));

      setCustomers(mapped);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getCustomers();
  }, [filter, search]);

  // treka mtl ma heye
  const startNew = () => {
    setDrawer({
      open: true,
      customer: {
        id: 0,
        name: "",
        phone: "",
        email: "",
        address: "",
        type: "Dine-in",
        company: "",
        loyaltyPoints: 0,
        active: 1,
        website: "",
        hobbies: "",
        birthDate: "",
        favoriteFoods: "",
        workTitle: "",
        sports: "",
      },
    });
  };

  // here should get the customer using api
  const startEdit = async (c: Customer) => {
    try {
      const { data } = await api.get(
        process.env.NEXT_PUBLIC_API_LINK + "/request/api/getcustomerinfo",
        {
          params: {
            user_id: localStorage.getItem("user_id"),
            g_hash: localStorage.getItem("g_hash"),
            customer_id: c.id,
          },
        }
      );

      if (data.is_error === 1) return;

      const info = data.customer_info;

      const mapped: Customer = {
        id: info.ic_id,
        name: info.ic_customer_name,
        email: info.ic_customer_email,
        phone: info.ic_customer_phone,
        address: info.ic_customer_address,
        type:
          info.ic_customer_type === "dine_in"
            ? "Dine-in"
            : info.ic_customer_type === "takeaway"
            ? "Takeaway"
            : "Delivery",
        company: "",
        loyaltyPoints: info.ic_loyality_point ?? 0,
        active: info.ic_is_active === 1 ? 1 : 0,
        website: info.ic_customer_website,
        hobbies: info.ic_hobbies,
        birthDate: info.ic_birth_date,
        // favoriteFoods: info.ic_favorite_foods,
        // workTitle: info.ic_work_title,
        // sports: info.ic_sports,
      };

      setDrawer({ open: true, customer: mapped });
    } catch (err) {
      console.error(err);
    }
  };

  const saveCustomer = async (c: Customer) => {
    await api.post(
      process.env.NEXT_PUBLIC_API_LINK + "/request/api/savecustomer",
      {
        user_id: localStorage.getItem("user_id"),
        g_hash: localStorage.getItem("g_hash"),

        customer_id: c.id,
        ic_customer_name: c.name,
        ic_customer_address: c.address,
        ic_customer_email: c.email,
        ic_customer_website: c.website,
        ic_customer_phone: c.phone,
        ic_customer_mobile: c.phone,
        ic_hobbies: c.hobbies,
        ic_birth_date: c.birthDate,
        // ic_favorite_foods: c.favoriteFoods,
        // ic_work_title: c.workTitle,
        // ic_sports: c.sports,
        ic_is_active: c.active,
        ic_customer_type:
          c.type === "Dine-in"
            ? "dine_in"
            : c.type === "Takeaway"
            ? "takeaway"
            : "delivery",
        ic_loyality_point: c.loyaltyPoints,
      }
    );

    setDrawer({ open: false, customer: null });

    // reload
    getCustomers();
  };

  const deleteCustomer = async (id: number) => {
    await api.post(
      process.env.NEXT_PUBLIC_API_LINK + "/request/api/deletecustomers",
      {
        user_id: localStorage.getItem("user_id"),
        g_hash: localStorage.getItem("g_hash"),
        customer_id: id,
      }
    );

    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">POS · F&B</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Customers
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              Manage dine-in, takeaway, and delivery customers.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Customer
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-80 rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-2xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm"
              >
                {["All", "Dine-in", "Takeaway", "Delivery"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              startEdit={startEdit}
              deleteCustomer={deleteCustomer}
            />
          ))}

          {customers.length === 0 && (
            <div className="col-span-full grid h-48 place-items-center rounded-3xl border border-dashed border-gray-200 bg-white/60 text-sm text-gray-500">
              No customers found…
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold">TitanPOS®</span> — F&B Customers
        </p>
      </div>

      {/* Drawer */}
      {drawer.open && drawer.customer && (
        <CustomerDrawer
          customer={drawer.customer}
          onClose={() => setDrawer({ open: false })}
          onSave={saveCustomer}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
 * Customer Drawer (Add/Edit)
 * ───────────────────────────────────────── */
function CustomerDrawer({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>(() => ({ ...customer }));

  const set = (patch: Partial<Customer>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="font-bold text-gray-900">
            {customer.name ? `Edit ${customer.name}` : "New Customer"}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs text-gray-600">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Phone</label>
              <input
                value={form.phone || ""}
                onChange={(e) => set({ phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Email</label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => set({ email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Address</label>
            <textarea
              rows={2}
              value={form.address || ""}
              onChange={(e) => set({ address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <select
                value={form.type}
                onChange={(e) => set({ type: e.target.value as CustomerType })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                {["Dine-in", "Takeaway", "Delivery"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Company</label>
              <input
                value={form.company || ""}
                onChange={(e) => set({ company: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Loyalty Points</label>
            <input
              type="number"
              value={form.loyaltyPoints ?? 0}
              onChange={(e) =>
                set({ loyaltyPoints: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => set({ active: e.target.checked ? 1 : 0 })}
            />
            Active Customer
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!canSave}
              onClick={() => onSave(form)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
