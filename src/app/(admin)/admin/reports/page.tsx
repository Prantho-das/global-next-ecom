import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import {
  getDetailedReports,
  getReportsSnapshot,
} from "@/modules/report/queries";

export const metadata: Metadata = {
  title: "Reports Center | Admin",
};

const REPORT_TABS = [
  { id: "overview", label: "Overview & P&L", icon: "ti-chart-dots" },
  { id: "sales", label: "Sales & Payments", icon: "ti-shopping-cart" },
  { id: "products", label: "Products & Stock", icon: "ti-package" },
  { id: "purchases", label: "Purchases & Suppliers", icon: "ti-box" },
  { id: "coupons", label: "Coupons & Recovery", icon: "ti-discount" },
  { id: "courier", label: "Courier & Fraud", icon: "ti-truck-delivery" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "report:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const activeTab =
    REPORT_TABS.find((t) => t.id === params.tab)?.id ?? "overview";
  const days = Math.min(
    90,
    Math.max(7, Number.parseInt(params.days ?? "30", 10) || 30),
  );
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  const compareFrom = new Date(from.getTime() - days * 86_400_000);

  const [data, details] = await Promise.all([
    getReportsSnapshot({
      from,
      to: now,
      compareFrom,
      compareTo: from,
    }),
    getDetailedReports(from, now),
  ]);

  return (
    <section aria-labelledby="reports-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80">
          <div>
            <h2
              id="reports-heading"
              className="text-base font-bold text-slate-900 m-0"
            >
              Reports Center (Last {days} days)
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Multi-module analytics across sales, stock, purchases, coupons &amp; couriers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/admin/reports?tab=${activeTab}&days=${d}`}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                  days === d
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {d}d
              </Link>
            ))}
            <a
              href="/api/reports/export"
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition"
            >
              <i className="ti ti-download" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        <div className="px-4 flex items-center gap-6 overflow-x-auto">
          {REPORT_TABS.map((t) => (
            <Link
              key={t.id}
              href={`/admin/reports?tab=${t.id}&days=${days}`}
              className={`py-3 border-b-2 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className={`ti ${t.icon} text-base`} />
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Sales &amp; Period Delta
              </h3>
              <span className="p-2 rounded bg-indigo-50 text-indigo-600">
                <i className="ti ti-trending-up text-base" />
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                Current:{" "}
                <strong className="text-slate-900">
                  {formatBdt(data.salesComparison.current)}
                </strong>
              </div>
              <div>Previous: {formatBdt(data.salesComparison.previous)}</div>
              <div>
                Delta:{" "}
                <strong className="text-emerald-600">
                  {data.salesComparison.deltaPct}%
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Inventory &amp; Profit
              </h3>
              <span className="p-2 rounded bg-emerald-50 text-emerald-600">
                <i className="ti ti-box text-base" />
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                Units in Stock:{" "}
                <strong className="text-slate-900">
                  {data.inventoryValuation.units}
                </strong>
              </div>
              <div>
                Retail Value: {formatBdt(data.inventoryValuation.retailValue)}
              </div>
              <div>
                Gross Profit:{" "}
                <strong className="text-slate-900">
                  {formatBdt(data.grossProfit)}
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Customers &amp; Fraud
              </h3>
              <span className="p-2 rounded bg-amber-50 text-amber-600">
                <i className="ti ti-shield-check text-base" />
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                Total Customers:{" "}
                <strong className="text-slate-900">
                  {data.totalCustomers}
                </strong>
              </div>
              <div>
                Fraud Held: {data.fraudStats.held} / {data.fraudStats.total}
              </div>
              <div>
                Abandon Recovered: {data.abandonStats.recovered} /{" "}
                {data.abandonStats.sent}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Orders by Status
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Count</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {details.ordersByStatus.map((row) => (
                  <tr key={row.status}>
                    <td className="py-2.5 px-4 font-semibold uppercase">
                      {row.status}
                    </td>
                    <td className="py-2.5 px-4">{row.count}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatBdt(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Payments by Method
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Count</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {details.paymentsByMethod.map((row) => (
                  <tr key={row.method}>
                    <td className="py-2.5 px-4 font-semibold uppercase">
                      {row.method}
                    </td>
                    <td className="py-2.5 px-4">{row.count}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatBdt(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Top Selling Products
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Units</th>
                  <th className="py-2.5 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {details.topProducts.map((p) => (
                  <tr key={p.sku}>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {p.name}
                      </div>
                      <div className="text-slate-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-2.5 px-4">{p.units}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatBdt(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Low / Out-of-Stock Alert (≤5)
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {details.lowStockItems.map((item) => (
                  <tr key={item.sku}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                      {item.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Purchase Orders &amp; Supplier Spend
            </h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">PO #</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Total Cost</th>
                <th className="py-2.5 px-4 text-right">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {details.purchaseRows.map((po) => (
                <tr key={po.poNumber}>
                  <td className="py-2.5 px-4 font-bold text-indigo-600">
                    {po.poNumber}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    {po.supplierName}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    {formatBdt(po.totalCost)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-500">
                    {po.receivedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "coupons" && (
        <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Coupon Redemptions &amp; Discounts
            </h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">Coupon Code</th>
                <th className="py-2.5 px-4">Uses</th>
                <th className="py-2.5 px-4 text-right">Total Discount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {details.couponBreakdown.map((c) => (
                <tr key={c.code}>
                  <td className="py-2.5 px-4 font-bold text-indigo-600">
                    {c.code}
                  </td>
                  <td className="py-2.5 px-4">{c.uses}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {formatBdt(c.discount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "courier" && (
        <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Courier COD &amp; Shipment Summary
            </h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">Courier</th>
                <th className="py-2.5 px-4">Shipments</th>
                <th className="py-2.5 px-4">COD Amount</th>
                <th className="py-2.5 px-4 text-right">Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {details.shipmentsByProvider.map((s) => (
                <tr key={s.provider}>
                  <td className="py-2.5 px-4 font-semibold uppercase">
                    {s.provider}
                  </td>
                  <td className="py-2.5 px-4">{s.total}</td>
                  <td className="py-2.5 px-4">{formatBdt(s.codTotal)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                    {formatBdt(s.collected)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
