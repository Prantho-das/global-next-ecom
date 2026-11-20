import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { verifyRecoveryToken } from "@/modules/marketing/service";
import { carts } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Recover Cart | BD Shop",
};

export default async function RecoverCartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyRecoveryToken(token, getEnv().BETTER_AUTH_SECRET);

  if (verified === null) {
    return (
      <main className="container" style={{ paddingTop: "32px" }}>
        <div className="card-panel red lighten-5">
          <h1 style={{ fontSize: "1.5rem", marginTop: 0 }}>
            Recovery link expired or invalid
          </h1>
          <Link href="/products" className="btn">
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  const db = getDb();
  await db
    .update(carts)
    .set({ status: "recovered", updatedAt: new Date() })
    .where(eq(carts.id, verified.cartId));

  return (
    <main className="container" style={{ paddingTop: "32px" }}>
      <div className="card-panel green lighten-5">
        <h1 style={{ fontSize: "1.5rem", marginTop: 0 }}>
          Welcome back! Your cart is ready.
        </h1>
        <Link href="/checkout" className="btn">
          Complete Checkout
        </Link>
      </div>
    </main>
  );
}
