"use client";

import React, { useState, useRef } from "react";

export type ComboOption = { value: number; label: string };

export function ComboBox({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  error,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: ComboOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const filtered = q.trim()
    ? options.filter((o) => (o.label ?? "").toLowerCase().includes(q.toLowerCase()))
    : options;

  const handleSelect = (v: number | null) => {
    onChange(v);
    setQ("");
    setOpen(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQ("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); inputRef.current?.blur(); }
    if (e.key === "Enter" && filtered.length === 1) { handleSelect(filtered[0].value); e.preventDefault(); }
  };

  const cls = `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-4 ${
    error
      ? "border-red-400 focus:ring-red-100"
      : "border-gray-200 focus:border-orange-400 focus:ring-orange-100"
  } ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "bg-white"}`;

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        ref={inputRef}
        value={open ? q : selectedLabel}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(""); setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cls}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                  value === o.value ? "bg-orange-50 font-semibold text-orange-700" : "text-gray-800"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
