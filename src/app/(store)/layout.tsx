import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/store/cart-drawer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { TrackingPixels } from "@/components/store/tracking-pixels";
import { getSession } from "@/lib/auth";
import { getCategoriesTreeCached } from "@/modules/catalog/queries";
import { getActivePricingContext } from "@/modules/pricing/queries";
import { getActiveCartView } from "@/modules/sales/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export default async function StoreLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [session, cookieStore, settings, pricingCtx, categories] =
    await Promise.all([
      getSession(),
      cookies(),
      getSiteSettings(),
      getActivePricingContext(),
      getCategoriesTreeCached(),
    ]);

  const activeEventBanner =
    pricingCtx.specialDays.find(
      (sd) =>
        sd.banner !== undefined && sd.banner !== null && sd.banner.trim() !== "",
    )?.banner ?? "";

  const topBannerText =
    activeEventBanner !== ""
      ? activeEventBanner
      : settings.announcementBar.trim();

  if (settings.maintenanceMode) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-100 font-sans">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full border border-slate-200">
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {settings.siteName} is Under Maintenance
          </h1>
          <p className="text-sm text-slate-500">
            We are upgrading our store. Please check back shortly or contact{" "}
            <span className="font-semibold text-slate-700">
              {settings.supportEmail}
            </span>
            .
          </p>
        </div>
      </main>
    );
  }

  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);
  const cartCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

  const headerCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#5F9118] selection:text-white">
      <StoreHeader
        siteName={settings.siteName}
        announcement={topBannerText}
        cartCount={cartCount}
        categories={headerCategories}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {children}
      </main>

      <StoreFooter />

      <MobileBottomNav cartCount={cartCount} />

      <CartDrawer items={cart.items} subtotal={cart.subtotal} />

      <TrackingPixels
        metaPixelId={settings.metaPixelId}
        ga4MeasurementId={settings.ga4MeasurementId}
      />
    </div>
  );
}
