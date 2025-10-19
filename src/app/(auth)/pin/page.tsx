"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

const PIN_LENGTH = 6;

export default function PinLoginPage() {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input so keyboard works
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

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
      // TODO: Replace with your API call, e.g. await loginWithPin(pin);
      await new Promise((r) => setTimeout(r, 700));
      console.log("PIN login:", pin);
      // router.push("/floor") or wherever
    } catch (e) {
      setError("Invalid PIN. Try again.");
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
            Quick sign-in
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter your 6-digit staff PIN.
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
                  ${filled ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-400"}
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
                    ${isAction
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
              {isSubmitting ? "Checking…" : "Let’s go"}
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-300/40 blur-xl opacity-0 transition group-hover:opacity-100"></span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="font-semibold">TitanPOS®</span> — All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}