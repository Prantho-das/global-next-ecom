import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { getReportsSnapshot } from "@/modules/report/queries";

export const metadata: Metadata = {
  title: "Reports | Admin",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "report:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const days = Math.min(90, Math.max(7, Number.parseInt(params.days ?? "30", 10) || 30));
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  const compareFrom = new Date(from.getTime() - days * 86_400_000);
  const data = await getReportsSnapshot({
    from,
    to: now,
    compareFrom,
    compareTo: from,
  });

  return (
    <section aria-labelledby="reports-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 id="reports-heading" style={{ fontSize: "1.75rem", margin: 0 }}>
          Analytics &amp; Reports (Last {days} days)
        </h1>
        <a href="/api/reports/export" className="btn waves-effect waves-light">
          Export CSV
        </a>
      </div>

      <div className="row">
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Sales &amp; Period Delta</span>
              <p>Current: {formatBdt(data.salesComparison.current)}</p>
              <p>Previous: {formatBdt(data.salesComparison.previous)}</p>
              <p>Delta: {data.salesComparison.deltaPct}%</p>
            </div>
          </div>
        </div>
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Inventory &amp; Profit</span>
              <p>Units in Stock: {data.inventoryValuation.units}</p>
              <p>
                Retail Value: {formatBdt(data.inventoryValuation.retailValue)}
              </p>
              <p>Gross Profit: {formatBdt(data.grossProfit)}</p>
            </div>
          </div>
        </div>
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Coupons, Fraud &amp; Recovery</span>
              <p>
                Coupon Redemptions: {data.couponStats.redemptions} (
                {formatBdt(data.couponStats.discountTotal)})
              </p>
              <p>
                Fraud Held: {data.fraudStats.held} / {data.fraudStats.total}
              </p>
              <p>
                Abandon Recovered: {data.abandonStats.recovered} /{" "}
                {data.abandonStats.sent}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
