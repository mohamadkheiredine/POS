import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "TitanPOS — PIN Login",
  description: "Quick PIN sign-in for TitanPOS",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50">
      {/* BLOBS – SAME AS ORIGINAL */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-orange-300/30 blur-3xl"></div>

        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"></div>

        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-[40%] bg-amber-200/30 blur-2xl rotate-12"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
