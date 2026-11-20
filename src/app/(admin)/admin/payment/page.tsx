import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { paymentProviders, refunds } from "@/modules/payment/schema";
import { payments } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Payments & Refunds | Admin",
};

export default async function AdminPaymentPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "setting:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [providers, txns, refundList] = await Promise.all([
    db
      .select({
        id: paymentProviders.id,
        code: paymentProviders.code,
        name: paymentProviders.name,
        isActive: paymentProviders.isActive,
        sandboxMode: paymentProviders.sandboxMode,
      })
      .from(paymentProviders)
      .orderBy(asc(paymentProviders.position)),
    db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        method: payments.method,
        status: payments.status,
        amount: payments.amount,
        refundedAmount: payments.refundedAmount,
      })
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(30),
    db.select().from(refunds).orderBy(desc(refunds.createdAt)).limit(20),
  ]);

  return (
    <section aria-labelledby="payment-heading">
      <h1 id="payment-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Payment Providers, Transactions &amp; Refunds
      </h1>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Providers ({providers.length})</span>
          <p className="grey-text">
            {providers
              .map(
                (p) =>
                  `${p.name} (${p.code}, ${p.isActive ? "active" : "inactive"}, ${p.sandboxMode ? "sandbox" : "live"})`,
              )
              .join(", ") || "No payment providers configured"}
          </p>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Transactions ({txns.length})</span>
          <table className="striped">
            <thead>
              <tr>
                <th>Method</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Refunded</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td>{t.method}</td>
                  <td>{t.status}</td>
                  <td>{formatBdt(t.amount)}</td>
                  <td>{formatBdt(t.refundedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Refunds ({refundList.length})</span>
          <table className="striped">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {refundList.map((r) => (
                <tr key={r.id}>
                  <td>{r.orderId}</td>
                  <td>{formatBdt(r.amount)}</td>
                  <td>{r.reason}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
