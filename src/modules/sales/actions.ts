"use server";

import { randomUUID } from "crypto";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  enforceOtpRateLimits,
  issueOtpCode,
  normalizeBdPhone,
  verifyOtpCode,
} from "@/modules/auth/otp-service";
import { products, productCategories, stockMovements, variants } from "@/modules/catalog/schema";
import {
  getActivePricingContext,
  getCouponInputByCode,
} from "@/modules/pricing/queries";
import { couponRedemptions } from "@/modules/pricing/schema";
import { calculatePriceBreakdown } from "@/modules/pricing/service";
import type { PricingLineInput } from "@/modules/pricing/types";
import { getAllShippingConfig } from "@/modules/shipping/queries";
import { matchShippingRates } from "@/modules/shipping/service";
import {
  cartItems,
  carts,
  customers,
  orderEvents,
  orderItems,
  orders,
  payments,
} from "@/modules/sales/schema";
import {
  DEFAULT_FLAT_SHIPPING_POISHA,
  executeCodCheckout,
  mergeCartItems,
} from "@/modules/sales/service";
import {
  cartAddSchema,
  cartRemoveSchema,
  cartUpdateQtySchema,
  checkoutSchema,
  guestConvertSchema,
  otpRequestSchema,
  trackRequestOtpSchema,
  trackVerifySchema,
} from "@/modules/sales/validators";

const CART_SESSION_COOKIE = "ecom_cart_sid";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

async function getOrCreateCartSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE)?.value;
  if (existing !== undefined && existing.length > 0) {
    return existing;
  }
  const sid = randomUUID();
  store.set(CART_SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
  return sid;
}

async function resolveActiveCartId(userId: string | null): Promise<string> {
  const db = getDb();
  const sessionId = await getOrCreateCartSessionId();
  const existing = await db
    .select({ id: carts.id })
    .from(carts)
    .where(
      userId !== null
        ? and(eq(carts.userId, userId), eq(carts.status, "active"))
        : and(eq(carts.sessionId, sessionId), eq(carts.status, "active")),
    )
    .limit(1);

  const first = existing[0];
  if (first !== undefined) {
    return first.id;
  }
  const newCartId = randomUUID();
  await db.insert(carts).values({
    id: newCartId,
    sessionId: userId === null ? sessionId : null,
    userId,
    status: "active",
  });
  return newCartId;
}

export const addToCartAction = createAction({
  schema: cartAddSchema,
  revalidateTags: ["cart"],
  handler: async (input, ctx) => {
    const db = getDb();
    const cartId = await resolveActiveCartId(ctx.userId);
    const variantRows = await db
      .select({ id: variants.id, stock: variants.stock })
      .from(variants)
      .where(and(eq(variants.id, input.variantId), isNull(variants.deletedAt)))
      .limit(1);
    const variant = variantRows[0];
    if (variant === undefined) {
      throw new AppError("NOT_FOUND", "Variant not found");
    }
    const existingItem = await db
      .select({ id: cartItems.id, qty: cartItems.qty })
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variant.id)),
      )
      .limit(1);
    const nextQty = (existingItem[0]?.qty ?? 0) + (input.qty ?? 1);
    if (nextQty > variant.stock) {
      throw new AppError("CONFLICT", `Only ${variant.stock} unit(s) available`);
    }

    if (existingItem[0] !== undefined) {
      await db
        .update(cartItems)
        .set({ qty: nextQty, updatedAt: new Date() })
        .where(eq(cartItems.id, existingItem[0].id));
    } else {
      await db.insert(cartItems).values({
        id: randomUUID(),
        cartId,
        variantId: variant.id,
        qty: nextQty,
      });
    }
    await db
      .update(carts)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(carts.id, cartId));

    return { cartId, variantId: variant.id, qty: nextQty };
  },
});

export const updateCartItemAction = createAction({
  schema: cartUpdateQtySchema,
  revalidateTags: ["cart"],
  handler: async (input, ctx) => {
    const db = getDb();
    const cartId = await resolveActiveCartId(ctx.userId);
    if (input.qty === 0) {
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.variantId, input.variantId),
          ),
        );
      return { variantId: input.variantId, qty: 0 };
    }
    const variantRows = await db
      .select({ stock: variants.stock })
      .from(variants)
      .where(eq(variants.id, input.variantId))
      .limit(1);
    const stock = variantRows[0]?.stock ?? 0;
    if (input.qty > stock) {
      throw new AppError("CONFLICT", `Only ${stock} unit(s) available`);
    }
    await db
      .update(cartItems)
      .set({ qty: input.qty, updatedAt: new Date() })
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.variantId, input.variantId),
        ),
      );
    return { variantId: input.variantId, qty: input.qty };
  },
});

