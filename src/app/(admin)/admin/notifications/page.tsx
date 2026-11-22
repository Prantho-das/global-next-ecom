import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationsManager } from "@/components/admin/notifications-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { notificationLogs, templates } from "@/modules/notify/schema";

export const metadata: Metadata = {
  title: "Notifications | Admin",
};

export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "notification:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [templateRows, logRows] = await Promise.all([
    db.select().from(templates),
    db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.createdAt))
      .limit(50),
  ]);

  return (
    <section aria-labelledby="notify-heading" className="space-y-4">
      <h2 id="notify-heading" className="sr-only">
        Notifications &amp; Templates
      </h2>
      <NotificationsManager templates={templateRows} logs={logRows} />
    </section>
  );
}
