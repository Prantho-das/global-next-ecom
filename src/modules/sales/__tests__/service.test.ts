import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  computeCheckoutTotals,
  computeFlatUnitPrice,
  executeCodCheckout,
  mergeCartItems,
} from "@/modules/sales/service";
import type {
  CheckoutPersistenceAdapter,
  LockedVariantStockRow,
} from "@/modules/sales/service";

describe("cart merge conflict resolution", () => {
  it("keeps higher quantity on conflicting variant and preserves unique items", () => {
    const guest = [
      { variantId: "v1", qty: 4 },
      { variantId: "v2", qty: 1 },
      { variantId: "v3", qty: 2 },
    ];
    const user = [
      { variantId: "v1", qty: 2 },
      { variantId: "v2", qty: 5 },
      { variantId: "v4", qty: 3 },
    ];

    const merged = mergeCartItems(guest, user);
    const byId = new Map(merged.map((m) => [m.variantId, m.qty]));

    expect(byId.get("v1")).toBe(4);
    expect(byId.get("v2")).toBe(5);
    expect(byId.get("v3")).toBe(2);
    expect(byId.get("v4")).toBe(3);
    expect(merged).toHaveLength(4);
  });
});

describe("flat pricing & checkout totals", () => {
  it("applies salePrice only when lower than variant price", () => {
    expect(computeFlatUnitPrice(10000, 8000)).toBe(8000);
    expect(computeFlatUnitPrice(10000, 12000)).toBe(10000);
    expect(computeFlatUnitPrice(10000, null)).toBe(10000);
  });

  it("computes subtotal and total with shipping fee in poisha", () => {
    const totals = computeCheckoutTotals(
      [
        { unitPrice: 50000, qty: 2 },
        { unitPrice: 25000, qty: 1 },
      ],
      6000,
    );
    expect(totals).toEqual({
      subtotal: 125000,
      shippingFee: 6000,
      total: 131000,
    });
  });
});

function createSerializedLockAdapter(initialStock: number) {
  const variants = new Map<string, LockedVariantStockRow>([
    [
      "v-last",
      {
        id: "v-last",
        sku: "TEE-BLK-M",
        price: 50000,
        stock: initialStock,
        productName: "Black Tee",
        salePrice: null,
      },
    ],
  ]);
  const ordersByIdem = new Map<
    string,
    { id: string; number: string; total: number }
  >();
  let lockChain = Promise.resolve();

  function withRowLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = lockChain.then(fn, fn);
    lockChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  function makeAdapter(): CheckoutPersistenceAdapter {
    return {
      async findOrderByIdempotencyKey(key) {
        return ordersByIdem.get(key) ?? null;
      },
      async lockVariantsForUpdate(ids) {
        return ids
          .map((id) => variants.get(id))
          .filter((v): v is LockedVariantStockRow => v !== undefined);
      },
      async decrementVariantStock(variantId, nextStock) {
        const current = variants.get(variantId);
        if (current !== undefined) {
          variants.set(variantId, { ...current, stock: nextStock });
        }
      },
      async insertStockMovement() {},
      async createOrderRecords(input) {
        ordersByIdem.set(input.idempotencyKey, {
          id: input.orderId,
          number: input.orderNumber,
          total: input.total,
        });
      },
    };
  }

  return { variants, withRowLock, makeAdapter };
}

describe("checkout idempotency & stock reservation race", () => {
  it("replays existing order when same idempotencyKey is submitted twice", async () => {
    const store = createSerializedLockAdapter(5);
    const adapter = store.makeAdapter();

    const first = await executeCodCheckout(
      adapter,
      [{ variantId: "v-last", qty: 2 }],
      "idem-key-12345",
      6000,
    );
    const second = await executeCodCheckout(
      adapter,
      [{ variantId: "v-last", qty: 2 }],
      "idem-key-12345",
      6000,
    );

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.orderId).toBe(first.orderId);
    expect(store.variants.get("v-last")?.stock).toBe(3);
  });

  it("allows only one concurrent checkout to claim the last remaining unit", async () => {
    const store = createSerializedLockAdapter(1);

    const [res1, res2] = await Promise.allSettled([
      store.withRowLock(() =>
        executeCodCheckout(
          store.makeAdapter(),
          [{ variantId: "v-last", qty: 1 }],
          "idem-race-1",
        ),
      ),
      store.withRowLock(() =>
        executeCodCheckout(
          store.makeAdapter(),
          [{ variantId: "v-last", qty: 1 }],
          "idem-race-2",
        ),
      ),
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toBeInstanceOf(AppError);
      expect((rejected[0].reason as AppError).code).toBe("CONFLICT");
    }
    expect(store.variants.get("v-last")?.stock).toBe(0);
  });
});
