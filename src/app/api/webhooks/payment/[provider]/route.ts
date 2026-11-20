import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getPaymentAdapter } from "@/modules/payment/adapters";
import type { PaymentGatewayCode } from "@/modules/payment/adapter";
import { paymentProviders } from "@/modules/payment/schema";
import { processPaymentWebhook } from "@/modules/payment/webhook-service";
import { orders, payments } from "@/modules/sales/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params;
  if (
    provider !== "sslcommerz" &&
    provider !== "bkash" &&
    provider !== "nagad"
  ) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  try {
    const db = getDb();
    const provRows = await db
      .select({
        configEnc: paymentProviders.configEnc,
        sandboxMode: paymentProviders.sandboxMode,
      })
      .from(paymentProviders)
      .where(eq(paymentProviders.code, provider))
      .limit(1);

    const prov = provRows[0];
    if (prov === undefined) {
      return NextResponse.json(
        { error: "Provider not configured" },
        { status: 400 },
      );
    }

    const config = JSON.parse(decryptSecret(prov.configEnc)) as Record<
      string,
      string
    >;
    const adapter = getPaymentAdapter(provider as PaymentGatewayCode);
    const event = await adapter.parseWebhook(req, config);

    const result = await processPaymentWebhook({
      adapter,
      event,
      config,
      sandboxMode: prov.sandboxMode,
      persistence: {
        async findPaymentByIdempotencyKey(key) {
          const rows = await db
            .select({ id: payments.id, status: payments.status })
            .from(payments)
            .where(eq(payments.idempotencyKey, key))
            .limit(1);
          return rows[0] ?? null;
        },
        async findOrderByNumber(orderNumber) {
          const rows = await db
            .select({
              id: orders.id,
              total: orders.total,
              paymentStatus: orders.paymentStatus,
            })
            .from(orders)
            .where(eq(orders.number, orderNumber))
            .limit(1);
          return rows[0] ?? null;
        },
        async markPaymentCompleted(data) {
          await db.transaction(async (tx) => {
            await tx.insert(payments).values({
              id: randomUUID(),
              orderId: data.orderId,
              method: data.gatewayProvider,
              gatewayProvider: data.gatewayProvider,
              status: "completed",
              gatewayTxnId: data.gatewayTxnId,
              amount: data.amountPoisha,
              currency: "BDT",
              rawResponse: data.rawResponse,
              idempotencyKey: data.idempotencyKey,
              paidAt: new Date(),
            });
            await tx
              .update(orders)
              .set({ paymentStatus: "paid", updatedAt: new Date() })
              .where(eq(orders.id, data.orderId));
          });
        },
        async markPaymentFailed(data) {
          await db.transaction(async (tx) => {
            await tx.insert(payments).values({
              id: randomUUID(),
              orderId: data.orderId,
              method: data.gatewayProvider,
              gatewayProvider: data.gatewayProvider,
              status: "failed",
              gatewayTxnId: data.gatewayTxnId,
              amount: data.amountPoisha,
              currency: "BDT",
              rawResponse: data.rawResponse,
              idempotencyKey: data.idempotencyKey,
            });
            await tx
              .update(orders)
              .set({ paymentStatus: "failed", updatedAt: new Date() })
              .where(eq(orders.id, data.orderId));
          });
        },
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AppError) {
      const status =
        err.code === "UNAUTHORIZED" ? 401 : err.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
