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
    <section aria-labelledby="payment-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm">
        <h2 id="payment-heading" className="text-base font-bold text-slate-900 m-0">
          Payment Providers ({providers.length})
        </h2>
        <p className="text-sm text-slate-500 mt-2 mb-0">
          {providers
            .map(
              (p) =>
                `${p.name} (${p.code}, ${p.isActive ? "active" : "inactive"}, ${p.sandboxMode ? "sandbox" : "live"})`,
            )
            .join(", ") || "No payment providers configured"}
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Transactions ({txns.length})
          </h3>
        </div>
        {txns.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4 text-right">Refunded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 uppercase">
                      {t.method}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {formatBdt(t.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {formatBdt(t.refundedAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Refunds ({refundList.length})
          </h3>
        </div>
        {refundList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No refunds processed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {refundList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-xs text-indigo-600">
                      {r.orderId}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {formatBdt(r.amount)}
                    </td>
                    <td className="py-2.5 px-4">{r.reason}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {r.status}
                      </span>
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