export const removeCartItemAction = createAction({
  schema: cartRemoveSchema,
  revalidateTags: ["cart"],
  handler: async (input, ctx) => {
    const db = getDb();
    const cartId = await resolveActiveCartId(ctx.userId);
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.variantId, input.variantId),
        ),
      );
    return { removed: input.variantId };
  },
});

export const mergeGuestCartAction = createAction({
  schema: z.object({}),
  revalidateTags: ["cart"],
  handler: async (_input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Login required to merge cart");
    }
    const store = await cookies();
    const sessionId = store.get(CART_SESSION_COOKIE)?.value;
    if (sessionId === undefined) {
      return { merged: false };
    }
    const db = getDb();
    return db.transaction(async (tx) => {
      const guestCartRows = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(and(eq(carts.sessionId, sessionId), eq(carts.status, "active")))
        .limit(1);
      const guestCart = guestCartRows[0];
      if (guestCart === undefined) {
        return { merged: false };
      }
      const userCartRows = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(and(eq(carts.userId, ctx.userId ?? ""), eq(carts.status, "active")))
        .limit(1);
      let userCartId = userCartRows[0]?.id;
      if (userCartId === undefined) {
        userCartId = randomUUID();
        await tx.insert(carts).values({
          id: userCartId,
          userId: ctx.userId,
          status: "active",
        });
      }

      const [guestItems, userItems] = await Promise.all([
        tx
          .select({ variantId: cartItems.variantId, qty: cartItems.qty })
          .from(cartItems)
          .where(eq(cartItems.cartId, guestCart.id)),
        tx
          .select({ variantId: cartItems.variantId, qty: cartItems.qty })
          .from(cartItems)
          .where(eq(cartItems.cartId, userCartId)),
      ]);

      const merged = mergeCartItems(guestItems, userItems);
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCartId));
      if (merged.length > 0) {
        await tx.insert(cartItems).values(
          merged.map((m) => ({
            id: randomUUID(),
            cartId: userCartId,
            variantId: m.variantId,
            qty: m.qty,
          })),
        );
      }
      await tx
        .update(carts)
        .set({ status: "merged", updatedAt: new Date() })
        .where(eq(carts.id, guestCart.id));
      return { merged: true, itemCount: merged.length };
    });
  },
});

export const requestCheckoutOtpAction = createAction({
  schema: otpRequestSchema,
  handler: async (input, ctx) => {
    await enforceOtpRateLimits(input.phone, ctx.ip);
    const { expiresAt } = await issueOtpCode(input.phone, "checkout_verify");
    return { sent: true, expiresAt: expiresAt.toISOString() };
  },
});

