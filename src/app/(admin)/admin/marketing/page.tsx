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
    <section aria-labelledby="marketing-heading" className="space-y-4">
      <h2 id="marketing-heading" className="sr-only">
        Marketing, Segments &amp; Feeds
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Segments ({segmentRows.length})
          </div>
          <p className="text-sm text-slate-700 m-0">
            {segmentRows.map((s) => s.name).join(", ") || "None"}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Campaigns ({campaignRows.length})
          </div>
          <p className="text-sm text-slate-700 m-0">
            Referrals: {referralRows.length} | Tracking Events:{" "}
            {eventRows.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Product Feeds
          </div>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <a
              href="/api/feeds/google-merchant.xml"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1.5"
            >
              <i className="ti ti-file-code" />
              <span>Google Merchant XML</span>
            </a>
            <a
              href="/api/feeds/facebook-catalog.csv"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1.5"
            >
              <i className="ti ti-file-spreadsheet" />
              <span>Facebook Catalog CSV</span>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Abandoned Cart Logs ({abandonRows.length})
          </h3>
        </div>
        {abandonRows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No abandoned cart logs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Cart ID</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Coupon</th>
                  <th className="py-2.5 px-4 text-right">Opted Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {abandonRows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-xs text-indigo-600">
                      {a.cartId}
                    </td>
                    <td className="py-2.5 px-4">{a.stage}</td>
                    <td className="py-2.5 px-4">{a.couponCode ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right">
                      {a.optedOut ? "Yes" : "No"}
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
