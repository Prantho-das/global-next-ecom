import { randomUUID } from "crypto";

import { AppError } from "@/lib/errors";

export const DEFAULT_FLAT_SHIPPING_POISHA = 6000;

export interface CartItemMergeEntry {
  variantId: string;
  qty: number;
}

export function mergeCartItems(
  guestItems: readonly CartItemMergeEntry[],
  userItems: readonly CartItemMergeEntry[],
): CartItemMergeEntry[] {
  const merged = new Map<string, number>();
  for (const item of userItems) {
    merged.set(item.variantId, item.qty);
  }
  for (const item of guestItems) {
    const existingQty = merged.get(item.variantId) ?? 0;
    merged.set(item.variantId, Math.max(existingQty, item.qty));
  }
  return Array.from(merged.entries()).map(([variantId, qty]) => ({
    variantId,
    qty,
  }));
}

export function computeFlatUnitPrice(
  variantPrice: number,
  productSalePrice: number | null,
): number {
  if (productSalePrice !== null && productSalePrice < variantPrice) {
    return productSalePrice;
  }
  return variantPrice;
}

export function computeCheckoutTotals(
  items: ReadonlyArray<{ unitPrice: number; qty: number }>,
  shippingFee: number,
): { subtotal: number; shippingFee: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );
  return {
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomUUID().slice(0, 6).toUpperCase();
  return `ORD-${y}${m}${d}-${suffix}`;
}

export interface LockedVariantStockRow {
  id: string;
  sku: string;
  price: number;
  stock: number;
  productName: string;
  salePrice: number | null;
}

export interface CheckoutLineRequest {
  variantId: string;
  qty: number;
}

export interface CheckoutPersistenceAdapter {
  findOrderByIdempotencyKey(
    key: string,
  ): Promise<{ id: string; number: string; total: number } | null>;
  lockVariantsForUpdate(
    variantIds: readonly string[],
  ): Promise<LockedVariantStockRow[]>;
  decrementVariantStock(variantId: string, nextStock: number): Promise<void>;
  insertStockMovement(input: {
    variantId: string;
    delta: number;
    reason: string;
    refType: string;
    refId: string;
  }): Promise<void>;
  createOrderRecords(input: {
    orderId: string;
    orderNumber: string;
    idempotencyKey: string;
    subtotal: number;
    shippingFee: number;
    total: number;
    items: ReadonlyArray<{
      variantId: string;
      qty: number;
      priceSnapshot: number;
      nameSnapshot: string;
      skuSnapshot: string;
    }>;
  }): Promise<void>;
}

export async function executeCodCheckout(
  adapter: CheckoutPersistenceAdapter,
  lines: readonly CheckoutLineRequest[],
  idempotencyKey: string,
  shippingFee: number = DEFAULT_FLAT_SHIPPING_POISHA,
): Promise<{
  orderId: string;
  orderNumber: string;
  total: number;
  idempotentReplay: boolean;
}> {
  if (lines.length === 0) {
    throw new AppError("VALIDATION", "Cart is empty");
  }

  const existing = await adapter.findOrderByIdempotencyKey(idempotencyKey);
  if (existing !== null) {
    return {
      orderId: existing.id,
      orderNumber: existing.number,
      total: existing.total,
      idempotentReplay: true,
    };
  }

  const variantIds = lines.map((l) => l.variantId);
  const locked = await adapter.lockVariantsForUpdate(variantIds);
  const byId = new Map(locked.map((v) => [v.id, v]));

  const pricedItems: Array<{
    variantId: string;
    qty: number;
    unitPrice: number;
    priceSnapshot: number;
    nameSnapshot: string;
    skuSnapshot: string;
    nextStock: number;
  }> = [];

  for (const line of lines) {
    const variant = byId.get(line.variantId);
    if (variant === undefined) {
      throw new AppError("NOT_FOUND", `Variant not found: ${line.variantId}`);
    }
    if (variant.stock < line.qty) {
      throw new AppError(
        "CONFLICT",
        `Insufficient stock for ${variant.sku}: only ${variant.stock} left`,
      );
    }
    const unitPrice = computeFlatUnitPrice(variant.price, variant.salePrice);
    pricedItems.push({
      variantId: variant.id,
      qty: line.qty,
      unitPrice,
      priceSnapshot: unitPrice,
      nameSnapshot: variant.productName,
      skuSnapshot: variant.sku,
      nextStock: variant.stock - line.qty,
    });
  }

  const totals = computeCheckoutTotals(pricedItems, shippingFee);
  const orderId = randomUUID();
  const orderNumber = generateOrderNumber();

  for (const item of pricedItems) {
    await adapter.decrementVariantStock(item.variantId, item.nextStock);
    await adapter.insertStockMovement({
      variantId: item.variantId,
      delta: -item.qty,
      reason: `Order ${orderNumber}`,
      refType: "order",
      refId: orderId,
    });
  }

  await adapter.createOrderRecords({
    orderId,
    orderNumber,
    idempotencyKey,
    subtotal: totals.subtotal,
    shippingFee: totals.shippingFee,
    total: totals.total,
    items: pricedItems,
  });

  return {
    orderId,
    orderNumber,
    total: totals.total,
    idempotentReplay: false,
  };
}
