import { describe, expect, it } from "vitest";

import {
  aggregateSalesByDay,
  computePeriodDelta,
  computeRfmScore,
  exportRowsToCsv,
} from "@/modules/report/service";

describe("aggregateSalesByDay", () => {
  it("groups non-cancelled orders into daily poisha totals", () => {
    const seedOrders = [
      {
        createdAt: new Date("2026-11-19T10:00:00Z"),
        status: "delivered",
        total: 120000,
        discountTotal: 10000,
        shippingFee: 6000,
      },
      {
        createdAt: new Date("2026-11-19T18:00:00Z"),
        status: "confirmed",
        total: 80000,
        discountTotal: 0,
        shippingFee: 6000,
      },
      {
        createdAt: new Date("2026-11-19T19:00:00Z"),
        status: "cancelled",
        total: 500000,
        discountTotal: 0,
        shippingFee: 0,
      },
      {
        createdAt: new Date("2026-11-20T09:00:00Z"),
        status: "pending",
        total: 150000,
        discountTotal: 5000,
        shippingFee: 6000,
      },
    ];

    const buckets = aggregateSalesByDay(seedOrders);
    expect(buckets).toEqual([
      {
        day: "2026-11-19",
        ordersCount: 2,
        revenue: 200000,
        discountTotal: 10000,
        shippingTotal: 12000,
      },
      {
        day: "2026-11-20",
        ordersCount: 1,
        revenue: 150000,
        discountTotal: 5000,
        shippingTotal: 6000,
      },
    ]);
  });
});

describe("RFM bucket boundaries", () => {
  it("classifies champions, at_risk, loyal, hibernating, and promising", () => {
    expect(
      computeRfmScore({ recencyDays: 7, frequency: 5, monetaryPoisha: 1_000_000 }),
    ).toEqual({ r: 5, f: 4, m: 5, segment: "champions" });

    expect(
      computeRfmScore({ recencyDays: 120, frequency: 3, monetaryPoisha: 200_000 }),
    ).toEqual({ r: 2, f: 3, m: 3, segment: "at_risk" });

    expect(
      computeRfmScore({ recencyDays: 45, frequency: 3, monetaryPoisha: 50_000 }),
    ).toEqual({ r: 3, f: 3, m: 2, segment: "loyal" });

    expect(
      computeRfmScore({ recencyDays: 180, frequency: 1, monetaryPoisha: 10_000 }),
    ).toEqual({ r: 1, f: 1, m: 1, segment: "hibernating" });

    expect(
      computeRfmScore({ recencyDays: 10, frequency: 2, monetaryPoisha: 60_000 }),
    ).toEqual({ r: 4, f: 2, m: 2, segment: "promising" });
  });
});

describe("period delta & CSV export", () => {
  it("computes percentage change and escapes CSV cells", () => {
    expect(computePeriodDelta(150, 100)).toEqual({
      current: 150,
      previous: 100,
      deltaPct: 50,
    });
    const csv = exportRowsToCsv(["Day", "Label"], [["2026-11-20", 'A, "B"']]);
    expect(csv).toBe('Day,Label\n2026-11-20,"A, ""B"""');
  });
});
