"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "../globals.css";
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  LayoutDashboard,
  ChefHat,
  Salad,
  Boxes,
  Package,
  Tags,
  Wine,
  Users,
  Gift,
  DollarSign,
  PiggyBank,
  FileText,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import LanguageSwitch from "@/components/shared/language-switch";
import { useI18n } from "@/hooks/useI18n";
import axios from "axios";
import ReduxProvider from "@/store/reduxProvider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, setAuth } from "@/store/slices/authSlice";
import { persistor } from "@/store";

const PIN_LENGTH = 5;

export default function MainLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: "en" | "fr";
}) {
  const { t } = useI18n(lang);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenu, setProfileMenu] = useState(false);
  const router = useRouter();

  const [switchUserOpen, setSwitchUserOpen] = useState(false);
  const [switchPin, setSwitchPin] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);

  // which sections are expanded
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    foh: true,
    kitchen: false,
    inventory: false,
    menu: false,
    crm: false,
    cash: false,
    reports: false,
    settings: false,
    admin: false,
  });

  const [UsrFullname, setUsrFullname] = useState<string>("");
  const [UsrProfileUrl, setUsrProfileUrl] = useState<string>("");

  const auth = useAppSelector((s) => s.auth.loginData);
  const user_fullname = auth.user_fullname;
  const user_profile_url = auth.user_profile_url;

  useEffect(() => {
    console.log("ProfileUrl", user_profile_url);
    if (user_fullname) setUsrFullname(user_fullname);
    if (user_profile_url) setUsrProfileUrl(user_profile_url);
  }, [UsrProfileUrl, UsrFullname]);

  const toggleSection = (key: string) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const dispatch = useAppDispatch();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-20"
        } relative flex flex-col border-r bg-white shadow-sm transition-all duration-300`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="TitanPOS"
              width={sidebarOpen ? 120 : 40}
              height={40}
              className="transition-all"
            />
            {sidebarOpen && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                TitanPOS
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="rounded-lg p-1 text-sm hover:bg-gray-100"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {/* Dashboard (single) */}
          <SingleLink
            href="/"
            icon={<LayoutDashboard size={18} />}
            label={t.menu.dashboard}
            open={sidebarOpen}
          />

          {/* Sections */}
          <SidebarSection
            title={t.menu.foh}
            icon={<UtensilsCrossed size={18} />}
            open={sidebarOpen}
            expanded={openSections.foh}
            onToggle={() => toggleSection("foh")}
            items={[
              {
                href: "/floor",
                label: t.menu.floor,
                icon: <Home size={16} />,
              },
              {
                href: "/pos",
                label: t.menu.pos,
                icon: <ShoppingCart size={16} />,
              },
              {
                href: "/orders",
                label: t.menu.orders,
                icon: <ClipboardList size={16} />,
              },
              {
                href: "/opencash",
                label: t.menu.open_cash,
                icon: <ClipboardList size={16} />,
              },
              {
                href: "/closecash",
                label: t.menu.close_cash,
                icon: <ClipboardList size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.kitchen}
            icon={<ChefHat size={18} />}
            open={sidebarOpen}
            expanded={openSections.kitchen}
            onToggle={() => toggleSection("kitchen")}
            items={[
              {
                href: "/kds",
                label: t.menu.kds,
                icon: <ChefHat size={16} />,
              },
              {
                href: "/prep",
                label: t.menu.prep,
                icon: <Salad size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.inventory}
            icon={<Boxes size={18} />}
            open={sidebarOpen}
            expanded={openSections.inventory}
            onToggle={() => toggleSection("inventory")}
            items={[
              {
                href: "/inventory/items",
                label: t.menu.items,
                icon: <Package size={16} />,
              },
              {
                href: "/inventory/categories",
                label: "Categories",
                icon: <Package size={16} />,
              },
              {
                href: "/inventory/recipes",
                label: t.menu.recipes,
                icon: <Tags size={16} />,
              },
              {
                href: "/inventory/movements",
                label: t.menu.movements,
                icon: <ClipboardList size={16} />,
              },
              {
                href: "/inventory/counts",
                label: t.menu.counts,
                icon: <ClipboardList size={16} />,
              },
              {
                href: "/inventory/purchasing",
                label: t.menu.purchasing,
                icon: <ShoppingCart size={16} />,
              },
              {
                href: "/inventory/costing",
                label: t.menu.costing,
                icon: <BarChart3 size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.menu}
            icon={<Wine size={18} />}
            open={sidebarOpen}
            expanded={openSections.menu}
            onToggle={() => toggleSection("menu")}
            items={[
              {
                href: "/menu/items",
                label: t.menu.items,
                icon: <Wine size={16} />,
              },
              {
                href: "/menu/modifiers",
                label: t.menu.modifiers,
                icon: <Tags size={16} />,
              },
              {
                href: "/menu/pricing",
                label: t.menu.pricing,
                icon: <DollarSign size={16} />,
              },
              {
                href: "/menu/engineering",
                label: t.menu.engineering,
                icon: <BarChart3 size={16} />,
              },
              {
                href: "/menu/taxes",
                label: t.menu.taxes,
                icon: <FileText size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.crm}
            icon={<Users size={18} />}
            open={sidebarOpen}
            expanded={openSections.crm}
            onToggle={() => toggleSection("crm")}
            items={[
              {
                href: "/customers",
                label: t.menu.customers,
                icon: <Users size={16} />,
              },
              {
                href: "/loyalty",
                label: t.menu.loyalty,
                icon: <Gift size={16} />,
              },
              {
                href: "/promotions",
                label: t.menu.promotions,
                icon: <Tags size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.cash}
            icon={<DollarSign size={18} />}
            open={sidebarOpen}
            expanded={openSections.cash}
            onToggle={() => toggleSection("cash")}
            items={[
              {
                href: "/cash/drawer",
                label: t.menu.cash_drawer,
                icon: <DollarSign size={16} />,
              },
              {
                href: "/cash/currencies",
                label: "Currencies",
                icon: <DollarSign size={16} />,
              },
              {
                href: "/cash/expenses",
                label: "Expenses",
                icon: <DollarSign size={16} />,
              },
              {
                href: "/cash/cashflow",
                label: "Cashflow",
                icon: <DollarSign size={16} />,
              },
              {
                href: "/cash/bank",
                label: t.menu.deposits,
                icon: <PiggyBank size={16} />,
              },
              {
                href: "/cash/audit",
                label: t.menu.audit,
                icon: <Shield size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.reports}
            icon={<FileText size={18} />}
            open={sidebarOpen}
            expanded={openSections.reports}
            onToggle={() => toggleSection("reports")}
            items={[
              {
                href: "/dashboard",
                label: t.menu.realtime,
                icon: <LayoutDashboard size={16} />,
              },
              {
                href: "/reports/sales",
                label: t.menu.sales,
                icon: <FileText size={16} />,
              },
              {
                href: "/reports/items",
                label: t.menu.items,
                icon: <FileText size={16} />,
              },
              {
                href: "/reports/labor",
                label: t.menu.labor,
                icon: <FileText size={16} />,
              },
              {
                href: "/reports/inventory",
                label: t.menu.inventory,
                icon: <FileText size={16} />,
              },
              {
                href: "/reports/finance",
                label: t.menu.finance,
                icon: <FileText size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.settings}
            icon={<Settings size={18} />}
            open={sidebarOpen}
            expanded={openSections.settings}
            onToggle={() => toggleSection("settings")}
            items={[
              {
                href: "/devices/printers",
                label: t.menu.printers,
                icon: <FileText size={16} />,
              },
              {
                href: "/devices/payments",
                label: t.menu.payments,
                icon: <FileText size={16} />,
              },
              {
                href: "/integrations",
                label: t.menu.integrations,
                icon: <FileText size={16} />,
              },
              {
                href: "/settings/brand",
                label: t.menu.brand,
                icon: <Settings size={16} />,
              },
              {
                href: "/settings/locations",
                label: t.menu.locations,
                icon: <Settings size={16} />,
              },
              {
                href: "/settings/workflows",
                label: t.menu.workflows,
                icon: <Settings size={16} />,
              },
              {
                href: "/settings/notifications",
                label: t.menu.notifications,
                icon: <Settings size={16} />,
              },
            ]}
          />

          <SidebarSection
            title={t.menu.admin}
            icon={<Shield size={18} />}
            open={sidebarOpen}
            expanded={openSections.admin}
            onToggle={() => toggleSection("admin")}
            items={[
              {
                href: "/staff/users",
                label: t.menu.users,
                icon: <User size={16} />,
              },
              {
                href: "/staff/permissions",
                label: t.menu.permissions,
                icon: <Shield size={16} />,
              },
              {
                href: "/audit",
                label: t.menu.audit_log,
                icon: <FileText size={16} />,
              },
            ]}
          />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">TitanPOS</h1>

          <div className="relative flex items-center gap-3">
            <button
              onClick={() => {
                setSwitchUserOpen(true);
                setSwitchPin("");
                setSwitchError("");
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
            >
              Switch User
            </button>

            {switchUserOpen && (
              <div className="fixed inset-0 z-[999] grid place-items-center bg-black/40 p-4">
                <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    Switch User
                  </h2>

                  <p className="text-sm text-gray-600 mb-4">Enter staff PIN</p>

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
                        {i < switchPin.length ? "•" : ""}
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
                      "⌫",
                    ].map((k) => (
                      <button
                        key={k}
                        className="h-12 rounded-xl border bg-white font-semibold hover:bg-gray-50"
                        onClick={() => {
                          if (k === "C") {
                            setSwitchPin("");
                            return;
                          }
                          if (k === "⌫") {
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
                      Cancel
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

                          // localStorage.clear();
                          // localStorage.setItem("user_id", String(data.user_id));
                          // localStorage.setItem(
                          //   "user_profile_url",
                          //   data.user_profile_url,
                          // );
                          // localStorage.setItem(
                          //   "user_fullname",
                          //   data.user_fullname,
                          // );
                          // localStorage.setItem("user_email", data.user_email);
                          // localStorage.setItem("user_name", data.user_name);

                          // localStorage.setItem(
                          //   "company_currency",
                          //   String(data.company_currency),
                          // );
                          // localStorage.setItem(
                          //   "sec_company_currency",
                          //   String(data.sec_company_currency),
                          // );
                          // localStorage.setItem(
                          //   "sec_currency_symbol",
                          //   data.sec_currency_symbol,
                          // );

                          // localStorage.setItem(
                          //   "warehouse_id",
                          //   String(data.warehouse_id),
                          // );
                          // localStorage.setItem(
                          //   "exchange_rate",
                          //   String(data.exchange_rate),
                          // );

                          // localStorage.setItem("g_hash", data.g_hash);
                          // localStorage.setItem(
                          //   "store_id",
                          //   String(data.store_id),
                          // );
                          // localStorage.setItem(
                          //   "company_id",
                          //   String(data.company_id),
                          // );

                          // localStorage.setItem("access_token", res.data.access_token);

                          // localStorage.setItem(
                          //   "orders_info",
                          //   JSON.stringify([]),
                          // );

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
                          window.location.href = "/pos";
                        } catch (e) {
                          setSwitchError("Switch failed");
                        } finally {
                          setSwitchLoading(false);
                        }
                      }}
                      className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {switchLoading ? "Switching..." : "Confirm"}
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
                {/* Optional avatar */}
                {/* 
        {UsrProfileUrl && (
          <Image
            src={UsrProfileUrl}
            alt="Profile"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        )} 
        */}

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
                    <User size={16} /> Edit Profile
                  </Link>

                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    onClick={() => {
                      setProfileMenu(false);
                      // localStorage.clear();

                      //clear redux
                      dispatch(logout());

                      //clear redux persist
                      persistor.purge();

                      router.push("/login");
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
 * Components
 * ────────────────────────────────────────────────────*/
function SingleLink({
  href,
  icon,
  label,
  open,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  open: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-orange-50 text-orange-700"
          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {open && <span className="font-medium">{label}</span>}
    </Link>
  );
}

function SidebarSection({
  title,
  icon,
  open,
  expanded,
  onToggle,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  expanded: boolean;
  onToggle: () => void;
  items: { href: string; label: string; icon?: React.ReactNode }[];
}) {
  // compute section "active" if any child matches
  const pathname = usePathname();
  const isActive = useMemo(
    () =>
      items.some(
        (i) => pathname === i.href || pathname?.startsWith(i.href + "/"),
      ),
    [pathname, items],
  );

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition
          ${
            isActive
              ? "bg-orange-50 text-orange-700"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          }`}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-3">
          <span className="shrink-0">{icon}</span>
          {open && <span className="font-semibold">{title}</span>}
        </span>
        {open ? (
          expanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )
        ) : null}
      </button>

      {/* Children */}
      <div
        className={`overflow-hidden pl-2 ${
          expanded && open ? "max-h-[800px]" : "max-h-0"
        } transition-all`}
      >
        <ul className="mt-1">
          {items.map((item) => (
            <li key={item.href}>
              <SectionLink
                href={item.href}
                icon={item.icon}
                label={item.label}
                open={open}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionLink({
  href,
  icon,
  label,
  open,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  open: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`mb-1 ml-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-orange-100 text-orange-800"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {open && <span className="">{label}</span>}
    </Link>
  );
}
