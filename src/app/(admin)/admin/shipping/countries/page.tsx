import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShippingManager } from "@/components/admin/shipping-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { getSiteSettings } from "@/modules/settings/queries";

export const metadata: Metadata = {
  title: "Shipping Countries | Admin",
};

export default async function AdminShippingCountriesPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "setting:view"))) {
    redirect("/admin");
  }
  const siteSettings = await getSiteSettings();
  return (
    <section className="space-y-4">
      <ShippingManager
        section="countries"
        globalThreshold={null}
        initialCountries={siteSettings.shippingCountries}
        initialStates={siteSettings.shippingStates}
        initialLocations={siteSettings.shippingLocations}
      />
    </section>
  );
}
