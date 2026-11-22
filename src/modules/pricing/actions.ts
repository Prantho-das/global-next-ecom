"use server";

import { randomUUID } from "crypto";

import { eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { productCategories, products, variants } from "@/modules/catalog/schema";
import {
  getActivePricingContext,
  getCouponInputByCode,
} from "@/modules/pricing/queries";
import {
  campaignRules,
  campaigns,
  coupons,
  specialDays,
} from "@/modules/pricing/schema";
import { calculatePriceBreakdown } from "@/modules/pricing/service";
import type { PricingLineInput } from "@/modules/pricing/types";
import { getActiveCartView } from "@/modules/sales/queries";
import { DEFAULT_FLAT_SHIPPING_POISHA } from "@/modules/sales/service";

const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(40),
  shippingFee: z.number().int().min(0).optional(),
});

export const applyCouponPreviewAction = createAction({
  schema: applyCouponSchema,
  rateLimit: { key: "coupon:apply", limit: 15, windowSec: 60 },
  handler: async (input, ctx) => {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
    const cart = await getActiveCartView(sessionId, ctx.userId);
    if (cart.items.length === 0) {
      throw new AppError("VALIDATION", "Your cart is empty");
    }

    const db = getDb();
    const variantIds = cart.items.map((i) => i.variantId);
    const variantRows = await db
      .select({
        id: variants.id,
        productId: variants.productId,
        sku: variants.sku,
        price: variants.price,
        weightG: variants.weightG,
        productName: products.name,
        brandId: products.brandId,
        salePrice: products.salePrice,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(inArray(variants.id, variantIds));

    const prodIds = variantRows.map((v) => v.productId);
    const catRows =
      prodIds.length > 0
        ? await db
            .select({
              productId: productCategories.productId,
              categoryId: productCategories.categoryId,
            })
            .from(productCategories)
            .where(inArray(productCategories.productId, prodIds))
        : [];

    const catsByProd = new Map<string, string[]>();
    for (const c of catRows) {
      const list = catsByProd.get(c.productId) ?? [];
      list.push(c.categoryId);
      catsByProd.set(c.productId, list);
    }

    const variantById = new Map(variantRows.map((v) => [v.id, v]));
    const lines: PricingLineInput[] = [];
    for (const item of cart.items) {
      const v = variantById.get(item.variantId);
      if (v === undefined) {
        continue;
      }
      lines.push({
        variantId: v.id,
        productId: v.productId,
        brandId: v.brandId,
        categoryIds: catsByProd.get(v.productId) ?? [],
        sku: v.sku,
        name: v.productName,
        qty: item.qty,
        basePrice: v.price,
        salePrice: v.salePrice,
        weightG: v.weightG,
      });
    }

    const [pricingCtx, coupon] = await Promise.all([
      getActivePricingContext(),
      getCouponInputByCode(input.code, ctx.userId),
    ]);

    if (coupon === null) {
      throw new AppError("NOT_FOUND", "Coupon code not found");
    }

    return calculatePriceBreakdown({
      lines,
      campaigns: pricingCtx.campaigns,
      specialDays: pricingCtx.specialDays,
      coupon,
      shippingFee: input.shippingFee ?? DEFAULT_FLAT_SHIPPING_POISHA,
    });
  },
});


const upsertCouponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
  minCart: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
  status: z.enum(["active", "paused", "expired"]).default("active"),
});

export const upsertCouponAction = createAction({
  permission: "coupon:create",
  schema: upsertCouponSchema,
  revalidateTags: ["pricing"],
  audit: {
    action: "upsert_coupon",
    entity: "coupon",
    getEntityId: (_out, input) => input.code.toUpperCase(),
  },
  handler: async (input) => {
    const db = getDb();
    const code = input.code.toUpperCase();
    await db
      .insert(coupons)
      .values({
        id: randomUUID(),
        code,
        type: input.type,
        value: input.value,
        minCart: input.minCart,
        maxDiscount: input.maxDiscount ?? null,
        usageLimit: input.usageLimit ?? null,
        startsAt: new Date(input.startsAt),
        expiresAt: new Date(input.expiresAt),
        status: input.status,
      })
      .onDuplicateKeyUpdate({
        set: {
          type: input.type,
          value: input.value,
          minCart: input.minCart,
          maxDiscount: input.maxDiscount ?? null,
          usageLimit: input.usageLimit ?? null,
          startsAt: new Date(input.startsAt),
          expiresAt: new Date(input.expiresAt),
          status: input.status,
          updatedAt: new Date(),
        },
      });
    return { code };
  },
});

const deleteCouponSchema = z.object({ id: z.string().min(1) });

