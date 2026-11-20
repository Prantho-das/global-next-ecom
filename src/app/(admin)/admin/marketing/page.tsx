import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import {
  abandonCartLogs,
  campaignsMarketing,
  referrals,
  segments,
  trackingEvents,
} from "@/modules/marketing/schema";

export const metadata: Metadata = {
  title: "Marketing & Feeds | Admin",
};

export default async function AdminMarketingPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "marketing:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [segmentRows, campaignRows, referralRows, abandonRows, eventRows] =
    await Promise.all([
      db.select().from(segments),
      db.select().from(campaignsMarketing),
      db.select().from(referrals).limit(20),
      db
        .select()
        .from(abandonCartLogs)
        .orderBy(desc(abandonCartLogs.createdAt))
        .limit(30),
      db
        .select()
        .from(trackingEvents)
        .orderBy(desc(trackingEvents.createdAt))
        .limit(30),
    ]);

  return (
    <section aria-labelledby="marketing-heading">
      <h1 id="marketing-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Marketing, Segments &amp; Feeds
      </h1>
      <div className="row">
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Segments ({segmentRows.length})</span>
              <p className="grey-text">
                {segmentRows.map((s) => s.name).join(", ") || "None"}
              </p>
            </div>
          </div>
        </div>
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">
                Campaigns ({campaignRows.length})
              </span>
              <p className="grey-text">
                Referrals: {referralRows.length} | Tracking Events:{" "}
                {eventRows.length}
              </p>
            </div>
          </div>
        </div>
        <div className="col s12 m4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Product Feeds</span>
              <p>
                <a href="/api/feeds/google-merchant.xml">Google Merchant XML</a>
                <br />
                <a href="/api/feeds/facebook-catalog.csv">
                  Facebook Catalog CSV
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">
            Abandoned Cart Logs ({abandonRows.length})
          </span>
          <table className="striped">
            <thead>
              <tr>
                <th>Cart ID</th>
                <th>Stage</th>
                <th>Coupon</th>
                <th>Opted Out</th>
              </tr>
            </thead>
            <tbody>
              {abandonRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.cartId}</td>
                  <td>{a.stage}</td>
                  <td>{a.couponCode ?? "—"}</td>
                  <td>{a.optedOut ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
