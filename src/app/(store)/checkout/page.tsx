import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { CheckoutForm } from "@/components/store/checkout-form";
import { getSession } from "@/lib/auth";
import { getActiveCartView } from "@/modules/sales/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export const metadata: Metadata = {
  title: "Checkout | BD Shop",
};

export default async function CheckoutPage() {
  const [session, cookieStore, siteSettings] = await Promise.all([
    getSession(),
    cookies(),
    getSiteSettings(),
  ]);
  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>Checkout</h1>
      {cart.items.length === 0 ? (
        <div className="card-panel white">
          <p className="grey-text">Your cart is empty.</p>
          <Link href="/products" className="btn waves-effect waves-light">
            Browse Products
          </Link>
        </div>
      ) : (
        <CheckoutForm
          items={cart.items}
          subtotal={cart.subtotal}
          shippingMode={siteSettings.shippingMode}
          insideDhakaFee={siteSettings.insideDhakaFee}
          outsideDhakaFee={siteSettings.outsideDhakaFee}
          defaultCountry={siteSettings.defaultCountry}
          shippingLocations={siteSettings.shippingLocations}
        />
      )}
    </main>
  );
}
