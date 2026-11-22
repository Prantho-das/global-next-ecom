import "@materializecss/materialize/dist/css/materialize.min.css";
import { cookies } from "next/headers";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { CartDrawer } from "@/components/store/cart-drawer";
import { TrackingPixels } from "@/components/store/tracking-pixels";
import { getSession } from "@/lib/auth";
import { getActivePricingContext } from "@/modules/pricing/queries";
import { getActiveCartView } from "@/modules/sales/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export default async function StoreLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [session, cookieStore, settings, pricingCtx] = await Promise.all([
    getSession(),
    cookies(),
    getSiteSettings(),
    getActivePricingContext(),
  ]);
  const activeEventBanner =
    pricingCtx.specialDays.find(
      (sd) => sd.banner !== undefined && sd.banner !== null && sd.banner.trim() !== "",
    )?.banner ?? "";
  const topBannerText =
    activeEventBanner !== ""
      ? activeEventBanner
      : settings.announcementBar.trim();

  if (settings.maintenanceMode) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div className="card white" style={{ maxWidth: "460px", padding: "24px" }}>
          <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>
            {settings.siteName} is Under Maintenance
          </h1>
          <p className="grey-text">
            We are upgrading our store. Please check back shortly or contact{" "}
            {settings.supportEmail}.
          </p>
        </div>
      </main>
    );
  }

  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);

  return (
    <div
      style={
        {
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          "--brand-primary": settings.primaryColor,
        } as CSSProperties
      }
    >
      {topBannerText !== "" && (
        <div
          style={{
            backgroundColor: settings.primaryColor,
            color: "#ffffff",
            textAlign: "center",
            padding: "6px 12px",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {topBannerText}
        </div>
      )}

      <header>
        <nav
          className="blue-grey darken-4"
          style={{ borderBottom: `3px solid ${settings.primaryColor}` }}
          aria-label="Storefront navigation"
        >
          <div className="nav-wrapper container">
            <Link
              href="/"
              className="brand-logo"
              style={{
                fontSize: "1.35rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {settings.logoUrl.trim() !== "" && (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  style={{ height: "28px", width: "auto" }}
                />
              )}
              <span>{settings.siteName}</span>
            </Link>
            <ul className="right">
              <li>
                <Link href="/products">Shop</Link>
              </li>
              <li>
                <Link href="/track">Track Order</Link>
              </li>
              <li>
                <Link href="/cart">
                  Cart ({cart.items.reduce((sum, i) => sum + i.qty, 0)})
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <CartDrawer items={cart.items} subtotal={cart.subtotal} />
      <TrackingPixels
        metaPixelId={settings.metaPixelId}
        ga4MeasurementId={settings.ga4MeasurementId}
      />

      <footer className="page-footer blue-grey darken-4" style={{ marginTop: "48px" }}>
        <div className="container">
          <p className="white-text">
            {settings.siteName} — {settings.tagline} ({settings.supportPhone})
          </p>
        </div>
      </footer>
    </div>
  );
}
