"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Can } from "@/components/ui/can";

export interface AdminShellProps {
  userName: string;
  userEmail: string;
  grantedPermissions: readonly string[];
  isSuperAdmin: boolean;
  children: ReactNode;
}

interface NavChild {
  href: string;
  label: string;
  icon: string;
  permission?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  permission?: string;
  children: readonly NavChild[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "catalog",
    label: "Catalog",
    icon: "ti-package",
    children: [
      { href: "/admin/products", label: "Products", icon: "ti-package", permission: "product:view" },
      { href: "/admin/categories", label: "Categories", icon: "ti-category", permission: "category:view" },
      { href: "/admin/brands", label: "Brands", icon: "ti-tag", permission: "brand:view" },
      { href: "/admin/stock", label: "Stock", icon: "ti-box", permission: "stock:view" },
    ],
  },
  {
    id: "fulfillment",
    label: "Orders & Logistics",
    icon: "ti-shopping-cart",
    children: [
      { href: "/admin/orders", label: "Orders", icon: "ti-shopping-cart", permission: "order:view" },
      { href: "/admin/fraud", label: "Fraud Queue", icon: "ti-shield-lock", permission: "fraud:view" },
      { href: "/admin/courier", label: "Courier", icon: "ti-truck-delivery", permission: "courier:view" },
    ],
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: "ti-discount",
    children: [
      { href: "/admin/coupons", label: "Coupons", icon: "ti-ticket", permission: "coupon:view" },
      { href: "/admin/campaigns", label: "Flash & Campaigns", icon: "ti-bolt", permission: "coupon:view" },
      { href: "/admin/events", label: "Yearly Events", icon: "ti-calendar-event", permission: "coupon:view" },
    ],
  },
  {
    id: "growth",
    label: "Growth & Comms",
    icon: "ti-speakerphone",
    children: [
      { href: "/admin/customers", label: "Customers", icon: "ti-users", permission: "customer:view" },
      { href: "/admin/marketing", label: "Marketing", icon: "ti-speakerphone", permission: "marketing:view" },
      { href: "/admin/notifications", label: "Notifications", icon: "ti-bell", permission: "notification:view" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "ti-file-analytics",
    children: [
      { href: "/admin/reports", label: "Overview & P&L", icon: "ti-chart-dots", permission: "report:view" },
      { href: "/admin/reports?tab=sales", label: "Sales & Payments", icon: "ti-shopping-cart", permission: "report:view" },
      { href: "/admin/reports?tab=products", label: "Products & Stock", icon: "ti-package", permission: "report:view" },
      { href: "/admin/reports?tab=purchases", label: "Purchases & PO", icon: "ti-box", permission: "report:view" },
      { href: "/admin/reports?tab=coupons", label: "Coupons Report", icon: "ti-discount", permission: "report:view" },
      { href: "/admin/reports?tab=courier", label: "Courier & Fraud", icon: "ti-truck-delivery", permission: "report:view" },
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: "ti-map-pin",
    children: [
      { href: "/admin/shipping", label: "Shipping Settings", icon: "ti-settings", permission: "setting:view" },
      { href: "/admin/shipping/countries", label: "Countries", icon: "ti-world", permission: "setting:view" },
      { href: "/admin/shipping/states", label: "States / Divisions", icon: "ti-map", permission: "setting:view" },
      { href: "/admin/shipping/areas", label: "Areas & Cost", icon: "ti-map-pin", permission: "setting:view" },
    ],
  },
  {
    id: "settings",
    label: "Settings & Finance",
    icon: "ti-settings",
    children: [
      { href: "/admin/settings", label: "Advanced Settings", icon: "ti-settings", permission: "setting:view" },
      { href: "/admin/roles", label: "Staff & RBAC", icon: "ti-key", permission: "role:view" },
      { href: "/admin/audit", label: "Audit Logs", icon: "ti-history", permission: "audit:view" },
      { href: "/admin/payment", label: "Payments", icon: "ti-credit-card", permission: "setting:view" },
    ],
  },
];

function getInitials(name: string, email: string): string {
  const source = name.trim() !== "" ? name.trim() : email.trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "AD";
}

function isRouteMatch(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/admin/shipping") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  userName,
  userEmail,
  grantedPermissions,
  isSuperAdmin,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const activeGroup = NAV_GROUPS.find((g) =>
    g.children.some((c) => isRouteMatch(pathname, c.href)),
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      init[g.id] = g.children.some((c) => isRouteMatch(pathname, c.href));
    }
    return init;
  });

  useEffect(() => {
    if (activeGroup !== undefined) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [activeGroup]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (csrfToken !== undefined && csrfToken !== "") {
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken, callbackUrl: "/admin/login" }),
        });
      }
      window.location.assign("/admin/login");
    } catch {
      window.location.assign("/admin/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-700 flex text-[14px] antialiased">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-[240px] bg-[#0F172A] flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-30 text-slate-400 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopSidebarOpen ? "lg:translate-x-0" : "lg:-translate-x-full"}`}
        aria-label="Admin navigation"
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg tracking-tight leading-none">
                E-COM
              </span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Fuse Admin
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="lg:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5"
          aria-label="Sidebar links"
        >
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Applications
          </div>

          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`h-9 px-4 rounded flex items-center gap-3 transition-colors ${
              pathname === "/admin"
                ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <i className="ti ti-chart-dots text-[18px]" />
            <span>Dashboard</span>
          </Link>

          <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Management
          </div>

          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups[group.id] ?? false;
            const groupActive = group.children.some((c) =>
              isRouteMatch(pathname, c.href),
            );
            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className={`w-full h-9 px-4 rounded flex items-center justify-between transition-colors ${
                    groupActive
                      ? "bg-slate-800/80 text-white font-medium"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <i className={`ti ${group.icon} text-[18px]`} />
                    <span>{group.label}</span>
                  </span>
                  <i
                    className={`ti ti-chevron-down text-sm transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pl-4 space-y-1">
                    {group.children.map((child) => {
                      const active = isRouteMatch(pathname, child.href);
                      const childLink = (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`h-8 px-3.5 rounded flex items-center gap-2.5 text-[13px] transition-colors ${
                            active
                              ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/25"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                          }`}
                        >
                          <i className={`ti ${child.icon} text-[16px]`} />
                          <span>{child.label}</span>
                        </Link>
                      );
                      if (child.permission === undefined) {
                        return childLink;
                      }
                      return (
                        <Can
                          key={child.href}
                          permission={child.permission}
                          grantedPermissions={grantedPermissions}
                          isSuperAdmin={isSuperAdmin}
                        >
                          {childLink}
                        </Can>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200 ${
          desktopSidebarOpen ? "lg:pl-[240px]" : "lg:pl-0"
        }`}
      >
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded text-slate-500 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <i className="ti ti-menu-2 text-xl" />
            </button>
            <button
              type="button"
              className="hidden lg:inline-flex p-2 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Toggle sidebar"
              aria-expanded={desktopSidebarOpen}
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              title={desktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <i className="ti ti-menu-2 text-xl" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <i className="ti ti-external-link text-sm" />
              <span>Storefront</span>
            </Link>

            <Link
              href="/admin/notifications"
              className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <i className="ti ti-bell text-xl" />
            </Link>

            <div className="relative pl-3 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded p-1 hover:bg-slate-50 transition text-left"
                aria-expanded={userMenuOpen}
              >
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {userName || "Administrator"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isSuperAdmin ? "Super Admin" : userEmail}
                  </div>
                </div>
                <div className="w-10 h-10 rounded bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  {getInitials(userName, userEmail)}
                </div>
                <i className="ti ti-chevron-down text-slate-400 text-sm" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/80 rounded shadow-lg py-2 z-30">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {userName || "Administrator"}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {userEmail}
                    </div>
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5"
                  >
                    <i className="ti ti-chart-dots text-base" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/admin/reports"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5"
                  >
                    <i className="ti ti-file-analytics text-base" />
                    <span>Reports</span>
                  </Link>
                  <Link
                    href="/admin/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5"
                  >
                    <i className="ti ti-lock text-base" />
                    <span>My Profile &amp; Password</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5"
                  >
                    <i className="ti ti-settings text-base" />
                    <span>Settings</span>
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 text-left"
                  >
                    <i className="ti ti-logout text-base" />
                    <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4">
          {activeGroup !== undefined && (
            <div className="bg-white border border-slate-200/80 rounded shadow-sm mb-4">
              <div className="px-4 sm:px-4 flex items-center gap-4 sm:gap-8 overflow-x-auto">
                {activeGroup.children.map((tab) => {
                  const tabActive = isRouteMatch(pathname, tab.href);
                  const tabNode = (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`py-2.5 border-b-2 text-sm inline-flex items-center gap-2 whitespace-nowrap transition ${
                        tabActive
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
                      }`}
                    >
                      <i className={`ti ${tab.icon} text-lg`} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                  if (tab.permission === undefined) {
                    return tabNode;
                  }
                  return (
                    <Can
                      key={tab.href}
                      permission={tab.permission}
                      grantedPermissions={grantedPermissions}
                      isSuperAdmin={isSuperAdmin}
                    >
                      {tabNode}
                    </Can>
                  );
                })}
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
