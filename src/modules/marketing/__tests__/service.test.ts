import { describe, expect, it } from "vitest";

import {
  buildFbCapiPayload,
  evaluateSegmentRules,
  isQuietHoursDhaka,
  resolveAbandonStage,
  shouldSendTrackingEvent,
  signRecoveryToken,
  verifyRecoveryToken,
} from "@/modules/marketing/service";

describe("segment rule evaluation", () => {
  const customer = {
    spent: 250000,
    orders: 4,
    lastOrderDays: 15,
    categories: ["shirts", "polos"],
    city: "Dhaka",
    tags: ["vip"],
  };

  it("matches when all rules are satisfied", () => {
    expect(
      evaluateSegmentRules(customer, [
        { field: "spent", op: "gte", value: 200000 },
        { field: "orders", op: "gte", value: 3 },
        { field: "last_order_days", op: "lte", value: 30 },
        { field: "category", op: "includes", value: "shirts" },
        { field: "city", op: "eq", value: "dhaka" },
        { field: "tag", op: "includes", value: "vip" },
      ]),
    ).toBe(true);
  });

  it("fails when any rule does not match", () => {
    expect(
      evaluateSegmentRules(customer, [
        { field: "spent", op: "gte", value: 500000 },
      ]),
    ).toBe(false);
  });
});

describe("abandoned-cart flow stage transitions & quiet hours", () => {
  const DAYTIME_DHAKA = new Date("2026-11-20T06:00:00Z");

  it("detects Asia/Dhaka quiet hours (22:00-08:00)", () => {
    expect(isQuietHoursDhaka(new Date("2026-11-20T16:30:00Z"))).toBe(true);
    expect(isQuietHoursDhaka(new Date("2026-11-20T01:30:00Z"))).toBe(true);
    expect(isQuietHoursDhaka(DAYTIME_DHAKA)).toBe(false);
  });

  it("advances through 1h -> 24h -> 72h and stops on purchase or opt-out", () => {
    const idle2h = new Date(DAYTIME_DHAKA.getTime() - 2 * 3600 * 1000);
    expect(
      resolveAbandonStage({
        cartStatus: "active",
        optedOut: false,
        lastActivityAt: idle2h,
        sentStages: [],
        now: DAYTIME_DHAKA,
      }),
    ).toBe("1h");

    const idle25h = new Date(DAYTIME_DHAKA.getTime() - 25 * 3600 * 1000);
    expect(
      resolveAbandonStage({
        cartStatus: "active",
        optedOut: false,
        lastActivityAt: idle25h,
        sentStages: ["1h"],
        now: DAYTIME_DHAKA,
      }),
    ).toBe("24h");

    const idle73h = new Date(DAYTIME_DHAKA.getTime() - 73 * 3600 * 1000);
    expect(
      resolveAbandonStage({
        cartStatus: "active",
        optedOut: false,
        lastActivityAt: idle73h,
        sentStages: ["1h", "24h"],
        now: DAYTIME_DHAKA,
      }),
    ).toBe("72h");

    expect(
      resolveAbandonStage({
        cartStatus: "converted",
        optedOut: false,
        lastActivityAt: idle73h,
        sentStages: [],
        now: DAYTIME_DHAKA,
      }),
    ).toBeNull();

    expect(
      resolveAbandonStage({
        cartStatus: "active",
        optedOut: true,
        lastActivityAt: idle73h,
        sentStages: [],
        now: DAYTIME_DHAKA,
      }),
    ).toBeNull();
  });

  it("signs and verifies expiring cart recovery tokens", () => {
    const secret = "test-recovery-secret";
    const token = signRecoveryToken("cart-1", 2000, secret);
    expect(verifyRecoveryToken(token, secret, 1000)).toEqual({
      cartId: "cart-1",
    });
    expect(verifyRecoveryToken(token, secret, 3000)).toBeNull();
    expect(verifyRecoveryToken(token, "wrong-secret", 1000)).toBeNull();
  });
});

describe("FB CAPI event dedupe & hashing", () => {
  it("deduplicates events by event_id and hashes PII", () => {
    const sent = new Set<string>(["ev-100"]);
    expect(shouldSendTrackingEvent(sent, "ev-100")).toBe(false);
    expect(shouldSendTrackingEvent(sent, "ev-101")).toBe(true);

    const payload = buildFbCapiPayload({
      eventName: "Purchase",
      eventId: "ev-101",
      email: "User@Example.com",
      phone: "01712345678",
      valueTaka: 1200,
    });
    expect(payload.event_id).toBe("ev-101");
    expect(payload.user_data.em?.[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.user_data.ph?.[0]).toMatch(/^[a-f0-9]{64}$/);
  });
});
