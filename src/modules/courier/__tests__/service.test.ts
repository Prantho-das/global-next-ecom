import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import type { CourierAdapter } from "@/modules/courier/adapter";
import {
  assertFraudAllowsCourierBooking,
  bookWithRetryAndFallback,
} from "@/modules/courier/service";

function makeCourierStub(
  code: "steadfast" | "pathao" | "redx",
  bookFn: CourierAdapter["book"],
): CourierAdapter {
  return {
    code,
    book: bookFn,
    async track() {
      return { status: "in_transit", raw: {} };
    },
    async cancel() {},
    async parseWebhook() {
      return {
        eventId: "ev-1",
        consignmentId: "c-1",
        status: "in_transit",
        codCollectedPoisha: 0,
        raw: {},
      };
    },
  };
}

describe("courier booking & fallback", () => {
  it("blocks courier booking when fraud decision is hold", () => {
    expect(() => assertFraudAllowsCourierBooking("hold")).toThrow(AppError);
    expect(() => assertFraudAllowsCourierBooking("approve")).not.toThrow();
  });

  it("retries failed primary provider then falls back to secondary provider", async () => {
    const primaryBook = vi.fn().mockRejectedValue(new Error("API 503"));
    const secondaryBook = vi.fn().mockResolvedValue({
      consignmentId: "PTH-999",
      trackingCode: "TRK-999",
      feePoisha: 6000,
      raw: {},
    });

    const res = await bookWithRetryAndFallback({
      booking: {
        orderNumber: "ORD-100",
        recipientName: "Karim",
        recipientPhone: "01712345678",
        recipientAddress: "Dhanmondi 27",
        division: "Dhaka",
        district: "Dhaka",
        thana: "Dhanmondi",
        codAmountPoisha: 120000,
        weightG: 500,
      },
      candidates: [
        {
          adapter: makeCourierStub("steadfast", primaryBook),
          config: {},
          successRate: 0.95,
          isDefault: true,
        },
        {
          adapter: makeCourierStub("pathao", secondaryBook),
          config: {},
          successRate: 0.9,
          isDefault: false,
        },
      ],
      maxRetriesPerProvider: 3,
      backoffMs: 0,
    });

    expect(primaryBook).toHaveBeenCalledTimes(3);
    expect(secondaryBook).toHaveBeenCalledTimes(1);
    expect(res.provider).toBe("pathao");
    expect(res.result.consignmentId).toBe("PTH-999");
  });
});
