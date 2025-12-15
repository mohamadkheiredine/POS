"use client";

import { useEffect } from "react";
import { RefreshCcw, Home, AlertTriangle } from "lucide-react";
import Image from "next/image";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🔥 Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(1200px_800px_at_50%_-10%,#ffffff,rgba(255,122,0,0.25)_35%,rgba(0,166,166,0.18)_75%,#ffffff_100%)] px-6">
      
      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/images/logo.png"
          width={170}
          height={60}
          alt="TitanPOS"
          className="drop-shadow-sm"
        />
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-orange-100 border border-orange-200 mb-5">
        <AlertTriangle className="w-14 h-14 text-orange-600" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
        Oops! Something went wrong 😓
      </h1>

      {/* Subtitle */}
      <p className="text-gray-600 text-center max-w-lg mb-6">
        A server error occurred while processing your request.  
        Don’t worry — this isn’t your fault.  
        You can try refreshing the page or return to the dashboard.
      </p>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow hover:brightness-110 transition"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>

        <a href="/login" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold shadow hover:bg-gray-50 transition">
          <Home className="w-4 h-4" />
          Back to Home
        </a>
      </div>

      {/* Error digest (for debugging) */}
      <p className="text-xs text-gray-400 mt-6">
        Error Code: {error?.digest || "500"}
      </p>
    </div>
  );
}