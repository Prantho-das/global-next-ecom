import { randomUUID } from "crypto";

import { and, eq, lte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { abandonCartLogs } from "@/modules/marketing/schema";
import {
  resolveAbandonStage,
  signRecoveryToken,
} from "@/modules/marketing/service";
import type { AbandonStage } from "@/modules/marketing/service";
import { emitNotification } from "@/modules/notify/bus";
import { coupons } from "@/modules/pricing/schema";
import { carts, orders } from "@/modules/sales/schema";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export async function runAbandonCartScanJob(
  now: Date = new Date(),
): Promise<{ processed: number }> {
  const db = getDb();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const idleCarts = await db
    .select()
    .from(carts)
    .where(
      and(eq(carts.status, "active"), lte(carts.lastActivityAt, oneHourAgo)),
    )
    .limit(100);

  let processed = 0;
  const secret = getEnv().BETTER_AUTH_SECRET;

  for (const cart of idleCarts) {
    const logs = await db
      .select()
      .from(abandonCartLogs)
      .where(eq(abandonCartLogs.cartId, cart.id));

    const contact = logs[0]?.contact;
    if (contact === undefined) {
      continue;
    }
    const optedOut = logs.some((l) => l.optedOut);
    const sentStages = logs
      .map((l) => l.stage)
      .filter(
        (s): s is AbandonStage => s === "1h" || s === "24h" || s === "72h",
      );

    const nextStage = resolveAbandonStage({
      cartStatus: cart.status,
      optedOut,
      lastActivityAt: cart.lastActivityAt,
      sentStages,
      now,
    });
    if (nextStage === null) {
      continue;
    }

    let couponCode: string | null = null;
    if (nextStage === "24h") {
      couponCode = `RECOVER-${randomUUID().slice(0, 4).toUpperCase()}`;
      await db.insert(coupons).values({
        id: randomUUID(),
        code: couponCode,
        type: "pct",
        value: 10,
        minCart: 0,
        usageLimit: 1,
        perUserLimit: 1,
        startsAt: now,
        expiresAt: new Date(now.getTime() + FORTY_EIGHT_HOURS_MS),
        scope: "all",
        stackable: false,
        status: "active",
      });
    }

    const token = signRecoveryToken(
      cart.id,
      now.getTime() + FORTY_EIGHT_HOURS_MS,
      secret,
    );
    await db.insert(abandonCartLogs).values({
      id: randomUUID(),
      cartId: cart.id,
      stage: nextStage,
      couponCode,
      contact,
    });

    await emitNotification("cart.abandoned", {
      userId: cart.userId,
      email: contact.includes("@") ? contact : null,
      phone: contact.includes("@") ? null : contact,
      vars: {
        recoveryPath: `/cart/recover/${token}`,
        couponCode: couponCode ?? "",
        stage: nextStage,
      },
    });
    processed += 1;
  }

  return { processed };
}

export async function runPostDeliveryReviewRequests(
  now: Date = new Date(),
): Promise<{ sent: number }> {
  const db = getDb();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const delivered = await db
    .select({ id: orders.id, number: orders.number })
    .from(orders)
    .where(
      and(eq(orders.status, "delivered"), lte(orders.updatedAt, threeDaysAgo)),
    )
    .limit(50);

  for (const ord of delivered) {
    await emitNotification("order.delivered", {
      vars: { orderNumber: ord.number, reviewPrompt: "true" },
    });
  }
  return { sent: delivered.length };
}
