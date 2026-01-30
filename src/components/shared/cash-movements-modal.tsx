"use client";

import React, { useRef } from "react";
import Modal from "@/components/shared/modal";

interface Account {
  aa_id: number;
  aa_account: string;
  aa_account_label: string;
}

interface Currency {
  currency_id: number;
  currency_code: string;
  currency_name: string;
}

interface Props {
  title: string;
  code: "in" | "out";
  accounts: Account[];
  currencies: Currency[];
  companyId: number;
  storeId: number;
  onClose: () => void;
  onSave: (payload: {
    code: "in" | "out";
    source_account: number;
    destination_account: number;
    amount: number;
    currency_id: number;
    description: string;
    company_id: number;
    store_id: number;
  }) => void;
}

export default function CashMovementModal({
  title,
  code,
  accounts,
  currencies,
  companyId,
  storeId,
  onClose,
  onSave,
}: Props) {
  const sourceRef = useRef<HTMLSelectElement>(null);
  const destinationRef = useRef<HTMLSelectElement>(null);
  const currencyRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const validate = () => {
    const source = sourceRef.current?.value;
    const destination = destinationRef.current?.value;
    const currency = currencyRef.current?.value;
    const amount = Number(amountRef.current?.value);

    if (!source || !destination) {
      alert("Please select source and destination accounts.");
      return false;
    }
    if (Number(source) === Number(destination)) {
      alert("Source and destination cannot be the same.");
      return false;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return false;
    }
    if (!currency) {
      alert("Please select a currency.");
      return false;
    }
    return true;
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!validate()) return;

          onSave({
            code,
            source_account: Number(sourceRef.current!.value),
            destination_account: Number(destinationRef.current!.value),
            amount: Number(amountRef.current!.value),
            currency_id: Number(currencyRef.current!.value),
            description: descriptionRef.current?.value || "",
            company_id: companyId,
            store_id: storeId,
          });

          onClose();
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-xs text-slate-500">Source Account</label>
          <select
            required
            ref={sourceRef}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
          >
            <option value="">Select source account</option>
            {accounts.map((acc) => (
              <option key={acc.aa_id} value={acc.aa_id}>
                {acc.aa_account} - {acc.aa_account_label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Destination Account</label>
          <select
            required
            ref={destinationRef}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
          >
            <option value="">Select destination account</option>
            {accounts.map((acc) => (
              <option key={acc.aa_id} value={acc.aa_id}>
                {acc.aa_account} - {acc.aa_account_label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500">Currency</label>
            <select
              required
              ref={currencyRef}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.currency_id} value={c.currency_id}>
                  {c.currency_code} - {c.currency_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-xs text-slate-500">Amount</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              ref={amountRef}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-right"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">Description</label>
          <textarea
            rows={3}
            ref={descriptionRef}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2"
          >
            Cancel
          </button>

          <button
            type="submit"
            className={`rounded-xl px-4 py-2 text-white ${
              code === "in"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {code === "in" ? "Save Credit" : "Save Debit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
