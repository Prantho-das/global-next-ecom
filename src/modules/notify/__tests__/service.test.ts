import { describe, expect, it } from "vitest";

import {
  calculateSmsSegments,
  computeNextRetryDelayMs,
  MAX_NOTIFY_ATTEMPTS,
  renderTemplate,
  resolveDeliveryFailureStatus,
} from "@/modules/notify/service";

describe("notification template substitution", () => {
  it("replaces Handlebars-like variables and strips missing keys", () => {
    const out = renderTemplate(
      "Hello {{name}}, your order {{orderNumber}} total is {{total}}.",
      { name: "Rahim", orderNumber: "ORD-123", total: "৳1,200" },
    );
    expect(out).toBe("Hello Rahim, your order ORD-123 total is ৳1,200.");

    const missing = renderTemplate("Hi {{name}} {{missing}}", { name: "Ali" });
    expect(missing).toBe("Hi Ali ");
  });
});

describe("Bangla unicode SMS segment calculation", () => {
  it("uses GSM-7 limits (160/153) for ASCII text", () => {
    const shortAscii = "A".repeat(160);
    expect(calculateSmsSegments(shortAscii)).toEqual({
      encoding: "gsm7",
      length: 160,
      segments: 1,
    });

    const longAscii = "A".repeat(161);
    expect(calculateSmsSegments(longAscii)).toEqual({
      encoding: "gsm7",
      length: 161,
      segments: 2,
    });
  });

  it("uses UCS-2 limits (70/67) for Bangla unicode text", () => {
    const shortBangla = "অ".repeat(70);
    expect(calculateSmsSegments(shortBangla)).toEqual({
      encoding: "ucs2",
      length: 70,
      segments: 1,
    });

    const longBangla = "অ".repeat(71);
    expect(calculateSmsSegments(longBangla)).toEqual({
      encoding: "ucs2",
      length: 71,
      segments: 2,
    });
  });
});

describe("retry, exponential backoff & dead-letter logic", () => {
  it("computes exponential backoff delays", () => {
    expect(computeNextRetryDelayMs(1)).toBe(30_000);
    expect(computeNextRetryDelayMs(2)).toBe(60_000);
    expect(computeNextRetryDelayMs(3)).toBe(120_000);
    expect(computeNextRetryDelayMs(4)).toBe(240_000);
  });

  it("transitions to dead_letter at max 5 attempts", () => {
    expect(resolveDeliveryFailureStatus(1)).toBe("failed");
    expect(resolveDeliveryFailureStatus(4)).toBe("failed");
    expect(resolveDeliveryFailureStatus(MAX_NOTIFY_ATTEMPTS)).toBe("dead_letter");
  });
});
