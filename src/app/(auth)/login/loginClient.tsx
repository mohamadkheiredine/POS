"use client";

import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import LanguageSwitch from "@/components/shared/language-switch";
import { useI18n } from "@/hooks/useI18n";
import LoginSwitch from "@/components/shared/loginSwitch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuth } from "@/store/slices/authSlice";

export default function LoginClient({ lang }: { lang: "en" | "fr" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const { t } = useI18n(lang);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((s) => s.auth.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/pos");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const user_id = localStorage.getItem("user_id");
    if (user_id != undefined) {
      router.push("/pos");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t.login.required);
      return;
    }
    setError("");

    try {
      const response = await axios.post(
        process.env.NEXT_PUBLIC_API_LINK + "/request/api/login",
        {
          user_name: username,
          password: password,
          ua_remember: false,
        },
      );

      const data = response.data;

      // save data in local storage
      // localStorage.setItem("user_id", data.user_id);
      // localStorage.setItem("user_profile_url", data.user_profile_url);
      // localStorage.setItem("user_fullname", data.user_fullname);
      // localStorage.setItem("user_email", data.user_email);
      // localStorage.setItem("user_name", data.user_name);
      // localStorage.setItem("company_currency", data.company_currency);
      // localStorage.setItem("currency_symbol", data.currency_symbol);
      // localStorage.setItem("sec_company_currency", data.sec_currency_id);
      // localStorage.setItem("sec_currency_symbol", data.sec_currency_symbol);
      // localStorage.setItem("warehouse_id", data.warehouse_id);
      // localStorage.setItem("exchange_rate", data.exchange_rate);
      // localStorage.setItem("g_hash", data.g_hash);
      // localStorage.setItem("store_id", data.store_id);
      // localStorage.setItem("company_id", data.company_id);

      // localStorage.setItem("access_token", data.access_token);
      // localStorage.setItem("expires_in", String(data.expires_in));

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

      router.push("/pos");
  
    } catch (error) {
      console.log("Login error", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="relative mx-auto overflow-hidden rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(17,24,39,0.18)] ring-1 ring-white/60">
        {/* Accent ribbon */}
        <LoginSwitch />

        {/* Header */}
        <div className="relative flex items-center gap-3 px-8 pt-8">
          <Image
            src="/images/logo.png"
            alt="TitanPOS"
            width={180}
            height={52}
            priority
            className="drop-shadow-sm"
          />
          <LanguageSwitch />
        </div>

        <div className="relative px-8 pb-8 pt-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {t.login.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{t.login.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Username (floating label) */}
            <div className="group relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {/* user icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 12a5 5 0 100-10 5 5 0 000 10zM4 20a8 8 0 1116 0v1H4v-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" " /* required for floating */
                className="peer w-full rounded-2xl border border-gray-200 bg-white/80 pl-12 pr-4 py-3 text-gray-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <label
                className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 bg-transparent px-1 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-gray-500
                     peer-focus:-top-2.5 peer-focus:left-10 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-orange-600 peer-placeholder-shown:-translate-y-1/2 peer-focus:translate-y-0"
              >
                {t.login.username}
              </label>
            </div>

            {/* Password (floating + toggle) */}
            <div className="group relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {/* lock icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M17 11V8a5 5 0 10-10 0v3M5 11h14v9H5v-9z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer w-full rounded-2xl border border-gray-200 bg-white/80 pl-12 pr-12 py-3 text-gray-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <label
                className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 bg-transparent px-1 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-gray-500
                     peer-focus:-top-2.5 peer-focus:left-10 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-orange-600 peer-placeholder-shown:-translate-y-1/2 peer-focus:translate-y-0"
              >
                {t.login.password}
              </label>
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-2 my-auto rounded-xl px-3 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-50"
              >
                {show ? t.login.hide : t.login.show}
              </button>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                {t.login.remember}
              </label>
            </div>

            {/* Glossy CTA */}
            <button
              type="submit"
              className="group relative mt-1 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-amber-500 px-6 py-3 font-semibold text-white shadow-xl transition
                         hover:brightness-105 active:scale-[0.99]"
            >
              <span className="relative z-10">{t.login.submit}</span>
              {/* sheen */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-white/30 opacity-0
                               transition duration-700 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              ></span>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-[1px] w-10 bg-gray-200"></span>
            <span className="text-xs uppercase tracking-widest text-white-400">
              TitanPOS
            </span>
            <span className="h-[1px] w-10 bg-gray-200"></span>
          </div>

          <p className="mt-4 text-center text-xs text-white-500">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold">TitanPOS®</span>. {t.login.rights}
          </p>
        </div>
      </div>
    </div>
  );
}
