"use server";

import { randomUUID } from "crypto";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { enqueueJob, registerJobHandler } from "@/lib/queue";
import type { CourierCode } from "@/modules/courier/adapter";
import { getCourierAdapter } from "@/modules/courier/adapters";
import {
  codSettlements,
  courierProviders,
  shipments,
} from "@/modules/courier/schema";
import {
  assertFraudAllowsCourierBooking,
  bookWithRetryAndFallback,
} from "@/modules/courier/service";
import { fraudChecks } from "@/modules/fraud/schema";
import { orderEvents, orders } from "@/modules/sales/schema";

const upsertCourierSchema = z.object({
  code: z.enum(["steadfast", "pathao", "redx"]),
  config: z.record(z.string(), z.string()),
  status: z.enum(["active", "inactive"]).default("active"),
});

const bookCourierSchema = z.object({
  orderId: z.string().min(1),
});

const settleCodSchema = z.object({
  provider: z.enum(["steadfast", "pathao", "redx"]),
  batchRef: z.string().trim().min(1).max(80),
  totalCollected: z.number().int().min(0),
  totalFee: z.number().int().min(0),
});

registerJobHandler("courier.book", async (payload) => {
  const orderId = String(payload["orderId"] ?? "");
  if (orderId === "") {
    return;
  }
  const db = getDb();
  const orderRows = await db
    .select({
      id: orders.id,
      number: orders.number,
      total: orders.total,
      paymentStatus: orders.paymentStatus,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderRows[0];
  if (order === undefined) {
    return;
  }

  const provRows = await db
    .select({ code: courierProviders.code, configEnc: courierProviders.configEnc })
    .from(courierProviders)
    .where(eq(courierProviders.status, "active"));
  if (provRows.length === 0) {
    return;
  }

  const candidates = provRows.map((p, idx) => ({
    adapter: getCourierAdapter(p.code as CourierCode),
    config: JSON.parse(decryptSecret(p.configEnc)) as Record<string, string>,
    successRate: 1,
    isDefault: idx === 0,
  }));

  const booked = await bookWithRetryAndFallback({
    booking: {
      orderNumber: order.number,
      recipientName: order.shippingAddress.name,
      recipientPhone: order.shippingAddress.phone,
      recipientAddress: order.shippingAddress.line,
      division: order.shippingAddress.division,
      district: order.shippingAddress.district,
      thana: order.shippingAddress.thana,
      codAmountPoisha: order.paymentStatus === "paid" ? 0 : order.total,
      weightG: 500,
    },
    candidates,
    backoffMs: 250,
  });

  await db.transaction(async (tx) => {
    await tx.insert(shipments).values({
      id: randomUUID(),
      orderId: order.id,
      provider: booked.provider,
      consignmentId: booked.result.consignmentId,
      trackingCode: booked.result.trackingCode,
      status: "pending",
      codAmount: order.paymentStatus === "paid" ? 0 : order.total,
      fee: booked.result.feePoisha,
      raw: booked.result.raw,
    });
    await tx
      .update(orders)
      .set({ status: "shipped", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: order.id,
      fromStatus: "processing",
      toStatus: "shipped",
      actor: "queue:courier.book",
      note: `Booked with ${booked.provider}: ${booked.result.trackingCode}`,
    });
  });
});

export const upsertCourierProviderAction = createAction({
  permission: "courier:update",
  schema: upsertCourierSchema,
  revalidateTags: ["courier"],
  audit: {
    action: "upsert_provider",
    entity: "courier_provider",
    getEntityId: (_out, input) => input.code,
  },
  handler: async (input) => {
    const db = getDb();
    const configEnc = encryptSecret(JSON.stringify(input.config));
    await db
      .insert(courierProviders)
      .values({
        id: randomUUID(),
        code: input.code,
        configEnc,
        status: input.status ?? "active",
      })
      .onConflictDoUpdate({
        target: courierProviders.code,
        set: {
          configEnc,
          status: input.status ?? "active",
          updatedAt: new Date(),
        },
      });
    return { code: input.code };
  },
});

export const enqueueCourierBookingAction = createAction({
  permission: "courier:create",
  schema: bookCourierSchema,
  revalidateTags: ["orders", "courier"],
  audit: {
    action: "enqueue_booking",
    entity: "order",
    getEntityId: (_out, input) => input.orderId,
  },
  handler: async (input) => {
    const db = getDb();
    const [orderRows, checkRows] = await Promise.all([
      db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1),
      db
        .select({ decision: fraudChecks.decision })
        .from(fraudChecks)
        .where(eq(fraudChecks.orderId, input.orderId))
        .orderBy(desc(fraudChecks.createdAt))
        .limit(1),
    ]);

    const order = orderRows[0];
    if (order === undefined) {
      throw new AppError("NOT_FOUND", "Order not found");
    }
    if (order.status === "on_hold") {
      throw new AppError(
        "CONFLICT",
        "Cannot book courier while order is on fraud hold",
      );
    }
    if (checkRows[0] !== undefined) {
      assertFraudAllowsCourierBooking(checkRows[0].decision);
    }

    const job = await enqueueJob("courier.book", { orderId: input.orderId });
    return { queued: true, jobId: job.id };
  },
});

export const reconcileCodSettlementAction = createAction({
  permission: "courier:update",
  schema: settleCodSchema,
  revalidateTags: ["courier"],
  audit: {
    action: "reconcile_cod",
    entity: "cod_settlement",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    const netAmount = input.totalCollected - input.totalFee;
    await db.insert(codSettlements).values({
      id,
      provider: input.provider,
      batchRef: input.batchRef,
      totalCollected: input.totalCollected,
      totalFee: input.totalFee,
      netAmount,
      status: "settled",
      settledAt: new Date(),
    });
    return { id, netAmount };
  },
});
