import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import type { PaymentAdapter } from "@/modules/payment/adapter";
import { processPaymentWebhook } from "@/modules/payment/webhook-service";
import type { PaymentWebhookPersistence } from "@/modules/payment/webhook-service";

function makeStubAdapter(): PaymentAdapter {
  return {
    code: "sslcommerz",
    async initiate() {
      return { redirectUrl: null, gatewayTxnId: "txn-1" };
    },
    async verify() {
      return {
        verified: true,
        gatewayTxnId: "txn-1",
        amountPoisha: 150000,
        raw: {},
      };
    },
    async refund() {
      return { refunded: true, gatewayRefundId: "ref-1" };
    },
    async parseWebhook() {
      return {
        eventId: "ev-1",
        orderNumber: "ORD-1",
        gatewayTxnId: "val-1",
        status: "completed",
        amountPoisha: 150000,
        raw: { phone: "01700000000" },
      };
    },
    getTransactionStatus: vi.fn().mockResolvedValue({
      status: "completed",
      amountPoisha: 150000,
    }),
  };
}

describe("payment webhook security & idempotency", () => {
  it("replays idempotent webhook without duplicate processing", async () => {
    const markCompleted = vi.fn();
    const persistence: PaymentWebhookPersistence = {
      async findPaymentByIdempotencyKey() {
        return { id: "pay-1", status: "completed" };
      },
      async findOrderByNumber() {
        return { id: "ord-1", total: 150000, paymentStatus: "paid" };
      },
      markPaymentCompleted: markCompleted,
      async markPaymentFailed() {},
    };

    const res = await processPaymentWebhook({
      adapter: makeStubAdapter(),
      event: {
        eventId: "ev-1",
        orderNumber: "ORD-1",
        gatewayTxnId: "val-1",
        status: "completed",
        amountPoisha: 150000,
        raw: {},
      },
      config: {},
      sandboxMode: true,
      persistence,
    });

    expect(res.idempotent).toBe(true);
    expect(markCompleted).not.toHaveBeenCalled();
  });

  it("rejects webhook when payload amount mismatches server order total", async () => {
    const markCompleted = vi.fn();
    const persistence: PaymentWebhookPersistence = {
      async findPaymentByIdempotencyKey() {
        return null;
      },
      async findOrderByNumber() {
        return { id: "ord-1", total: 150000, paymentStatus: "pending" };
      },
      markPaymentCompleted: markCompleted,
      async markPaymentFailed() {},
    };

    await expect(
      processPaymentWebhook({
        adapter: makeStubAdapter(),
        event: {
          eventId: "ev-2",
          orderNumber: "ORD-1",
          gatewayTxnId: "val-2",
          status: "completed",
          amountPoisha: 100,
          raw: {},
        },
        config: {},
        sandboxMode: true,
        persistence,
      }),
    ).rejects.toThrow(AppError);
    expect(markCompleted).not.toHaveBeenCalled();
  });
});
