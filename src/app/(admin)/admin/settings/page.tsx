import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsManager } from "@/components/admin/settings-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { courierProviders } from "@/modules/courier/schema";
import { fraudRules } from "@/modules/fraud/schema";
import { paymentProviders } from "@/modules/payment/schema";
import { getSiteSettings } from "@/modules/settings/queries";

export const metadata: Metadata = {
  title: "Advanced Settings | Admin",
};

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "setting:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [settings, payRows, courRows, ruleRows] = await Promise.all([
    getSiteSettings(),
    db
      .select({
        code: paymentProviders.code,
        name: paymentProviders.name,
        isActive: paymentProviders.isActive,
        sandboxMode: paymentProviders.sandboxMode,
      })
      .from(paymentProviders)
      .orderBy(asc(paymentProviders.position)),
    db
      .select({
        code: courierProviders.code,
        status: courierProviders.status,
      })
      .from(courierProviders),
    db
      .select({
        key: fraudRules.key,
        weight: fraudRules.weight,
        enabled: fraudRules.enabled,
      })
      .from(fraudRules),
  ]);

  return (
    <section aria-labelledby="settings-heading" className="space-y-4">
      <h2 id="settings-heading" className="sr-only">
        Advanced Site Settings
      </h2>
      <SettingsManager
        initialSettings={settings}
        paymentProviders={payRows}
        courierProviders={courRows}
        fraudRules={ruleRows}
      />
    </section>
  );
}
