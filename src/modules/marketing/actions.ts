"use server";

import { randomUUID } from "crypto";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  abandonCartLogs,
  backInStockAlerts,
  referrals,
  segments,
  wishlists,
} from "@/modules/marketing/schema";
import { carts } from "@/modules/sales/schema";

const captureAbandonSchema = z.object({
  contact: z.string().trim().min(5).max(160),
});

const createSegmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  rules: z.array(
    z.object({
      field: z.enum([
        "spent",
        "orders",
        "last_order_days",
        "category",
        "city",
        "tag",
      ]),
      op: z.enum(["gte", "lte", "eq", "includes"]),
      value: z.union([z.string(), z.number()]),
    }),
  ),
});

const toggleWishlistSchema = z.object({
  productId: z.string().min(1),
});

const backInStockSchema = z.object({
  variantId: z.string().min(1),
  contact: z.string().trim().min(5).max(160),
});

export const captureAbandonContactAction = createAction({
  schema: captureAbandonSchema,
  rateLimit: { key: "abandon_capture", limit: 20, windowSec: 60 },
  handler: async (input, ctx) => {
    const store = await cookies();
    const sid = store.get("ecom_cart_sid")?.value;
    if (sid === undefined && ctx.userId === null) {
      return { captured: false };
    }
    const db = getDb();
    const cartRows = await db
      .select({ id: carts.id })
      .from(carts)
      .where(
        ctx.userId !== null
          ? and(eq(carts.userId, ctx.userId), eq(carts.status, "active"))
          : and(eq(carts.sessionId, sid ?? ""), eq(carts.status, "active")),
      )
      .limit(1);
    const cart = cartRows[0];
    if (cart === undefined) {
      return { captured: false };
    }
    await db.insert(abandonCartLogs).values({
      id: randomUUID(),
      cartId: cart.id,
      stage: "captured",
      contact: input.contact,
    });
    return { captured: true, cartId: cart.id };
  },
});

export const createSegmentAction = createAction({
  permission: "marketing:create",
  schema: createSegmentSchema,
  revalidateTags: ["marketing"],
  audit: {
    action: "create",
    entity: "segment",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    await db.insert(segments).values({
      id,
      name: input.name,
      rules: input.rules,
    });
    return { id };
  },
});

export const createReferralCodeAction = createAction({
  schema: z.object({}),
  handler: async (_input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Sign in required");
    }
    const db = getDb();
    const code = `REF-${randomUUID().slice(0, 6).toUpperCase()}`;
    await db.insert(referrals).values({
      id: randomUUID(),
      referrerUserId: ctx.userId,
      code,
      status: "active",
      rewardAmount: 10000,
    });
    return { code };
  },
});

export const toggleWishlistAction = createAction({
  schema: toggleWishlistSchema,
  handler: async (input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Sign in required");
    }
    const db = getDb();
    const existing = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, ctx.userId),
          eq(wishlists.productId, input.productId),
        ),
      )
      .limit(1);
    if (existing[0] !== undefined) {
      await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
      return { saved: false };
    }
    await db.insert(wishlists).values({
      id: randomUUID(),
      userId: ctx.userId,
      productId: input.productId,
    });
    return { saved: true };
  },
});

export const subscribeBackInStockAction = createAction({
  schema: backInStockSchema,
  rateLimit: { key: "back_in_stock", limit: 10, windowSec: 60 },
  handler: async (input) => {
    const db = getDb();
    await db.insert(backInStockAlerts).values({
      id: randomUUID(),
      variantId: input.variantId,
      contact: input.contact,
    });
    return { subscribed: true };
  },
});
