import { randomUUID } from "crypto";

import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { otpCodes } from "@/modules/auth/schema";
import { variants } from "@/modules/catalog/schema";
import { shipments } from "@/modules/courier/schema";
import { emitNotification } from "@/modules/notify/bus";
import { campaigns, specialDays } from "@/modules/pricing/schema";
import { aggSalesDaily, cronJobRuns } from "@/modules/report/schema";
import { aggregateSalesByDay } from "@/modules/report/service";
import { carts, orders } from "@/modules/sales/schema";

const LOW_STOCK_THRESHOLD = 5;

export async function runObservableCronJob<T extends Record<string, unknown>>(
  jobName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const db = getDb();
  const runId = randomUUID();
  const startedAt = new Date();
  await db.insert(cronJobRuns).values({
    id: runId,
    jobName,
    status: "running",
    startedAt,
  });

  try {
    const summary = await fn();
    await db
      .update(cronJobRuns)
      .set({
        status: "completed",
        summary,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cronJobRuns.id, runId));
    logger.info("Cron job completed", { jobName, summary });
    return summary;
  } catch (err) {
    await db
      .update(cronJobRuns)
      .set({
        status: "failed",
        summary: { error: err instanceof Error ? err.message : String(err) },
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cronJobRuns.id, runId));
    logger.error("Cron job failed", {
      jobName,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function runReportAggregateJob(mode: "hourly" | "nightly") {
  return runObservableCronJob(`report.aggregate.${mode}`, async () => {
    const db = getDb();
    const since =
      mode === "hourly"
        ? new Date(Date.now() - 48 * 60 * 60 * 1000)
        : new Date(0);
    const orderRows = await db
      .select({
        createdAt: orders.createdAt,
        status: orders.status,
        total: orders.total,
        discountTotal: orders.discountTotal,
        shippingFee: orders.shippingFee,
      })
      .from(orders)
      .where(and(isNull(orders.deletedAt), gt(orders.createdAt, since)));

    const buckets = aggregateSalesByDay(orderRows);
    for (const b of buckets) {
      await db
        .insert(aggSalesDaily)
        .values({
          id: randomUUID(),
          day: b.day,
          ordersCount: b.ordersCount,
          revenue: b.revenue,
          discountTotal: b.discountTotal,
          shippingTotal: b.shippingTotal,
        })
        .onConflictDoUpdate({
          target: aggSalesDaily.day,
          set: {
            ordersCount: b.ordersCount,
            revenue: b.revenue,
            discountTotal: b.discountTotal,
            shippingTotal: b.shippingTotal,
            updatedAt: new Date(),
          },
        });
    }
    return { daysUpdated: buckets.length };
  });
}

export async function runCampaignLifecycleJob(now: Date = new Date()) {
  return runObservableCronJob("campaign.activate_expire", async () => {
    const db = getDb();
    const activated = await db
      .update(campaigns)
      .set({ status: "active", updatedAt: now })
      .where(
        and(
          eq(campaigns.status, "scheduled"),
          lte(campaigns.startsAt, now),
          gt(campaigns.endsAt, now),
        ),
      )
      .returning({ id: campaigns.id });

    const expired = await db
      .update(campaigns)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(campaigns.status, "active"), lte(campaigns.endsAt, now)))
      .returning({ id: campaigns.id });

    return { activated: activated.length, expired: expired.length };
  });
}

export async function runSpecialDayToggleJob(now: Date = new Date()) {
  return runObservableCronJob("special_day.toggle", async () => {
    const db = getDb();
    const active = await db
      .select({ id: specialDays.id })
      .from(specialDays)
      .where(and(lte(specialDays.startsAt, now), gt(specialDays.endsAt, now)));
    return { activeSpecialDays: active.length };
  });
}

export async function runCourierSyncJob() {
  return runObservableCronJob("courier.sync_status", async () => {
    const db = getDb();
    const pending = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(eq(shipments.status, "in_transit"))
      .limit(100);
    return { checkedShipments: pending.length };
  });
}

export async function runCodReconcileJob() {
  return runObservableCronJob("cod.reconcile", async () => {
    const db = getDb();
    const rows = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(shipments)
      .where(
        and(
          eq(shipments.status, "delivered"),
          sql`${shipments.codAmount} > ${shipments.codCollected}`,
        ),
      );
    return { mismatchedShipments: rows[0]?.count ?? 0 };
  });
}

export async function runStockLowAlertJob() {
  return runObservableCronJob("stock.low_alert", async () => {
    const db = getDb();
    const low = await db
      .select({ id: variants.id, sku: variants.sku, stock: variants.stock })
      .from(variants)
      .where(
        and(isNull(variants.deletedAt), lte(variants.stock, LOW_STOCK_THRESHOLD)),
      )
      .limit(50);

    if (low.length > 0) {
      await emitNotification("stock.low", {
        vars: { count: low.length, firstSku: low[0]?.sku ?? "" },
      });
    }
    return { lowStockVariants: low.length };
  });
}

export async function runSitemapRevalidateJob() {
  return runObservableCronJob("sitemap.revalidate", async () => {
    revalidateTag("products");
    revalidateTag("categories");
    return { revalidated: true };
  });
}

export async function runCleanupJob(now: Date = new Date()) {
  return runObservableCronJob("cleanup", async () => {
    const db = getDb();
    const deletedOtps = await db
      .delete(otpCodes)
      .where(lte(otpCodes.expiresAt, now))
      .returning({ id: otpCodes.id });
    const expiredCartCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredCarts = await db
      .update(carts)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(carts.status, "active"),
          lte(carts.lastActivityAt, expiredCartCutoff),
        ),
      )
      .returning({ id: carts.id });

    return {
      purgedOtps: deletedOtps.length,
      expiredCarts: expiredCarts.length,
    };
  });
}
