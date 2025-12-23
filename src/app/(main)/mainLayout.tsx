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

  useEffect(() => {
    const storedName = localStorage.getItem("user_fullname");
    const ProfileUrl = localStorage.getItem("user_profile_url");
    console.log("ProfileUrl", ProfileUrl);
    if (storedName) setUsrFullname(storedName);
    if (ProfileUrl) setUsrProfileUrl(ProfileUrl);
  }, [UsrProfileUrl, UsrFullname]);

  const toggleSection = (key: string) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  return (
    <html lang="en">
      <head>
        <title>TitanPOS</title>
      </head>
      <body className="flex min-h-screen bg-gray-50 text-gray-900">
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
                { href: "/floor", label: t.menu.floor, icon: <Home size={16} /> },
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
                { href: "/prep", label: t.menu.prep, icon: <Salad size={16} /> },
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
                        localStorage.clear();
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
      </body>
    </html>
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
        (i) => pathname === i.href || pathname?.startsWith(i.href + "/")
      ),
    [pathname, items]
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
