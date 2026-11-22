import type { Metadata } from "next";
import Link from "next/link";

import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { formatBdt } from "@/lib/money";
import { getDashboardKpisCached } from "@/modules/report/queries";

export const metadata: Metadata = {
  title: "Dashboard | Admin",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  packed: "bg-violet-50 text-violet-700 border-violet-200",
  shipped: "bg-cyan-50 text-cyan-700 border-cyan-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function AdminDashboardPage() {
  const kpis = await getDashboardKpisCached();

  return (
    <section aria-labelledby="admin-dashboard-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            id="admin-dashboard-heading"
            className="text-xl font-extrabold text-slate-900 tracking-tight m-0"
          >
            Store Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            Live revenue, order fulfillment, and inventory health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <i className="ti ti-plus text-indigo-600" />
            <span>Create Order</span>
          </Link>
          <Link
            href="/admin/reports"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <i className="ti ti-file-analytics" />
            <span>Full Reports</span>
          </Link>
          <Link
            href="/api/reports/export"
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <i className="ti ti-download" />
            <span>Export CSV</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {formatBdt(kpis.totalRevenue)}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i className="ti ti-wallet" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Orders
            </div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">
              {kpis.totalOrders}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i className="ti ti-shopping-cart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Avg Order Value
            </div>
            <div className="text-xl font-extrabold text-amber-500 mt-1">
              {formatBdt(kpis.aov)}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i className="ti ti-chart-bar" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Delivery Rate
            </div>
            <div className="text-xl font-extrabold text-cyan-600 mt-1">
              {kpis.deliveryRatePct}%
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <i className="ti ti-truck-delivery" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Customers
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {kpis.customersCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-violet-50 text-violet-600 flex items-center justify-center text-lg">
            <i className="ti ti-users" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Low Stock Alerts
            </div>
            <div className="text-xl font-extrabold text-rose-600 mt-1">
              {kpis.lowStockCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
            <i className="ti ti-alert-triangle" />
          </div>
        </div>
      </div>

      <DashboardCharts
        daily={kpis.sparkline}
        statusBreakdown={kpis.statusBreakdown}
        topProducts={kpis.topProducts}
      />

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Recent Orders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Latest customer transactions
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {kpis.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-slate-400">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                kpis.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-indigo-600">
                      <Link href={`/admin/orders/${o.id}`}>{o.number}</Link>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border capitalize ${
                          STATUS_BADGE[o.status] ??
                          "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatBdt(o.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
