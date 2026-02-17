"use client";

import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";

import React, { useEffect, useRef, useState } from "react";
import { setAuth } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";

const PIN_LENGTH = 5;

export default function PinTerraceLoginPage() {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus the hidden input so keyboard works
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const dispatch = useAppDispatch();

  const push = (d: string) => {
    setError("");
    setPin((prev) => (prev.length < PIN_LENGTH ? prev + d : prev));
  };

  const pop = () => setPin((prev) => prev.slice(0, -1));
  const clearAll = () => setPin("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    if (/^\d$/.test(key)) {
      e.preventDefault();
      push(key);
    } else if (key === "Backspace") {
      e.preventDefault();
      pop();
    } else if (key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const onSubmit = async () => {
    if (pin.length !== PIN_LENGTH) {
      setError(`Enter ${PIN_LENGTH}-digit PIN.`);
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const url = `${process.env.NEXT_PUBLIC_API_LINK}/request/api/loginposbypin`;
      const res = await axios.post(url, { pin });

      if (res.data?.is_error) {
        setError(res.data.error_message || "Invalid PIN. Try again.");
        return;
      }

      const data = res.data;

      const loginData = {
        g_hash: data.g_hash ?? "",

        user_id: String(data.user_id ?? ""),
        user_profile_url: data.user_profile_url ?? null,
        user_fullname: data.user_fullname ?? null,
        user_email: data.user_email ?? null,
        user_name: data.user_name ?? null,

        company_currency: String(data.company_currency ?? ""),
        currency_symbol: String(data.currency_symbol ?? ""),

        sec_currency_id: String(data.sec_currency_id ?? ""),
        sec_currency_symbol: String(data.sec_currency_symbol ?? ""),

        warehouse_id: String(data.warehouse_id ?? ""),
        exchange_rate: String(data.exchange_rate ?? ""),

        store_id: String(data.store_id ?? ""),
        company_id: String(data.company_id ?? ""),

        allowed_currencies: Array.isArray(data.allowed_currencies)
          ? data.allowed_currencies
          : [],
      };

      dispatch(setAuth(loginData));

      router.push("/terrace");
    } catch {
      setError("Login failed. Try again.");
    } finally {
      setIsSubmitting(false);
      clearAll();
      hiddenInputRef.current?.focus();
    }
  };

  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["C", "0", "⌫"],
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-300/30 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-[40%] bg-amber-200/30 blur-2xl rotate-12"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mx-auto overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(17,24,39,0.18)] ring-1 ring-white/60">
            {/* header */}
            <div className="flex items-center gap-3 px-8 pt-8">
              <Image
                src="/images/logo.png"
                alt="TitanPOS"
                width={180}
                height={52}
                priority
                className="drop-shadow-sm"
              />
            </div>

            <div className="px-8 pb-8 pt-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                Terrace Sign-in
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Enter your {PIN_LENGTH}-digit staff PIN.
              </p>

              {/* hidden input to capture keyboard */}
              <input
                ref={hiddenInputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                className="sr-only"
                onKeyDown={handleKeyDown}
                aria-hidden="true"
              />

              {/* PIN dots */}
              <div
                onClick={() => hiddenInputRef.current?.focus()}
                className="mt-6 flex justify-center gap-3"
                role="group"
                aria-label="PIN digits"
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                  const filled = i < pin.length;
                  return (
                    <div
                      key={i}
                      className={`h-12 w-12 rounded-2xl border text-center text-xl font-semibold leading-[48px] transition
                      ${
                        filled
                          ? "border-orange-400 bg-orange-50 text-orange-600"
                          : "border-gray-200 bg-white text-gray-400"
                      }
                      `}
                    >
                      {filled ? "•" : "–"}
                    </div>
                  );
                })}
              </div>

              {/* error */}
              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              {/* keypad */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {keypad.flat().map((k) => {
                  const isAction = k === "C" || k === "⌫";
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === "C") return clearAll();
                        if (k === "⌫") return pop();
                        push(k);
                      }}
                      className={`h-14 rounded-2xl border text-lg font-semibold shadow-sm transition active:scale-[0.98]
                        ${
                          isAction
                            ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            : "border-gray-200 bg-white text-gray-900 hover:bg-orange-50"
                        }`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>

              {/* actions */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:brightness-105 disabled:opacity-60"
                >
                  {isSubmitting ? "Checking…" : "Let's go"}
                  <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
                </button>
              </div>

              <p className="mt-6 text-center text-xs text-gray-500">
                © {new Date().getFullYear()}{" "}
                <span className="font-semibold">TitanPOS®</span> — All rights
                reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
