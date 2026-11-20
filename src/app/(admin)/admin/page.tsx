import type { Metadata } from "next";
import Link from "next/link";

import { formatBdt } from "@/lib/money";
import { getDashboardKpisCached } from "@/modules/report/queries";

export const metadata: Metadata = {
  title: "Dashboard | Admin",
};

export default async function AdminDashboardPage() {
  const kpis = await getDashboardKpisCached();
  const maxRev = Math.max(1, ...kpis.sparkline.map((s) => s.revenue));
  const points = kpis.sparkline
    .map((s, idx) => {
      const x = kpis.sparkline.length > 1 ? (idx / (kpis.sparkline.length - 1)) * 280 : 0;
      const y = 60 - Math.round((s.revenue / maxRev) * 50);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section aria-labelledby="admin-dashboard-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1
          id="admin-dashboard-heading"
          style={{ fontSize: "1.75rem", margin: 0 }}
        >
          Dashboard
        </h1>
        <Link href="/admin/reports" className="btn-small">
          Full Reports
        </Link>
      </div>

      <div className="row">
        <div className="col s12 m6 l3">
          <div className="card white">
            <div className="card-content">
              <span className="grey-text">Revenue</span>
              <h2 style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>
                {formatBdt(kpis.totalRevenue)}
              </h2>
            </div>
          </div>
        </div>
        <div className="col s12 m6 l3">
          <div className="card white">
            <div className="card-content">
              <span className="grey-text">Orders</span>
              <h2 style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>
                {kpis.totalOrders}
              </h2>
            </div>
          </div>
        </div>
        <div className="col s12 m6 l3">
          <div className="card white">
            <div className="card-content">
              <span className="grey-text">Avg Order Value</span>
              <h2 style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>
                {formatBdt(kpis.aov)}
              </h2>
            </div>
          </div>
        </div>
        <div className="col s12 m6 l3">
          <div className="card white">
            <div className="card-content">
              <span className="grey-text">Delivery Rate</span>
              <h2 style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>
                {kpis.deliveryRatePct}%
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Revenue Sparkline (60s cached)</span>
          {kpis.sparkline.length === 0 ? (
            <p className="grey-text">No daily aggregate data yet.</p>
          ) : (
            <svg
              width="280"
              height="70"
              role="img"
              aria-label="Daily revenue sparkline"
            >
              <polyline
                fill="none"
                stroke="#00897b"
                strokeWidth="2.5"
                points={points}
              />
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}
