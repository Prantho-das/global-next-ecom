"use server";

import { randomUUID } from "crypto";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeBdPhone } from "@/modules/auth/otp-service";
import { products, stockMovements, variants } from "@/modules/catalog/schema";
import { emitNotification } from "@/modules/notify/bus";
import type { NotificationEventType } from "@/modules/notify/service";
import {
  assertValidOrderTransition,
  ORDER_STATUSES,
  shouldRestockOnTransition,
} from "@/modules/order/service";
import type { OrderStatus } from "@/modules/order/service";
import { couponRedemptions } from "@/modules/pricing/schema";
import {
  customers,
  orderEvents,
  orderItems,
  orders,
  payments,
} from "@/modules/sales/schema";
import {
  computeFlatUnitPrice,
  generateOrderNumber,
} from "@/modules/sales/service";

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


const createAdminOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(10).max(20),
  division: z.string().trim().min(1).max(80).default("Dhaka"),
  district: z.string().trim().min(1).max(80).default("Dhaka"),
  thana: z.string().trim().min(1).max(80).default("Dhaka"),
  line: z.string().trim().min(3).max(300),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1),
  shippingFee: z.number().int().min(0).default(0),
  discountTotal: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["cod", "cash", "bkash", "nagad", "sslcommerz"]).default("cod"),
  paymentStatus: z.enum(["pending", "paid"]).default("pending"),
  status: z.enum(["pending", "confirmed", "processing"]).default("confirmed"),
  note: z.string().trim().max(300).optional(),
});

export const createAdminOrderAction = createAction({
  permission: "order:create",
  schema: createAdminOrderSchema,
  revalidateTags: ["orders", "products"],
  audit: {
    action: "create_manual",
    entity: "order",
    getEntityId: (out: { orderId: string }) => out.orderId,
  },
  handler: async (input, ctx) => {
    const db = getDb();
    const phone = normalizeBdPhone(input.customerPhone);
    const orderId = randomUUID();
    const orderNumber = generateOrderNumber();
    const idempotencyKey = `admin-${orderId}`;

    return db.transaction(async (tx) => {
      const existingCustomers = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.phone, phone))
        .limit(1);

      let customerId = existingCustomers[0]?.id;
      if (customerId === undefined) {
        customerId = randomUUID();
        await tx.insert(customers).values({
          id: customerId,
          phone,
          name: input.customerName,
          isGuest: true,
        });
      }

      const variantIds = input.items.map((i) => i.variantId);
      const lockedVars = await tx
        .select({
          id: variants.id,
          sku: variants.sku,
          price: variants.price,
          stock: variants.stock,
          productName: products.name,
          salePrice: products.salePrice,
        })
        .from(variants)
        .innerJoin(products, eq(variants.productId, products.id))
        .where(inArray(variants.id, variantIds))
        .for("update");

      const varMap = new Map(lockedVars.map((v) => [v.id, v]));
      let subtotal = 0;
      const resolvedItems: Array<{
        variantId: string;
        qty: number;
        priceSnapshot: number;
        nameSnapshot: string;
        skuSnapshot: string;
        nextStock: number;
      }> = [];

      for (const reqItem of input.items) {
        const v = varMap.get(reqItem.variantId);
        if (v === undefined) {
          throw new AppError("NOT_FOUND", "Selected variant not found");
        }
        if (v.stock < reqItem.qty) {
          throw new AppError(
            "CONFLICT",
            `Insufficient stock for ${v.productName} (${v.sku})`,
          );
        }
        const unitPrice = computeFlatUnitPrice(v.price, v.salePrice);
        subtotal += unitPrice * reqItem.qty;
        resolvedItems.push({
          variantId: v.id,
          qty: reqItem.qty,
          priceSnapshot: unitPrice,
          nameSnapshot: v.productName,
          skuSnapshot: v.sku,
          nextStock: v.stock - reqItem.qty,
        });
      }

      const discountTotal = input.discountTotal ?? 0;
      const shippingFee = input.shippingFee ?? 0;
      const orderStatus = input.status ?? "confirmed";
      const paymentStatus = input.paymentStatus ?? "pending";
      const paymentMethod = input.paymentMethod ?? "cod";
      const total = Math.max(0, subtotal - discountTotal + shippingFee);

      await tx.insert(orders).values({
        id: orderId,
        number: orderNumber,
        customerId,
        status: orderStatus,
        paymentStatus,
        subtotal,
        discountTotal,
        shippingFee,
        total,
        shippingAddress: {
          name: input.customerName,
          phone,
          division: input.division ?? "Dhaka",
          district: input.district ?? "Dhaka",
          thana: input.thana ?? "Dhaka",
          line: input.line,
        },
        note: input.note ?? null,
        idempotencyKey,
      });

      for (const item of resolvedItems) {
        await tx
          .update(variants)
          .set({ stock: item.nextStock, updatedAt: new Date() })
          .where(eq(variants.id, item.variantId));
        await tx.insert(stockMovements).values({
          id: randomUUID(),
          variantId: item.variantId,
          delta: -item.qty,
          reason: `Manual order ${orderNumber}`,
          refType: "order",
          refId: orderId,
        });
        await tx.insert(orderItems).values({
          id: randomUUID(),
          orderId,
          variantId: item.variantId,
          qty: item.qty,
          priceSnapshot: item.priceSnapshot,
          nameSnapshot: item.nameSnapshot,
          skuSnapshot: item.skuSnapshot,
        });
      }

      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId,
        fromStatus: null,
        toStatus: orderStatus,
        actor: ctx.userId ?? "admin",
        note: "Manual order created from admin",
      });

      await tx.insert(payments).values({
        id: randomUUID(),
        orderId,
        method: paymentMethod,
        status: paymentStatus,
        amount: total,
        idempotencyKey: `pay-${orderId}`,
        paidAt: paymentStatus === "paid" ? new Date() : null,
      });

      return { orderId, orderNumber, total };
    });
  },
});
