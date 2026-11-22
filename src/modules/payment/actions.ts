"use server";

import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getPaymentAdapter } from "@/modules/payment/adapters";
import type { PaymentGatewayCode } from "@/modules/payment/adapter";
import { paymentProviders, refunds } from "@/modules/payment/schema";
import { orders, payments } from "@/modules/sales/schema";

const upsertProviderSchema = z.object({
  code: z.enum(["sslcommerz", "bkash", "nagad", "cod"]),
  name: z.string().trim().min(1).max(80),
  config: z.record(z.string(), z.string()),
  isActive: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
  sandboxMode: z.boolean().default(true),
});

const initiateRefundSchema = z.object({
  paymentId: z.string().min(1),
  amountPoisha: z.number().int().min(1),
  reason: z.string().trim().min(2).max(200),
});

export const upsertPaymentProviderAction = createAction({
  permission: "setting:update",
  schema: upsertProviderSchema,
  revalidateTags: ["payment_providers"],
  audit: {
    action: "upsert_provider",
    entity: "payment_provider",
    getEntityId: (_out, input) => input.code,
  },
  handler: async (input) => {
    const db = getDb();
    const configEnc = encryptSecret(JSON.stringify(input.config));
    await db
      .insert(paymentProviders)
      .values({
        id: randomUUID(),
        code: input.code,
        name: input.name,
        configEnc,
        isActive: input.isActive ?? true,
        position: input.position ?? 0,
        sandboxMode: input.sandboxMode ?? true,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: input.name,
          configEnc,
          isActive: input.isActive ?? true,
          position: input.position ?? 0,
          sandboxMode: input.sandboxMode ?? true,
          updatedAt: new Date(),
        },
      });
    return { code: input.code };
  },
});

export const initiateRefundAction = createAction({
  permission: "order:update",
  schema: initiateRefundSchema,
  revalidateTags: ["orders", "payments"],
  audit: {
    action: "refund",
    entity: "payment",
    getEntityId: (_out, input) => input.paymentId,
  },
  handler: async (input) => {
    const db = getDb();
    const payRows = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        method: payments.method,
        gatewayTxnId: payments.gatewayTxnId,
        amount: payments.amount,
        refundedAmount: payments.refundedAmount,
      })
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);

    const payment = payRows[0];
    if (payment === undefined) {
      throw new AppError("NOT_FOUND", "Payment not found");
    }
    if (payment.refundedAmount + input.amountPoisha > payment.amount) {
      throw new AppError("CONFLICT", "Refund exceeds captured payment amount");
    }

    const provRows = await db
      .select({
        configEnc: paymentProviders.configEnc,
        sandboxMode: paymentProviders.sandboxMode,
      })
      .from(paymentProviders)
      .where(eq(paymentProviders.code, payment.method))
      .limit(1);

    const config =
      provRows[0] !== undefined
        ? (JSON.parse(decryptSecret(provRows[0].configEnc)) as Record<
            string,
            string
          >)
        : {};

    const adapter = getPaymentAdapter(payment.method as PaymentGatewayCode);
    const refundRes = await adapter.refund({
      gatewayTxnId: payment.gatewayTxnId ?? "",
      amountPoisha: input.amountPoisha,
      reason: input.reason,
      config,
      sandboxMode: provRows[0]?.sandboxMode ?? true,
    });

    const refundId = randomUUID();
    const nextRefunded = payment.refundedAmount + input.amountPoisha;
    const nextPayStatus =
      nextRefunded >= payment.amount ? "refunded" : "partially_refunded";

    await db.transaction(async (tx) => {
      await tx.insert(refunds).values({
        id: refundId,
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: input.amountPoisha,
        reason: input.reason,
        status: refundRes.refunded ? "processed" : "failed",
        gatewayRefundId: refundRes.gatewayRefundId,
        processedAt: new Date(),
      });
      await tx
        .update(payments)
        .set({
          refundedAmount: nextRefunded,
          status: refundRes.refunded ? "refunded" : "completed",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      await tx
        .update(orders)
        .set({ paymentStatus: nextPayStatus, updatedAt: new Date() })
        .where(eq(orders.id, payment.orderId));
    });

    return { refundId, gatewayRefundId: refundRes.gatewayRefundId };
  },
});
