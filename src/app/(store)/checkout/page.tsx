import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { CheckoutForm } from "@/components/store/checkout-form";
import { getSession } from "@/lib/auth";
import { getActiveCartView } from "@/modules/sales/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export const metadata: Metadata = {
  title: "চেকআউট | BASA World",
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
    <div className="py-6 font-sans">
      {cart.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-12 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-800">আপনার ব্যাগ খালি</h2>
          <p className="text-xs text-slate-500">
            চেকআউট করতে প্রথমে পণ্য নির্বাচন করে ব্যাগে যোগ করুন।
          </p>
          <Link
            href="/products"
            className="inline-block bg-[#5F9118] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
          >
            পণ্য ব্রাউজ করুন
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
    </div>
  );
}
