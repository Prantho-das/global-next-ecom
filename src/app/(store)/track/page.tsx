import type { Metadata } from "next";

import { TrackOrderClient } from "@/components/store/track-order-client";

export const metadata: Metadata = {
  title: "Track Order | BD Shop",
  description: "Verify your phone number via OTP to track your order status.",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; order?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>Track Your Order</h1>
      <TrackOrderClient
        initialPhone={params.phone ?? ""}
        initialOrder={params.order ?? ""}
      />
    </main>
  );
}
