import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import {
  codSettlements,
  courierProviders,
  shipments,
} from "@/modules/courier/schema";

export const metadata: Metadata = {
  title: "Courier & COD | Admin",
};

export default async function AdminCourierPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "courier:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [providers, shipmentList, settlements] = await Promise.all([
    db
      .select({
        id: courierProviders.id,
        code: courierProviders.code,
        status: courierProviders.status,
      })
      .from(courierProviders),
    db.select().from(shipments).orderBy(desc(shipments.createdAt)).limit(30),
    db
      .select()
      .from(codSettlements)
      .orderBy(desc(codSettlements.createdAt))
      .limit(20),
  ]);

  return (
    <section aria-labelledby="courier-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm">
        <h2 id="courier-heading" className="text-base font-bold text-slate-900 m-0">
          Courier Providers ({providers.length})
        </h2>
        <p className="text-sm text-slate-500 mt-2 mb-0">
          {providers.map((p) => `${p.code} (${p.status})`).join(", ") ||
            "No courier providers configured"}
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Recent Shipments ({shipmentList.length})
          </h3>
        </div>
        {shipmentList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No shipments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Tracking</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">COD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {shipmentList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {s.provider}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                      {s.trackingCode ?? s.consignmentId ?? "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      {formatBdt(s.codAmount)}
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
            COD Settlements ({settlements.length})
          </h3>
        </div>
        {settlements.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No COD settlements yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Batch</th>
                  <th className="py-2.5 px-4">Collected</th>
                  <th className="py-2.5 px-4 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {settlements.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {st.provider}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                      {st.batchRef}
                    </td>
                    <td className="py-2.5 px-4">
                      {formatBdt(st.totalCollected)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                      {formatBdt(st.netAmount)}
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
