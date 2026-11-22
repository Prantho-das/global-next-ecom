import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { reviewFraudCheckAction } from "@/modules/fraud/actions";
import { blacklist, fraudChecks, fraudRules } from "@/modules/fraud/schema";

export const metadata: Metadata = {
  title: "Fraud Queue | Admin",
};

export default async function AdminFraudPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "fraud:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [checks, rules, entries] = await Promise.all([
    db.select().from(fraudChecks).orderBy(desc(fraudChecks.createdAt)).limit(30),
    db.select().from(fraudRules),
    db.select().from(blacklist).orderBy(desc(blacklist.createdAt)).limit(30),
  ]);

  return (
    <section aria-labelledby="fraud-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h2 id="fraud-heading" className="text-lg font-bold text-slate-900 m-0">
            Flagged Orders ({checks.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            Review high-risk orders and approve or reject fulfillment
          </p>
        </div>

        {checks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No fraud checks recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Score</th>
                  <th className="py-2.5 px-4">Decision</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {checks.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-xs text-indigo-600">
                      {c.orderId}
                    </td>
                    <td className="py-2.5 px-4 font-bold">{c.score}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {c.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex justify-end gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await reviewFraudCheckAction({
                              fraudCheckId: c.id,
                              decision: "approve",
                            });
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold transition"
                          >
                            Approve
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await reviewFraudCheckAction({
                              fraudCheckId: c.id,
                              decision: "reject",
                            });
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold transition"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Configured Rules ({rules.length})
          </h3>
          <p className="text-sm text-slate-500 m-0">
            {rules.map((r) => `${r.key}:${r.weight}`).join(", ") ||
              "Using default rule weights"}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Blacklist ({entries.length})
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400 m-0">No blacklisted entries.</p>
          ) : (
            <ul className="divide-y divide-slate-100 m-0 p-0 list-none text-sm">
              {entries.map((e) => (
                <li key={e.id} className="py-2 text-slate-700">
                  <strong className="text-slate-900">{e.type}:</strong> {e.value}{" "}
                  <span className="text-slate-400">({e.reason})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
