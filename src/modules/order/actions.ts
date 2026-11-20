"use server";

import { randomUUID } from "crypto";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { stockMovements, variants } from "@/modules/catalog/schema";
import { emitNotification } from "@/modules/notify/bus";
import type { NotificationEventType } from "@/modules/notify/service";
import {
  assertValidOrderTransition,
  ORDER_STATUSES,
  shouldRestockOnTransition,
} from "@/modules/order/service";
import type { OrderStatus } from "@/modules/order/service";
import { couponRedemptions } from "@/modules/pricing/schema";
import { orderEvents, orderItems, orders } from "@/modules/sales/schema";

const transitionOrderSchema = z.object({
  orderId: z.string().min(1),
  toStatus: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

const bulkTransitionSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(100),
  toStatus: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export const transitionOrderAction = createAction({
  permission: "order:update",
  schema: transitionOrderSchema,
  revalidateTags: ["orders", "products"],
  audit: {
    action: "transition",
    entity: "order",
    getEntityId: (_out, input) => input.orderId,
  },
  handler: async (input, ctx) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: orders.id, number: orders.number, status: orders.status })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      const order = rows[0];
      if (order === undefined) {
        throw new AppError("NOT_FOUND", "Order not found");
      }

      const fromStatus = order.status as OrderStatus;
      assertValidOrderTransition(fromStatus, input.toStatus);

      await tx
        .update(orders)
        .set({ status: input.toStatus, updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId: order.id,
        fromStatus,
        toStatus: input.toStatus,
        actor: ctx.userId ?? "admin",
        note: input.note ?? null,
      });

      if (shouldRestockOnTransition(input.toStatus)) {
        const items = await tx
          .select({ variantId: orderItems.variantId, qty: orderItems.qty })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        const varIds = items.map((i) => i.variantId);
        if (varIds.length > 0) {
          const lockedVars = await tx
            .select({ id: variants.id, stock: variants.stock })
            .from(variants)
            .where(inArray(variants.id, varIds))
            .for("update");
          const stockMap = new Map(lockedVars.map((v) => [v.id, v.stock]));
          for (const item of items) {
            const current = stockMap.get(item.variantId) ?? 0;
            await tx
              .update(variants)
              .set({ stock: current + item.qty, updatedAt: new Date() })
              .where(eq(variants.id, item.variantId));
            await tx.insert(stockMovements).values({
              id: randomUUID(),
              variantId: item.variantId,
              delta: item.qty,
              reason: `Order ${order.number} ${input.toStatus}`,
              refType: input.toStatus,
              refId: order.id,
            });
          }
        }
        if (input.toStatus === "cancelled") {
          await tx
            .delete(couponRedemptions)
            .where(eq(couponRedemptions.orderId, order.id));
        }
      }

      if (input.toStatus !== "pending" && input.toStatus !== "processing") {
        const evType = `order.${input.toStatus}` as NotificationEventType;
        await emitNotification(evType, {
          vars: { orderNumber: order.number },
        });
      }

      return { orderId: order.id, status: input.toStatus };
    });
  },
});

export const bulkTransitionOrdersAction = createAction({
  permission: "order:update",
  schema: bulkTransitionSchema,
  revalidateTags: ["orders"],
  audit: {
    action: "bulk_transition",
    entity: "order",
    getEntityId: () => "bulk",
  },
  handler: async (input, ctx) => {
    const db = getDb();
    let updated = 0;
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(inArray(orders.id, input.orderIds));
      for (const order of rows) {
        assertValidOrderTransition(order.status as OrderStatus, input.toStatus);
        await tx
          .update(orders)
          .set({ status: input.toStatus, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        await tx.insert(orderEvents).values({
          id: randomUUID(),
          orderId: order.id,
          fromStatus: order.status,
          toStatus: input.toStatus,
          actor: ctx.userId ?? "admin",
          note: input.note ?? "Bulk transition",
        });
        updated += 1;
      }
    });
    return { updated };
  },
});
