import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CouponsManager } from "@/components/admin/coupons-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { campaignRules, specialDays } from "@/modules/pricing/schema";

export const metadata: Metadata = {
  title: "Yearly Event Promotions | Admin",
};

export default async function AdminEventsPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "coupon:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const specialRows = await db
    .select({
      id: specialDays.id,
      name: specialDays.name,
      startsAt: specialDays.startsAt,
      endsAt: specialDays.endsAt,
      banner: specialDays.banner,
      discountType: campaignRules.discountType,
      value: campaignRules.value,
    })
    .from(specialDays)
    .innerJoin(campaignRules, eq(specialDays.ruleId, campaignRules.id))
    .orderBy(desc(specialDays.startsAt))
    .limit(50);

  return (
    <section aria-labelledby="events-heading" className="space-y-4">
      <h2 id="events-heading" className="sr-only">
        Yearly Event Promotions
      </h2>
      <CouponsManager
        section="events"
        coupons={[]}
        campaigns={[]}
        specialDays={specialRows.map((sd) => ({
          id: sd.id,
          name: sd.name,
          startsAt: sd.startsAt.toISOString(),
          endsAt: sd.endsAt.toISOString(),
          banner: sd.banner,
          discountType: sd.discountType,
          value: sd.value,
        }))}
      />
    </section>
  );
}
