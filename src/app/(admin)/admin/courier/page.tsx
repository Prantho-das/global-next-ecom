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
    <section aria-labelledby="courier-heading">
      <h1 id="courier-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Courier Providers, Shipments &amp; COD Settlements
      </h1>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Providers ({providers.length})</span>
          <p className="grey-text">
            {providers.map((p) => `${p.code} (${p.status})`).join(", ") ||
              "No courier providers configured"}
          </p>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Recent Shipments ({shipmentList.length})</span>
          <table className="striped">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Tracking</th>
                <th>Status</th>
                <th>COD</th>
              </tr>
            </thead>
            <tbody>
              {shipmentList.map((s) => (
                <tr key={s.id}>
                  <td>{s.provider}</td>
                  <td>{s.trackingCode ?? s.consignmentId ?? "—"}</td>
                  <td>{s.status}</td>
                  <td>{formatBdt(s.codAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">COD Settlements ({settlements.length})</span>
          <table className="striped">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Batch</th>
                <th>Collected</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((st) => (
                <tr key={st.id}>
                  <td>{st.provider}</td>
                  <td>{st.batchRef}</td>
                  <td>{formatBdt(st.totalCollected)}</td>
                  <td>{formatBdt(st.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