export const placeCodOrderAction = createAction({
  schema: checkoutSchema,
  rateLimit: { key: "checkout", limit: 10, windowSec: 60 },
  revalidateTags: ["products", "cart"],
  handler: async (input, ctx) => {
    await enforceOtpRateLimits(input.phone, ctx.ip);
    await verifyOtpCode(input.phone, "checkout_verify", input.otpCode);

    const db = getDb();
    const cartId = await resolveActiveCartId(ctx.userId);
    const normalizedPhone = normalizeBdPhone(input.phone);

    return db.transaction(async (tx) => {
      const cartLines = await tx
        .select({ variantId: cartItems.variantId, qty: cartItems.qty })
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));

      const existingCustomers = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.phone, normalizedPhone))
        .limit(1);

      let customerId = existingCustomers[0]?.id;
      if (customerId === undefined) {
        customerId = randomUUID();
        await tx.insert(customers).values({
          id: customerId,
          userId: ctx.userId,
          phone: normalizedPhone,
          name: input.name,
          isGuest: ctx.userId === null,
        });
      }

      const [pricingCtx, couponInput, shippingCfg] = await Promise.all([
        getActivePricingContext(),
        input.couponCode !== undefined && input.couponCode !== ""
          ? getCouponInputByCode(input.couponCode, ctx.userId)
          : Promise.resolve(null),
        getAllShippingConfig(),
      ]);

      if (
        input.couponCode !== undefined &&
        input.couponCode !== "" &&
        couponInput === null
      ) {
        throw new AppError("NOT_FOUND", "Coupon code not found");
      }

      const result = await executeCodCheckout(
        {
          async findOrderByIdempotencyKey(key) {
            const rows = await tx
              .select({
                id: orders.id,
                number: orders.number,
                total: orders.total,
              })
              .from(orders)
              .where(eq(orders.idempotencyKey, key))
              .limit(1);
            return rows[0] ?? null;
          },
          async lockVariantsForUpdate(variantIds) {
            const rows = await tx
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
              .where(inArray(variants.id, [...variantIds]))
              .for("update");
            return rows;
          },
          async decrementVariantStock(variantId, nextStock) {
            await tx
              .update(variants)
              .set({ stock: nextStock, updatedAt: new Date() })
              .where(eq(variants.id, variantId));
          },
          async insertStockMovement(movement) {
            await tx.insert(stockMovements).values({
              id: randomUUID(),
              ...movement,
            });
          },
          async createOrderRecords(orderData) {
            const variantDetails = await tx
              .select({
                id: variants.id,
                productId: variants.productId,
                weightG: variants.weightG,
                brandId: products.brandId,
                salePrice: products.salePrice,
                basePrice: variants.price,
              })
              .from(variants)
              .innerJoin(products, eq(variants.productId, products.id))
              .where(inArray(variants.id, orderData.items.map((i) => i.variantId)));

            const prodIds = variantDetails.map((v) => v.productId);
            const catRows =
              prodIds.length > 0
                ? await tx
                    .select({
                      productId: productCategories.productId,
                      categoryId: productCategories.categoryId,
                    })
                    .from(productCategories)
                    .where(inArray(productCategories.productId, prodIds))
                : [];
            const catsByProd = new Map<string, string[]>();
            for (const c of catRows) {
              const arr = catsByProd.get(c.productId) ?? [];
              arr.push(c.categoryId);
              catsByProd.set(c.productId, arr);
            }
            const detailByVar = new Map(variantDetails.map((v) => [v.id, v]));

            const pricingLines: PricingLineInput[] = orderData.items.map((i) => {
              const d = detailByVar.get(i.variantId);
              return {
                variantId: i.variantId,
                productId: d?.productId ?? i.variantId,
                brandId: d?.brandId ?? null,
                categoryIds: d !== undefined ? (catsByProd.get(d.productId) ?? []) : [],
                sku: i.skuSnapshot,
                name: i.nameSnapshot,
                qty: i.qty,
                basePrice: d?.basePrice ?? i.priceSnapshot,
                salePrice: d?.salePrice ?? null,
                weightG: d?.weightG ?? 500,
              };
            });

            const totalWeightG = pricingLines.reduce(
              (sum, l) => sum + l.weightG * l.qty,
              0,
            );
            const rawSubtotal = pricingLines.reduce(
              (sum, l) => sum + l.basePrice * l.qty,
              0,
            );
            const matchedShipping = matchShippingRates({
              address: {
                division: input.division,
                district: input.district,
                thana: input.thana,
              },
              totalWeightG,
              cartSubtotal: rawSubtotal,
              zones: shippingCfg.zones,
              areas: shippingCfg.areas,
              rates: shippingCfg.rates,
              globalFreeThreshold:
                shippingCfg.settings?.freeShippingGlobalThreshold ?? null,
            });
            const selectedShippingFee =
              matchedShipping.options[0]?.price ?? DEFAULT_FLAT_SHIPPING_POISHA;

            const breakdown = calculatePriceBreakdown({
              lines: pricingLines,
              campaigns: pricingCtx.campaigns,
              specialDays: pricingCtx.specialDays,
              coupon: couponInput,
              shippingFee: selectedShippingFee,
            });

            await tx.insert(orders).values({
              id: orderData.orderId,
              number: orderData.orderNumber,
              customerId,
              status: "pending",
              paymentStatus: "pending",
              subtotal: breakdown.subtotal,
              discountTotal:
                breakdown.campaignDiscountTotal + breakdown.couponDiscount,
              shippingFee: breakdown.shippingFee,
              total: breakdown.total,
              shippingAddress: {
                name: input.name,
                phone: normalizedPhone,
                division: input.division,
                district: input.district,
                thana: input.thana,
                line: input.line,
              },
              note: input.note ?? null,
              ip: ctx.ip,
              idempotencyKey: orderData.idempotencyKey,
            });
            await tx.insert(orderItems).values(
              orderData.items.map((item, idx) => ({
                id: randomUUID(),
                orderId: orderData.orderId,
                variantId: item.variantId,
                qty: item.qty,
                priceSnapshot:
                  breakdown.lines[idx]?.unitPrice ?? item.priceSnapshot,
                nameSnapshot: item.nameSnapshot,
                skuSnapshot: item.skuSnapshot,
              })),
            );
            if (breakdown.couponId !== null && breakdown.couponDiscount > 0) {
              await tx.insert(couponRedemptions).values({
                id: randomUUID(),
                couponId: breakdown.couponId,
                userId: ctx.userId,
                orderId: orderData.orderId,
                amount: breakdown.couponDiscount,
              });
            }
            await tx.insert(orderEvents).values({
              id: randomUUID(),
              orderId: orderData.orderId,
              fromStatus: null,
              toStatus: "pending",
              actor: ctx.userId ?? normalizedPhone,
              note: "COD order placed",
            });
            await tx.insert(payments).values({
              id: randomUUID(),
              orderId: orderData.orderId,
              method: "cod",
              status: "pending",
              amount: breakdown.total,
              currency: "BDT",
              idempotencyKey: `pay_${orderData.idempotencyKey}`,
            });
          },
        },
        cartLines,
        input.idempotencyKey,
        DEFAULT_FLAT_SHIPPING_POISHA,
      );

      if (!result.idempotentReplay) {
        await tx
          .update(carts)
          .set({ status: "converted", updatedAt: new Date() })
          .where(eq(carts.id, cartId));
        await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      }

      return result;
    });
  },
});