export const deleteCouponAction = createAction({
  permission: "coupon:delete",
  schema: deleteCouponSchema,
  revalidateTags: ["pricing"],
  audit: {
    action: "delete_coupon",
    entity: "coupon",
    getEntityId: (_out, input) => input.id,
  },
  handler: async (input) => {
    const db = getDb();
    await db.delete(coupons).where(eq(coupons.id, input.id));
    return { id: input.id };
  },
});

const upsertCampaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["flash_sale", "seasonal", "bundle"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
  status: z.enum(["draft", "scheduled", "active"]).default("active"),
});

export const upsertCampaignAction = createAction({
  permission: "campaign:create",
  schema: upsertCampaignSchema,
  revalidateTags: ["pricing"],
  audit: {
    action: "create_campaign",
    entity: "campaign",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(campaigns).values({
        id,
        name: input.name,
        type: input.type,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: input.status,
      });
      await tx.insert(campaignRules).values({
        id: randomUUID(),
        campaignId: id,
        discountType: input.discountType,
        value: input.value,
      });
    });
    return { id };
  },
});


const createSpecialDaySchema = z.object({
  name: z.string().trim().min(2).max(120),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  banner: z.string().trim().max(300).nullable().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
  maxDiscount: z.number().int().min(0).nullable().optional(),
});

export const createSpecialDayAction = createAction({
  permission: "campaign:create",
  schema: createSpecialDaySchema,
  revalidateTags: ["pricing"],
  audit: {
    action: "create_special_day",
    entity: "special_day",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    const ruleId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(campaignRules).values({
        id: ruleId,
        campaignId: null,
        discountType: input.discountType,
        value: input.value,
        maxDiscount: input.maxDiscount ?? null,
      });
      await tx.insert(specialDays).values({
        id,
        name: input.name,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        banner: input.banner?.trim() || null,
        ruleId,
      });
    });
    return { id };
  },
});

export const deleteSpecialDayAction = createAction({
  permission: "campaign:create",
  schema: z.object({ id: z.string().min(1) }),
  revalidateTags: ["pricing"],
  audit: {
    action: "delete_special_day",
    entity: "special_day",
    getEntityId: (_out, input) => input.id,
  },
  handler: async (input) => {
    const db = getDb();
    await db.delete(specialDays).where(eq(specialDays.id, input.id));
    return { id: input.id };
  },
});

export const seedYearlyEventsAction = createAction({
  permission: "campaign:create",
  schema: z.object({ year: z.number().int().min(2024).max(2100) }),
  revalidateTags: ["pricing"],
  audit: {
    action: "seed_yearly_events",
    entity: "special_day",
    getEntityId: (_out, input) => String(input.year),
  },
  handler: async (input) => {
    const y = input.year;
    const presets = [
      {
        name: `Valentine's Day (${y})`,
        start: `${y}-02-14T00:00:00Z`,
        end: `${y}-02-14T23:59:59Z`,
        discount: 14,
        banner: "Valentine's Day Special: 14% OFF storewide!",
      },
      {
        name: `Independence Day 26 March (${y})`,
        start: `${y}-03-26T00:00:00Z`,
        end: `${y}-03-26T23:59:59Z`,
        discount: 10,
        banner: "26 March Independence Day: 10% OFF!",
      },
      {
        name: `Pohela Boishakh (${y})`,
        start: `${y}-04-14T00:00:00Z`,
        end: `${y}-04-14T23:59:59Z`,
        discount: 15,
        banner: "Shubho Noboborsho! Enjoy 15% OFF today!",
      },
      {
        name: `11.11 Mega Sale (${y})`,
        start: `${y}-11-11T00:00:00Z`,
        end: `${y}-11-11T23:59:59Z`,
        discount: 20,
        banner: "11.11 Mega Sale: Flat 20% OFF!",
      },
      {
        name: `Victory Day 16 December (${y})`,
        start: `${y}-12-16T00:00:00Z`,
        end: `${y}-12-16T23:59:59Z`,
        discount: 16,
        banner: "16 December Victory Day Special: 16% OFF!",
      },
    ];
    const db = getDb();
    await db.transaction(async (tx) => {
      for (const p of presets) {
        const ruleId = randomUUID();
        await tx.insert(campaignRules).values({
          id: ruleId,
          campaignId: null,
          discountType: "percentage",
          value: p.discount,
        });
        await tx.insert(specialDays).values({
          id: randomUUID(),
          name: p.name,
          startsAt: new Date(p.start),
          endsAt: new Date(p.end),
          banner: p.banner,
          ruleId,
        });
      }
    });
    return { created: presets.length };
  },
});
