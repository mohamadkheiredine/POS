"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenu, setProfileMenu] = useState(false);

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
              label="Dashboard"
              open={sidebarOpen}
            />

            {/* Sections */}
            <SidebarSection
              title="Front of House"
              icon={<UtensilsCrossed size={18} />}
              open={sidebarOpen}
              expanded={openSections.foh}
              onToggle={() => toggleSection("foh")}
              items={[
                { href: "/floor", label: "Floor" , icon: <Home size={16} /> },
                { href: "/pos", label: "POS", icon: <ShoppingCart size={16} /> },
                { href: "/orders", label: "Orders", icon: <ClipboardList size={16} /> },
              ]}
            />

            <SidebarSection
              title="Kitchen"
              icon={<ChefHat size={18} />}
              open={sidebarOpen}
              expanded={openSections.kitchen}
              onToggle={() => toggleSection("kitchen")}
              items={[
                { href: "/kds", label: "KDS Boards", icon: <ChefHat size={16} /> },
                { href: "/prep", label: "Prep", icon: <Salad size={16} /> },
              ]}
            />

            <SidebarSection
              title="Inventory"
              icon={<Boxes size={18} />}
              open={sidebarOpen}
              expanded={openSections.inventory}
              onToggle={() => toggleSection("inventory")}
              items={[
                { href: "/inventory/items", label: "Items", icon: <Package size={16} /> },
                { href: "/inventory/recipes", label: "Recipes / BOM", icon: <Tags size={16} /> },
                { href: "/inventory/movements", label: "Movements", icon: <ClipboardList size={16} /> },
                { href: "/inventory/counts", label: "Counts", icon: <ClipboardList size={16} /> },
                { href: "/inventory/purchasing", label: "Purchasing", icon: <ShoppingCart size={16} /> },
                { href: "/inventory/costing", label: "Costing", icon: <BarChart3 size={16} /> },
              ]}
            />

            <SidebarSection
              title="Menu"
              icon={<Wine size={18} />}
              open={sidebarOpen}
              expanded={openSections.menu}
              onToggle={() => toggleSection("menu")}
              items={[
                { href: "/menu/items", label: "Items", icon: <Wine size={16} /> },
                { href: "/menu/modifiers", label: "Modifiers", icon: <Tags size={16} /> },
                { href: "/menu/pricing", label: "Pricing", icon: <DollarSign size={16} /> },
                { href: "/menu/engineering", label: "Engineering", icon: <BarChart3 size={16} /> },
                { href: "/menu/taxes", label: "Taxes", icon: <FileText size={16} /> },
              ]}
            />

            <SidebarSection
              title="CRM & Loyalty"
              icon={<Users size={18} />}
              open={sidebarOpen}
              expanded={openSections.crm}
              onToggle={() => toggleSection("crm")}
              items={[
                { href: "/customers", label: "Customers", icon: <Users size={16} /> },
                { href: "/loyalty", label: "Loyalty", icon: <Gift size={16} /> },
                { href: "/promotions", label: "Promotions", icon: <Tags size={16} /> },
              ]}
            />

            <SidebarSection
              title="Cash & Finance"
              icon={<DollarSign size={18} />}
              open={sidebarOpen}
              expanded={openSections.cash}
              onToggle={() => toggleSection("cash")}
              items={[
                { href: "/cash/drawer", label: "Cash Drawer", icon: <DollarSign size={16} /> },
                { href: "/cash/bank", label: "Deposits & Batches", icon: <PiggyBank size={16} /> },
                { href: "/cash/audit", label: "Audit", icon: <Shield size={16} /> },
              ]}
            />

            <SidebarSection
              title="Reports"
              icon={<FileText size={18} />}
              open={sidebarOpen}
              expanded={openSections.reports}
              onToggle={() => toggleSection("reports")}
              items={[
                { href: "/dashboard", label: "Realtime KPIs", icon: <LayoutDashboard size={16} /> },
                { href: "/reports/sales", label: "Sales", icon: <FileText size={16} /> },
                { href: "/reports/items", label: "Items", icon: <FileText size={16} /> },
                { href: "/reports/labor", label: "Labor", icon: <FileText size={16} /> },
                { href: "/reports/inventory", label: "Inventory", icon: <FileText size={16} /> },
                { href: "/reports/finance", label: "Finance", icon: <FileText size={16} /> },
              ]}
            />

            <SidebarSection
              title="Settings"
              icon={<Settings size={18} />}
              open={sidebarOpen}
              expanded={openSections.settings}
              onToggle={() => toggleSection("settings")}
              items={[
                { href: "/devices/printers", label: "Printers", icon: <FileText size={16} /> },
                { href: "/devices/payments", label: "Payment Terminals", icon: <FileText size={16} /> },
                { href: "/integrations", label: "Integrations", icon: <FileText size={16} /> },
                { href: "/settings/brand", label: "Brand", icon: <Settings size={16} /> },
                { href: "/settings/locations", label: "Locations", icon: <Settings size={16} /> },
                { href: "/settings/workflows", label: "Workflows", icon: <Settings size={16} /> },
                { href: "/settings/notifications", label: "Notifications", icon: <Settings size={16} /> },
              ]}
            />

            <SidebarSection
              title="Admin"
              icon={<Shield size={18} />}
              open={sidebarOpen}
              expanded={openSections.admin}
              onToggle={() => toggleSection("admin")}
              items={[
                { href: "/staff/users", label: "Users", icon: <User size={16} /> },
                { href: "/staff/permissions", label: "Permissions", icon: <Shield size={16} /> },
                { href: "/audit", label: "Audit Log", icon: <FileText size={16} /> },
              ]}
            />
          </nav>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col">
          {/* Topbar */}
          <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">TitanPOS</h1>
            <div className="relative">
              <button
                onClick={() => setProfileMenu((s) => !s)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                <Image
                  src="/images/profile.jpg"
                  alt="Profile"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="hidden text-sm font-medium md:block">
                  John Doe
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
                      alert("TODO: logout");
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
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
    () => items.some((i) => pathname === i.href || pathname?.startsWith(i.href + "/")),
    [pathname, items]
  );

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition
          ${isActive ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-3">
          <span className="shrink-0">{icon}</span>
          {open && <span className="font-semibold">{title}</span>}
        </span>
        {open ? (
          expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        ) : null}
      </button>

      {/* Children */}
      <div
        className={`overflow-hidden pl-2 ${expanded && open ? "max-h-[800px]" : "max-h-0"} transition-all`}
      >
        <ul className="mt-1">
          {items.map((item) => (
            <li key={item.href}>
              <SectionLink href={item.href} icon={item.icon} label={item.label} open={open} />
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