export const requestTrackOtpAction = createAction({
  schema: trackRequestOtpSchema,
  handler: async (input, ctx) => {
    await enforceOtpRateLimits(input.phone, ctx.ip);
    const db = getDb();
    const normalizedPhone = normalizeBdPhone(input.phone);
    const match = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.number, input.orderNumber),
          eq(customers.phone, normalizedPhone),
        ),
      )
      .limit(1);

    if (match.length > 0) {
      await issueOtpCode(normalizedPhone, "order_track");
    }

    return {
      message: "If the phone and order number match, an OTP has been sent.",
    };
  },
});

export const verifyTrackOrderAction = createAction({
  schema: trackVerifySchema,
  handler: async (input, ctx) => {
    await enforceOtpRateLimits(input.phone, ctx.ip);
    const normalizedPhone = normalizeBdPhone(input.phone);
    await verifyOtpCode(normalizedPhone, "order_track", input.otpCode);

    const db = getDb();
    const rows = await db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orders.number, input.orderNumber),
          eq(customers.phone, normalizedPhone),
        ),
      )
      .limit(1);

    const order = rows[0];
    if (order === undefined) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const events = await db
      .select({
        id: orderEvents.id,
        toStatus: orderEvents.toStatus,
        note: orderEvents.note,
        createdAt: orderEvents.createdAt,
      })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id));

    return { order, events };
  },
});

export const convertGuestToAccountAction = createAction({
  schema: guestConvertSchema,
  rateLimit: { key: "guest_convert", limit: 5, windowSec: 3600 },
  handler: async (input) => {
    const db = getDb();
    const normalizedPhone = normalizeBdPhone(input.phone);
    const customerRows = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.phone, normalizedPhone))
      .limit(1);
    const customer = customerRows[0];
    if (customer === undefined) {
      throw new AppError("NOT_FOUND", "Customer record not found");
    }

    const auth = getAuth();
    const signUpRes = await auth.api.signUpEmail({
      body: {
        name: customer.name,
        email: input.email,
        password: input.password,
      },
    });
    const newUserId = signUpRes?.user?.id;
    if (newUserId !== undefined) {
      await db
        .update(customers)
        .set({
          userId: newUserId,
          email: input.email,
          isGuest: false,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
    }
    return { converted: true, email: input.email };
  },
});
