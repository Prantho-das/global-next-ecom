import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { auditLogs, users } from "@/modules/rbac/schema";

export const metadata: Metadata = {
  title: "Audit Logs | Admin",
};

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "audit:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      ip: auditLogs.ip,
      createdAt: auditLogs.createdAt,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return (
    <section aria-labelledby="audit-heading" className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h2 id="audit-heading" className="text-base font-bold text-slate-900 m-0">
            Audit Logs ({rows.length})
          </h2>
          <p className="text-xs text-slate-500 m-0">
            Immutable trail of administrative mutations
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No audit logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                  <th className="py-2.5 px-4">IP</th>
                  <th className="py-2.5 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {r.actorEmail ?? "System"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                        {r.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">{r.entity}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {r.entityId}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {r.ip ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
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
