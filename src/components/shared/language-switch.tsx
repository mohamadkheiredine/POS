"use client";

import Cookies from "js-cookie";
import { useEffect, useState } from "react";

export default function LanguageSwitch() {
  const [active, setActive] = useState<"en" | "fr">("en");

  useEffect(() => {
    const saved = Cookies.get("lang") as "en" | "fr" | undefined;
    if (saved) setActive(saved);
  }, []);

  const setLang = (lang: "en" | "fr") => {
    Cookies.set("lang", lang, { expires: 365, sameSite: "lax" });
    setActive(lang);
    window.location.reload();
  };

  return (
    <div className="inline-flex items-center rounded-full bg-white/70 p-1 shadow-md ring-1 ring-black/5 backdrop-blur-md">
      <button
        onClick={() => setLang("en")}
        className={`px-4 py-1.5 text-sm font-semibold transition-all duration-200
          ${
            active === "en"
              ? "rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow"
              : "text-gray-600 hover:text-gray-900"
          }`}
      >
        EN
      </button>

      <button
        onClick={() => setLang("fr")}
        className={`px-4 py-1.5 text-sm font-semibold transition-all duration-200
          ${
            active === "fr"
              ? "rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow"
              : "text-gray-600 hover:text-gray-900"
          }`}
      >
        FR
      </button>
    </div>
  );
}
