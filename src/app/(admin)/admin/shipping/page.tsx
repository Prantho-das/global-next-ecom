import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShippingManager } from "@/components/admin/shipping-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { getAllShippingConfig } from "@/modules/shipping/queries";

export const metadata: Metadata = {
  title: "Shipping Zones | Admin",
};

export default async function AdminShippingPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "setting:view"))) {
    redirect("/admin");
  }

  const cfg = await getAllShippingConfig();

  return (
    <section aria-labelledby="shipping-heading">
      <h1 id="shipping-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Shipping Zones &amp; Rates
      </h1>
      <ShippingManager
        zones={cfg.zones}
        areas={cfg.areas}
        rates={cfg.rates}
        globalThreshold={cfg.settings?.freeShippingGlobalThreshold ?? null}
      />
    </section>
  );
}
