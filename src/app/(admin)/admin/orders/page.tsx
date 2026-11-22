import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { customers, orders } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Orders | Admin",
};

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "order:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const paidCount = rows.filter((r) => r.paymentStatus === "paid").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const totalValue = rows.reduce((acc, r) => acc + r.total, 0);

  return (
    <section aria-labelledby="orders-heading" className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Orders
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {rows.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i className="ti ti-shopping-cart" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Paid
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {paidCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i className="ti ti-circle-check" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending
            </div>
            <div className="text-2xl font-extrabold text-amber-500 mt-1">
              {pendingCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i className="ti ti-clock" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Order Value
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatBdt(totalValue)}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <i className="ti ti-wallet" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="orders-heading"
              className="text-lg font-bold text-slate-900 m-0"
            >
              Recent Orders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Manage order statuses, payments, and courier bookings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition"
            >
              <i className="ti ti-plus" />
              <span>Create Order</span>
            </Link>
            <Link
              href="/admin/orders/print"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-semibold inline-flex items-center gap-2 transition"
            >
              <i className="ti ti-printer" />
              <span>Bulk Print Invoices</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No orders placed yet.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Order #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4">Total</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-indigo-600">
                      {row.number}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">
                        {row.customerName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {row.customerPhone}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          row.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {formatBdt(row.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
