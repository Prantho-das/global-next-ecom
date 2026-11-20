"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { Can } from "@/components/ui/can";

export interface AdminShellProps {
  userName: string;
  userEmail: string;
  grantedPermissions: readonly string[];
  isSuperAdmin: boolean;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products", permission: "product:view" },
  {
    href: "/admin/categories",
    label: "Categories",
    permission: "category:view",
  },
  { href: "/admin/brands", label: "Brands", permission: "brand:view" },
  { href: "/admin/stock", label: "Stock", permission: "stock:view" },
  { href: "/admin/orders", label: "Orders", permission: "order:view" },
  { href: "/admin/fraud", label: "Fraud Queue", permission: "fraud:view" },
  { href: "/admin/courier", label: "Courier", permission: "courier:view" },
  { href: "/admin/payment", label: "Payments", permission: "setting:view" },
  {
    href: "/admin/notifications",
    label: "Notifications",
    permission: "notification:view",
  },
  { href: "/admin/customers", label: "Customers", permission: "customer:view" },
  { href: "/admin/roles", label: "Roles & RBAC", permission: "role:view" },
  { href: "/admin/shipping", label: "Shipping", permission: "setting:view" },
  { href: "/admin/audit", label: "Audit Logs", permission: "audit:view" },
  { href: "/admin/settings", label: "Settings", permission: "setting:view" },
];

export function AdminShell({
  userName,
  userEmail,
  grantedPermissions,
  isSuperAdmin,
  children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <aside
        className={`admin-sidebar${sidebarOpen ? " is-open" : ""}`}
        aria-label="Admin navigation"
      >
        <div style={{ padding: "20px", borderBottom: "1px solid #334155" }}>
          <strong style={{ fontSize: "1.125rem" }}>E-Com Admin</strong>
        </div>
        <nav aria-label="Sidebar links">
          <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
            {NAV_ITEMS.map((item) => {
              const link = (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
              if (item.permission === undefined) {
                return link;
              }
              return (
                <Can
                  key={item.href}
                  permission={item.permission}
                  grantedPermissions={grantedPermissions}
                  isSuperAdmin={isSuperAdmin}
                >
                  {link}
                </Can>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="btn-flat hide-on-large-only"
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            Menu
          </button>
          <span className="grey-text text-darken-2">Admin Workspace</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>
              {userName} ({userEmail})
            </span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
