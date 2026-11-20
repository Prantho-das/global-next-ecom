import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CourierCode } from "@/modules/courier/adapter";
import { getCourierAdapter } from "@/modules/courier/adapters";
import {
  courierProviders,
  shipmentEvents,
  shipments,
} from "@/modules/courier/schema";
import { orderEvents, orders } from "@/modules/sales/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params;
  if (
    provider !== "steadfast" &&
    provider !== "pathao" &&
    provider !== "redx"
  ) {
    return NextResponse.json({ error: "Unknown courier" }, { status: 404 });
  }

  try {
    const db = getDb();
    const provRows = await db
      .select({ configEnc: courierProviders.configEnc })
      .from(courierProviders)
      .where(eq(courierProviders.code, provider))
      .limit(1);
    const prov = provRows[0];
    if (prov === undefined) {
      return NextResponse.json(
        { error: "Courier not configured" },
        { status: 400 },
      );
    }

    const config = JSON.parse(decryptSecret(prov.configEnc)) as Record<
      string,
      string
    >;
    const adapter = getCourierAdapter(provider as CourierCode);
    const event = await adapter.parseWebhook(req, config);

    const shipRows = await db
      .select({ id: shipments.id, orderId: shipments.orderId })
      .from(shipments)
      .where(eq(shipments.consignmentId, event.consignmentId))
      .limit(1);
    const shipment = shipRows[0];
    if (shipment === undefined) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(shipments)
        .set({
          status: event.status,
          codCollected: event.codCollectedPoisha,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipment.id));
      await tx.insert(shipmentEvents).values({
        id: randomUUID(),
        shipmentId: shipment.id,
        status: event.status,
        payload: event.raw,
      });

      if (
        event.status === "delivered" ||
        event.status === "returned" ||
        event.status === "cancelled"
      ) {
        await tx
          .update(orders)
          .set({ status: event.status, updatedAt: new Date() })
          .where(eq(orders.id, shipment.orderId));
        await tx.insert(orderEvents).values({
          id: randomUUID(),
          orderId: shipment.orderId,
          fromStatus: "shipped",
          toStatus: event.status,
          actor: `webhook:${provider}`,
          note: `Courier status: ${event.status}`,
        });
      }
    });

    return NextResponse.json({ ok: true, status: event.status });
  } catch (err) {
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
