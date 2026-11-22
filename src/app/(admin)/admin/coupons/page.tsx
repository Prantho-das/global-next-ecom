import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CouponsManager } from "@/components/admin/coupons-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { coupons } from "@/modules/pricing/schema";

export const metadata: Metadata = {
  title: "Coupons | Admin",
};

export default async function AdminCouponsPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "coupon:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const couponRows = await db
    .select()
    .from(coupons)
    .orderBy(desc(coupons.createdAt))
    .limit(50);

  return (
    <section aria-labelledby="coupons-heading" className="space-y-4">
      <h2 id="coupons-heading" className="sr-only">
        Coupons
      </h2>
      <CouponsManager
        section="coupons"
        coupons={couponRows.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minCart: c.minCart,
          status: c.status,
          expiresAt: c.expiresAt.toISOString(),
        }))}
        campaigns={[]}
        specialDays={[]}
      />
    </section>
  );
}
