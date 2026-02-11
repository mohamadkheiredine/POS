"use client";
import { useRef, useState } from "react";

export default function BufferedInput({
  value,
  onCommit,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur"> & {
  value: string | number;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  const prev = useRef(value);

  // sync from parent only when the source value genuinely changed
  if (value !== prev.current) {
    prev.current = value;
    setLocal(String(value ?? ""));
  }

  return (
    <input
      {...props}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}
