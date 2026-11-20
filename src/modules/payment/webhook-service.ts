import { AppError } from "@/lib/errors";
import { redactSensitiveData } from "@/lib/logger";
import type {
  NormalizedPaymentEvent,
  PaymentAdapter,
} from "@/modules/payment/adapter";

export interface PaymentWebhookPersistence {
  findPaymentByIdempotencyKey(
    key: string,
  ): Promise<{ id: string; status: string } | null>;
  findOrderByNumber(
    orderNumber: string,
  ): Promise<{ id: string; total: number; paymentStatus: string } | null>;
  markPaymentCompleted(input: {
    orderId: string;
    gatewayProvider: string;
    gatewayTxnId: string;
    amountPoisha: number;
    idempotencyKey: string;
    rawResponse: Record<string, unknown>;
  }): Promise<void>;
  markPaymentFailed(input: {
    orderId: string;
    gatewayProvider: string;
    gatewayTxnId: string;
    amountPoisha: number;
    idempotencyKey: string;
    rawResponse: Record<string, unknown>;
  }): Promise<void>;
}

export async function processPaymentWebhook(input: {
  adapter: PaymentAdapter;
  event: NormalizedPaymentEvent;
  config: Record<string, string>;
  sandboxMode: boolean;
  persistence: PaymentWebhookPersistence;
}): Promise<{ idempotent: boolean; status: "completed" | "failed" }> {
  const idempotencyKey = `wh_${input.adapter.code}_${input.event.eventId}`;
  const existing =
    await input.persistence.findPaymentByIdempotencyKey(idempotencyKey);
  if (existing !== null) {
    return { idempotent: true, status: "completed" };
  }

  const order = await input.persistence.findOrderByNumber(
    input.event.orderNumber,
  );
  if (order === null) {
    throw new AppError("NOT_FOUND", `Order not found: ${input.event.orderNumber}`);
  }

  if (input.event.amountPoisha !== order.total) {
    throw new AppError(
      "CONFLICT",
      `Payment amount mismatch: expected ${order.total}, got ${input.event.amountPoisha}`,
    );
  }

  if (
    input.event.status === "completed" &&
    (input.adapter.code === "sslcommerz" || input.adapter.code === "bkash") &&
    input.adapter.getTransactionStatus !== undefined
  ) {
    const gatewayStatus = await input.adapter.getTransactionStatus(
      input.event.gatewayTxnId,
      input.config,
      input.sandboxMode,
    );
    if (
      gatewayStatus.status !== "completed" ||
      gatewayStatus.amountPoisha !== order.total
    ) {
      throw new AppError(
        "CONFLICT",
        "Gateway transaction verification mismatch",
      );
    }
  }

  const safeRaw = redactSensitiveData(input.event.raw) as Record<
    string,
    unknown
  >;

  if (input.event.status === "completed") {
    await input.persistence.markPaymentCompleted({
      orderId: order.id,
      gatewayProvider: input.adapter.code,
      gatewayTxnId: input.event.gatewayTxnId,
      amountPoisha: input.event.amountPoisha,
      idempotencyKey,
      rawResponse: safeRaw,
    });
    return { idempotent: false, status: "completed" };
  }

  await input.persistence.markPaymentFailed({
    orderId: order.id,
    gatewayProvider: input.adapter.code,
    gatewayTxnId: input.event.gatewayTxnId,
    amountPoisha: input.event.amountPoisha,
    idempotencyKey,
    rawResponse: safeRaw,
  });
  return { idempotent: false, status: "failed" };
}
