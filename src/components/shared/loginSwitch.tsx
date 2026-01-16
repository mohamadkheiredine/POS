"use client";

import { usePathname, useRouter } from "next/navigation";

export default function LoginSwitch() {
  const pathname = usePathname();
  const router = useRouter();

  const isPin = pathname === "/pin";

  return (
    <div className="mt-6 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-2 py-2 shadow-sm backdrop-blur">
        {/* LEFT OPTION */}
        <button
          onClick={() => router.push("/login")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition
            ${
              !isPin
                ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          Credentials
        </button>

        {/* RIGHT OPTION */}
        <button
          onClick={() => router.push("/pin")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition
            ${
              isPin
                ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          PIN
        </button>
      </div>
    </div>
  );
}
