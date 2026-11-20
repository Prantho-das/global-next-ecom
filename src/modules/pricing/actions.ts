"use server";

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
