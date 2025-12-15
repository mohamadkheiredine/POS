"use client";

import { Home, ArrowLeft, MapPinOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[radial-gradient(1200px_800px_at_50%_-10%,#ffffff,rgba(255,122,0,0.25)_30%,rgba(0,166,166,0.18)_70%,#ffffff_100%)]">

      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/images/logo.png"
          width={170}
          height={60}
          alt="TitanPOS Logo"
          className="drop-shadow-sm"
        />
      </div>

      {/* Icon */}
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-orange-100 border border-orange-200 mb-5">
        <MapPinOff className="w-14 h-14 text-orange-600" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
        Page Not Found
      </h1>

      {/* Subtitle */}
      <p className="text-gray-600 text-sm max-w-md mb-6">
        The page you’re looking for doesn’t exist or may have been moved.
        Let’s get you back on track!
      </p>

      {/* Buttons */}
      <div className="flex gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow hover:brightness-110 transition"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>

        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold shadow hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>

      {/* Footer Note */}
      <p className="text-xs text-gray-400 mt-6">
        Error Code: 404 — Not Found
      </p>
    </div>
  );
}