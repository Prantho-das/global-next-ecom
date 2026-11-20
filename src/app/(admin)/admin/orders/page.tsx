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

  return (
    <section aria-labelledby="orders-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 id="orders-heading" style={{ fontSize: "1.75rem", margin: 0 }}>
          Orders
        </h1>
        <Link href="/admin/orders/print" className="btn-small">
          Bulk Print Invoices
        </Link>
      </div>

      <div className="card white">
        <div className="card-content">
          {rows.length === 0 ? (
            <p className="grey-text">No orders placed yet.</p>
          ) : (
            <table className="striped responsive-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.number}</td>
                    <td>
                      {row.customerName} ({row.customerPhone})
                    </td>
                    <td>{row.status}</td>
                    <td>{row.paymentStatus}</td>
                    <td>{formatBdt(row.total)}</td>
                    <td>
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="btn-small"
                      >
                        Manage
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
