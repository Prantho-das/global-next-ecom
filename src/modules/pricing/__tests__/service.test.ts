import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { calculatePriceBreakdown, validateCoupon } from "@/modules/pricing/service";
import type {
  ActiveCampaignInput,
  ActiveSpecialDayInput,
  CouponInput,
  PricingLineInput,
} from "@/modules/pricing/types";

const NOW = new Date("2026-11-20T12:00:00Z");

const baseLine: PricingLineInput = {
  variantId: "v1",
  productId: "p1",
  brandId: "b1",
  categoryIds: ["c1"],
  sku: "SKU-1",
  name: "Cotton Shirt",
  qty: 2,
  basePrice: 100000,
  salePrice: null,
  weightG: 300,
};

const baseCoupon: CouponInput = {
  id: "cpn-1",
  code: "SAVE10",
  type: "pct",
  value: 10,
  minCart: 50000,
  maxDiscount: 30000,
  usageLimit: 100,
  totalRedemptions: 10,
  perUserLimit: 2,
  userRedemptions: 0,
  startsAt: new Date("2026-11-20T00:00:00Z"),
  expiresAt: new Date("2026-11-21T00:00:00Z"),
  scope: "all",
  stackable: true,
  status: "active",
  targetIds: [],
};

describe("PriceEngine line pipeline", () => {
  it("applies sale override when lower than basePrice", () => {
    const res = calculatePriceBreakdown({
      lines: [{ ...baseLine, salePrice: 80000 }],
      campaigns: [],
      specialDays: [],
      coupon: null,
      shippingFee: 6000,
      now: NOW,
    });
    expect(res.lines[0]?.unitPrice).toBe(80000);
    expect(res.subtotal).toBe(160000);
    expect(res.total).toBe(166000);
  });

  it("picks best campaign by priority DESC then highest discount without stacking", () => {
    const campaigns: ActiveCampaignInput[] = [
      {
        id: "camp-low-prio-big",
        name: "Big",
        priority: 1,
        startsAt: new Date("2026-11-19T00:00:00Z"),
        endsAt: new Date("2026-11-22T00:00:00Z"),
        discountType: "pct",
        value: 50,
        maxDiscount: null,
        targets: [{ scope: "all", targetId: null }],
      },
      {
        id: "camp-high-prio",
        name: "Priority",
        priority: 10,
        startsAt: new Date("2026-11-19T00:00:00Z"),
        endsAt: new Date("2026-11-22T00:00:00Z"),
        discountType: "flat",
        value: 15000,
        maxDiscount: null,
        targets: [{ scope: "category", targetId: "c1" }],
      },
    ];

    const res = calculatePriceBreakdown({
      lines: [baseLine],
      campaigns,
      specialDays: [],
      coupon: null,
      shippingFee: 0,
      now: NOW,
    });
    expect(res.lines[0]?.campaignId).toBe("camp-high-prio");
    expect(res.lines[0]?.unitPrice).toBe(85000);
    expect(res.lines[0]?.lineTotal).toBe(170000);
  });

  it("applies special-day only if deeper than campaign (no stacking)", () => {
    const campaigns: ActiveCampaignInput[] = [
      {
        id: "camp-1",
        name: "10% Off",
        priority: 5,
        startsAt: new Date("2026-11-19T00:00:00Z"),
        endsAt: new Date("2026-11-22T00:00:00Z"),
        discountType: "pct",
        value: 10,
        maxDiscount: null,
        targets: [{ scope: "all", targetId: null }],
      },
    ];
    const specialDays: ActiveSpecialDayInput[] = [
      {
        id: "sd-1",
        name: "Eid Special",
        startsAt: new Date("2026-11-20T00:00:00Z"),
        endsAt: new Date("2026-11-21T00:00:00Z"),
        discountType: "pct",
        value: 25,
        maxDiscount: null,
      },
    ];

    const res = calculatePriceBreakdown({
      lines: [baseLine],
      campaigns,
      specialDays,
      coupon: null,
      shippingFee: 0,
      now: NOW,
    });
    expect(res.lines[0]?.specialDayId).toBe("sd-1");
    expect(res.lines[0]?.campaignId).toBeNull();
    expect(res.lines[0]?.unitPrice).toBe(75000);
  });

  it("uses half-up rounding per line once", () => {
    const res = calculatePriceBreakdown({
      lines: [{ ...baseLine, qty: 1, basePrice: 105 }],
      campaigns: [
        {
          id: "c-round",
          name: "10%",
          priority: 1,
          startsAt: new Date("2026-11-19T00:00:00Z"),
          endsAt: new Date("2026-11-22T00:00:00Z"),
          discountType: "pct",
          value: 10,
          maxDiscount: null,
          targets: [{ scope: "all", targetId: null }],
        },
      ],
      specialDays: [],
      coupon: null,
      shippingFee: 0,
      now: NOW,
    });
    expect(res.lines[0]?.unitDiscount).toBe(11);
    expect(res.lines[0]?.unitPrice).toBe(94);
  });
});

