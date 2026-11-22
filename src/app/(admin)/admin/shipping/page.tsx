import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShippingManager } from "@/components/admin/shipping-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { getSiteSettings } from "@/modules/settings/queries";
import { getAllShippingConfig } from "@/modules/shipping/queries";

export const metadata: Metadata = {
  title: "Shipping | Admin",
};

export default async function AdminShippingPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "setting:view"))) {
    redirect("/admin");
  }

  const [cfg, siteSettings] = await Promise.all([
    getAllShippingConfig(),
    getSiteSettings(),
  ]);

  return (
    <section aria-labelledby="shipping-heading" className="space-y-4">
      <h2 id="shipping-heading" className="sr-only">
        Shipping Locations &amp; Rates
      </h2>
      <ShippingManager
        section="settings"
        globalThreshold={cfg.settings?.freeShippingGlobalThreshold ?? null}
        initialCountries={siteSettings.shippingCountries}
        initialStates={siteSettings.shippingStates}
        initialLocations={siteSettings.shippingLocations}
        initialMode={siteSettings.shippingMode}
        initialInsideFee={siteSettings.insideDhakaFee}
        initialOutsideFee={siteSettings.outsideDhakaFee}
      />
    </section>
  );
}
