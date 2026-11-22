import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CouponsManager } from "@/components/admin/coupons-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { campaigns } from "@/modules/pricing/schema";

export const metadata: Metadata = {
  title: "Flash Sales & Campaigns | Admin",
};

export default async function AdminCampaignsPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "coupon:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const campaignRows = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .limit(50);

  return (
    <section aria-labelledby="campaigns-heading" className="space-y-4">
      <h2 id="campaigns-heading" className="sr-only">
        Flash Sales &amp; Campaigns
      </h2>
      <CouponsManager
        section="campaigns"
        coupons={[]}
        campaigns={campaignRows.map((cp) => ({
          id: cp.id,
          name: cp.name,
          type: cp.type,
          status: cp.status,
          startsAt: cp.startsAt.toISOString(),
          endsAt: cp.endsAt.toISOString(),
        }))}
        specialDays={[]}
      />
    </section>
  );
}
