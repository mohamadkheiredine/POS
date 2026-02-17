"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import LanguageSwitch from "@/components/shared/language-switch";
import { useI18n } from "@/hooks/useI18n";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, setAuth } from "@/store/slices/authSlice";
import { persistor } from "@/store";

const PIN_LENGTH = 5;

export default function FloorsLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: "en" | "fr";
}) {
  const { t } = useI18n(lang);
  const [profileMenu, setProfileMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const [switchUserOpen, setSwitchUserOpen] = useState(false);
  const [switchPin, setSwitchPin] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);

  const [UsrFullname, setUsrFullname] = useState<string>("");

  const auth = useAppSelector((s) => s.auth.loginData);
  const isLoggedIn = useAppSelector((s) => s.auth.isLoggedIn);
  const { user_fullname } = auth;

  const isLoginRoute = pathname?.startsWith("/terrace/login");

  useEffect(() => {
    if (user_fullname) setUsrFullname(user_fullname);
  }, [user_fullname]);

  const dispatch = useAppDispatch();

  // Auth guard: redirect to terrace login if not authenticated
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isLoginRoute || loggingOut) return;
    if (!isLoggedIn || !auth.g_hash) {
      router.replace("/terrace/login");
    }
  }, [isLoggedIn, auth.g_hash, router, isLoginRoute, loggingOut]);

  // If on login route, render children without the topbar shell
  if (isLoginRoute) {
    return <>{children}</>;
  }

  // If not authenticated, render nothing while redirecting
  if (!isLoggedIn || !auth.g_hash) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="TitanPOS"
            width={120}
            height={40}
          />
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            TitanPOS
          </span>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            onClick={() => {
              setSwitchUserOpen(true);
              setSwitchPin("");
              setSwitchError("");
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
          >
            {t.header.switchUser}
          </button>

          {switchUserOpen && (
            <div className="fixed inset-0 z-[999] grid place-items-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  {t.header.switchUser}
                </h2>

                <p className="text-sm text-gray-600 mb-4">
                  {t.header.enterPin}
                </p>

                <div className="flex justify-center gap-2 mb-4">
                  {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-10 w-10 rounded-xl border text-center leading-[40px] text-xl font-bold
                          ${
                            i < switchPin.length
                              ? "bg-orange-100 border-orange-400 text-orange-600"
                              : "bg-gray-50 border-gray-200 text-gray-400"
                          }`}
                    >
                      {i < switchPin.length ? "\u2022" : ""}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "C",
                    "0",
                    "\u232B",
                  ].map((k) => (
                    <button
                      key={k}
                      className="h-12 rounded-xl border bg-white font-semibold hover:bg-gray-50"
                      onClick={() => {
                        if (k === "C") {
                          setSwitchPin("");
                          return;
                        }
                        if (k === "\u232B") {
                          setSwitchPin((p) => p.slice(0, -1));
                          return;
                        }
                        if (switchPin.length < PIN_LENGTH) {
                          setSwitchPin((p) => p + k);
                        }
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {switchError && (
                  <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {switchError}
                  </div>
                )}

                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => setSwitchUserOpen(false)}
                    className="rounded-xl border px-4 py-2 text-sm"
                  >
                    {t.header.cancel}
                  </button>

                  <button
                    disabled={
                      switchPin.length !== PIN_LENGTH || switchLoading
                    }
                    onClick={async () => {
                      setSwitchLoading(true);
                      setSwitchError("");

                      try {
                        const res = await axios.post(
                          `${process.env.NEXT_PUBLIC_API_LINK}/request/api/loginposbypin`,
                          { pin: switchPin },
                        );

                        if (res.data?.is_error) {
                          setSwitchError(
                            res.data.error_message || "Invalid PIN",
                          );
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
                          company_currency: String(
                            data.company_currency ?? "",
                          ),
                          currency_symbol: String(data.currency_symbol ?? ""),
                          sec_currency_id: String(
                            data.sec_company_currency ?? "",
                          ),
                          sec_currency_symbol: String(
                            data.sec_currency_symbol ?? "",
                          ),
                          warehouse_id: String(data.warehouse_id ?? ""),
                          exchange_rate: String(data.exchange_rate ?? ""),
                          store_id: String(data.store_id ?? ""),
                          company_id: String(data.company_id ?? ""),
                          allowed_currencies: Array.isArray(
                            data.allowed_currencies,
                          )
                            ? data.allowed_currencies
                            : [],
                        };

                        dispatch(setAuth(loginData));
                        // Stay on the current page after switching user
                        window.location.href = pathname;
                      } catch {
                        setSwitchError("Switch failed");
                      } finally {
                        setSwitchLoading(false);
                      }
                    }}
                    className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {switchLoading ? t.header.switching : t.header.confirm}
                  </button>
                </div>
              </div>
            </div>
          )}

          <LanguageSwitch />

          <div className="relative">
            <button
              onClick={() => setProfileMenu((s) => !s)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
            >
              <span className="hidden text-sm font-medium md:block">
                {UsrFullname}
              </span>
            </button>

            {profileMenu && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border bg-white shadow-md">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setProfileMenu(false)}
                >
                  <User size={16} /> {t.header.editProfile}
                </Link>

                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  onClick={async () => {
                    setProfileMenu(false);
                    setLoggingOut(true);
                    dispatch(logout());
                    try {
                      await persistor.purge();
                    } catch {
                      // ignore persist errors during logout
                    }
                    window.location.href = "/terrace/login";
                  }}
                >
                  <LogOut size={16} /> {t.header.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content — full width, no sidebar */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
