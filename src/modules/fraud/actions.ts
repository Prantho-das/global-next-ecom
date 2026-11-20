"use server";

import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { blacklist, fraudChecks, fraudRules } from "@/modules/fraud/schema";
import { emitNotification } from "@/modules/notify/bus";
import { orderEvents, orders } from "@/modules/sales/schema";

const reviewFraudSchema = z.object({
  fraudCheckId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(300).optional(),
});

const updateFraudRuleSchema = z.object({
  key: z.string().min(1),
  weight: z.number().int().min(0).max(100),
  enabled: z.boolean(),
});

const addBlacklistSchema = z.object({
  type: z.enum(["phone", "ip", "email", "device", "address"]),
  value: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(2).max(200),
});

const deleteBlacklistSchema = z.object({
  id: z.string().min(1),
});

export const reviewFraudCheckAction = createAction({
  permission: "fraud:approve",
  schema: reviewFraudSchema,
  revalidateTags: ["orders", "fraud"],
  audit: {
    action: "review_fraud",
    entity: "fraud_check",
    getEntityId: (_out, input) => input.fraudCheckId,
  },
  handler: async (input, ctx) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const checks = await tx
        .select({ id: fraudChecks.id, orderId: fraudChecks.orderId })
        .from(fraudChecks)
        .where(eq(fraudChecks.id, input.fraudCheckId))
        .limit(1);
      const check = checks[0];
      if (check === undefined) {
        throw new AppError("NOT_FOUND", "Fraud check not found");
      }

      const nextOrderStatus =
        input.decision === "approve" ? "confirmed" : "cancelled";
      await tx
        .update(fraudChecks)
        .set({
          decision: input.decision === "approve" ? "approved" : "rejected",
          updatedAt: new Date(),
        })
        .where(eq(fraudChecks.id, check.id));

      await tx
        .update(orders)
        .set({ status: nextOrderStatus, updatedAt: new Date() })
        .where(eq(orders.id, check.orderId));

      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId: check.orderId,
        fromStatus: "on_hold",
        toStatus: nextOrderStatus,
        actor: ctx.userId ?? "admin",
        note: input.note ?? `Fraud review: ${input.decision}`,
      });

      await emitNotification(
        input.decision === "approve" ? "order.confirmed" : "fraud.flagged",
        { vars: { orderId: check.orderId, decision: input.decision } },
      );

      return { orderId: check.orderId, status: nextOrderStatus };
    });
  },
});

export const updateFraudRuleAction = createAction({
  permission: "fraud:update",
  schema: updateFraudRuleSchema,
  revalidateTags: ["fraud"],
  audit: {
    action: "update_rule",
    entity: "fraud_rule",
    getEntityId: (_out, input) => input.key,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .insert(fraudRules)
      .values({
        id: randomUUID(),
        key: input.key,
        weight: input.weight,
        enabled: input.enabled,
      })
      .onConflictDoUpdate({
        target: fraudRules.key,
        set: {
          weight: input.weight,
          enabled: input.enabled,
          updatedAt: new Date(),
        },
      });
    return { key: input.key };
  },
});

export const addBlacklistAction = createAction({
  permission: "fraud:create",
  schema: addBlacklistSchema,
  revalidateTags: ["fraud"],
  audit: {
    action: "create",
    entity: "blacklist",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    await db.insert(blacklist).values({
      id,
      type: input.type,
      value: input.value,
      reason: input.reason,
    });
    return { id };
  },
});

export const removeBlacklistAction = createAction({
  permission: "fraud:delete",
  schema: deleteBlacklistSchema,
  revalidateTags: ["fraud"],
  audit: {
    action: "delete",
    entity: "blacklist",
    getEntityId: (_out, input) => input.id,
  },
  handler: async (input) => {
    const db = getDb();
    await db.delete(blacklist).where(eq(blacklist.id, input.id));
    return { id: input.id };
  },
});
