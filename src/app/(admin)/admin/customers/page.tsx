import { desc, eq, like, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { customers, orders } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Customers CRM | Admin",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "customer:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const db = getDb();

  const whereClause =
    q !== ""
      ? or(
          like(customers.name, `%${q}%`),
          like(customers.phone, `%${q}%`),
          like(customers.email, `%${q}%`),
        )
      : undefined;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      isGuest: customers.isGuest,
      createdAt: customers.createdAt,
      orderCount: sql<number>`CAST(COUNT(${orders.id}) AS SIGNED)`,
      totalSpent: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(whereClause)
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))
    .limit(50);

  return (
    <section aria-labelledby="customers-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="customers-heading"
              className="text-base font-bold text-slate-900 m-0"
            >
              Customers CRM ({rows.length})
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Customer directory, order counts, and lifetime spend
            </p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name, phone, email..."
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold"
            >
              Search
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Orders</th>
                  <th className="py-2.5 px-4 text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.email ?? "No email"}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">{c.phone}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.isGuest
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {c.isGuest ? "Guest" : "Registered"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">{c.orderCount}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatBdt(c.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
