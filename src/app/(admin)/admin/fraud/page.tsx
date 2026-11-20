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
    <section aria-labelledby="fraud-heading">
      <h1 id="fraud-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Fraud Review Queue &amp; Rules
      </h1>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Flagged Orders ({checks.length})</span>
          {checks.length === 0 ? (
            <p className="grey-text">No fraud checks recorded yet.</p>
          ) : (
            <table className="striped">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Score</th>
                  <th>Decision</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id}>
                    <td>{c.orderId}</td>
                    <td>{c.score}</td>
                    <td>{c.decision}</td>
                    <td style={{ display: "flex", gap: "8px" }}>
                      <form
                        action={async () => {
                          "use server";
                          await reviewFraudCheckAction({
                            fraudCheckId: c.id,
                            decision: "approve",
                          });
                        }}
                      >
                        <button type="submit" className="btn-small green">
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
                        <button type="submit" className="btn-small red">
                          Reject
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Configured Rules ({rules.length})</span>
              <p className="grey-text">
                {rules.map((r) => `${r.key}:${r.weight}`).join(", ") ||
                  "Using default rule weights"}
              </p>
            </div>
          </div>
        </div>
        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Blacklist ({entries.length})</span>
              <ul className="collection">
                {entries.map((e) => (
                  <li key={e.id} className="collection-item">
                    {e.type}: {e.value} ({e.reason})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