describe("Coupon validation chain & edge cases", () => {
  it("enforces inclusive start and exclusive end date window", () => {
    expect(() =>
      validateCoupon(
        baseCoupon,
        [baseLine],
        200000,
        false,
        new Date("2026-11-20T00:00:00Z"),
      ),
    ).not.toThrow();

    expect(() =>
      validateCoupon(
        baseCoupon,
        [baseLine],
        200000,
        false,
        new Date("2026-11-21T00:00:00Z"),
      ),
    ).toThrow(AppError);
  });

  it("caps coupon discount by maxDiscount and never goes below zero", () => {
    const res = calculatePriceBreakdown({
      lines: [{ ...baseLine, qty: 5, basePrice: 100000 }],
      campaigns: [],
      specialDays: [],
      coupon: { ...baseCoupon, value: 50, maxDiscount: 30000 },
      shippingFee: 6000,
      now: NOW,
    });
    expect(res.couponDiscount).toBe(30000);
    expect(res.total).toBe(476000);

    const flatOverflow = calculatePriceBreakdown({
      lines: [{ ...baseLine, qty: 1, basePrice: 10000 }],
      campaigns: [],
      specialDays: [],
      coupon: {
        ...baseCoupon,
        type: "flat",
        value: 50000,
        minCart: 0,
        maxDiscount: null,
      },
      shippingFee: 6000,
      now: NOW,
    });
    expect(flatOverflow.couponDiscount).toBe(10000);
    expect(flatOverflow.total).toBe(6000);
  });

  it("rejects non-stackable coupon when campaign/special-day already applied", () => {
    expect(() =>
      validateCoupon(
        { ...baseCoupon, stackable: false },
        [baseLine],
        200000,
        true,
        NOW,
      ),
    ).toThrow(/cannot be stacked/i);
  });

  it("zeroes shipping fee for free_ship coupon", () => {
    const res = calculatePriceBreakdown({
      lines: [baseLine],
      campaigns: [],
      specialDays: [],
      coupon: { ...baseCoupon, type: "free_ship", value: 0 },
      shippingFee: 12000,
      now: NOW,
    });
    expect(res.shippingFee).toBe(0);
    expect(res.freeShippingApplied).toBe(true);
    expect(res.total).toBe(200000);
  });

  it("rejects global and per-user limit exhaustion and negative prices", () => {
    expect(() =>
      validateCoupon(
        { ...baseCoupon, totalRedemptions: 100, usageLimit: 100 },
        [baseLine],
        200000,
        false,
        NOW,
      ),
    ).toThrow(/usage limit/i);

    expect(() =>
      validateCoupon(
        { ...baseCoupon, userRedemptions: 2, perUserLimit: 2 },
        [baseLine],
        200000,
        false,
        NOW,
      ),
    ).toThrow(/per-user/i);

    expect(() =>
      calculatePriceBreakdown({
        lines: [{ ...baseLine, basePrice: -100 }],
        campaigns: [],
        specialDays: [],
        coupon: null,
        shippingFee: 0,
        now: NOW,
      }),
    ).toThrow(AppError);
  });
});
