import { createHmac, timingSafeEqual } from "crypto";

import { AppError } from "@/lib/errors";
import { toPoisha, toTaka } from "@/lib/money";
import { assertAllowedCourierUrl } from "@/modules/courier/adapter";
import type {
  BookingInput,
  BookingResult,
  CourierAdapter,
  CourierCode,
  NormalizedCourierEvent,
  TrackingResult,
} from "@/modules/courier/adapter";

function verifyCourierSig(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const steadfastAdapter: CourierAdapter = {
  code: "steadfast",
  async book(input: BookingInput): Promise<BookingResult> {
    const endpoint = "https://portal.steadfast.com.bd/api/v1/create_order";
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": input.config["apiKey"] ?? "",
        "Secret-Key": input.config["secretKey"] ?? "",
      },
      body: JSON.stringify({
        invoice: input.orderNumber,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        cod_amount: toTaka(input.codAmountPoisha),
      }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "Steadfast booking failed");
    }
    const json = (await res.json()) as {
      consignment?: { consignment_id?: number; tracking_code?: string };
    };
    return {
      consignmentId: String(json.consignment?.consignment_id ?? ""),
      trackingCode: json.consignment?.tracking_code ?? "",
      feePoisha: 6000,
      raw: json as Record<string, unknown>,
    };
  },
  async track(consignmentId, config): Promise<TrackingResult> {
    const endpoint = `https://portal.steadfast.com.bd/api/v1/status_by_cid/${encodeURIComponent(consignmentId)}`;
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      headers: {
        "Api-Key": config["apiKey"] ?? "",
        "Secret-Key": config["secretKey"] ?? "",
      },
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "Steadfast track failed");
    }
    const json = (await res.json()) as { delivery_status?: string };
    return { status: json.delivery_status ?? "unknown", raw: json };
  },
  async cancel(): Promise<void> {},
  async parseWebhook(req, config): Promise<NormalizedCourierEvent> {
    const text = await req.text();
    const sig = req.headers.get("x-steadfast-signature") ?? "";
    if (!verifyCourierSig(text, sig, config["webhookSecret"] ?? "")) {
      throw new AppError("UNAUTHORIZED", "Invalid Steadfast signature");
    }
    const data = JSON.parse(text) as {
      consignment_id?: string;
      status?: string;
      cod_amount?: number;
    };
    const rawStatus = (data.status ?? "").toLowerCase();
    const status =
      rawStatus === "delivered"
        ? "delivered"
        : rawStatus === "cancelled"
          ? "cancelled"
          : rawStatus === "returned"
            ? "returned"
            : "in_transit";
    return {
      eventId: `${data.consignment_id ?? ""}-${status}`,
      consignmentId: String(data.consignment_id ?? ""),
      status,
      codCollectedPoisha: toPoisha(data.cod_amount ?? 0),
      raw: data as Record<string, unknown>,
    };
  },
};

const pathaoAdapter: CourierAdapter = {
  code: "pathao",
  async book(input: BookingInput): Promise<BookingResult> {
    const endpoint = "https://api-hermes.pathao.com/aladdin/api/v1/orders";
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.config["accessToken"] ?? ""}`,
      },
      body: JSON.stringify({
        store_id: input.config["storeId"] ?? "",
        merchant_order_id: input.orderNumber,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        amount_to_collect: toTaka(input.codAmountPoisha),
        item_weight: input.weightG / 1000,
      }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "Pathao booking failed");
    }
    const json = (await res.json()) as {
      data?: { consignment_id?: string; delivery_fee?: number };
    };
    return {
      consignmentId: json.data?.consignment_id ?? "",
      trackingCode: json.data?.consignment_id ?? "",
      feePoisha: toPoisha(json.data?.delivery_fee ?? 60),
      raw: json as Record<string, unknown>,
    };
  },
  async track(consignmentId, config): Promise<TrackingResult> {
    const endpoint = `https://api-hermes.pathao.com/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`;
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${config["accessToken"] ?? ""}` },
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "Pathao track failed");
    }
    const json = (await res.json()) as { data?: { order_status?: string } };
    return { status: json.data?.order_status ?? "unknown", raw: json };
  },
  async cancel(): Promise<void> {},
  async parseWebhook(req, config): Promise<NormalizedCourierEvent> {
    const text = await req.text();
    const sig = req.headers.get("x-pathao-signature") ?? "";
    if (!verifyCourierSig(text, sig, config["webhookSecret"] ?? "")) {
      throw new AppError("UNAUTHORIZED", "Invalid Pathao signature");
    }
    const data = JSON.parse(text) as {
      consignment_id?: string;
      event?: string;
      collected_amount?: number;
    };
    const ev = (data.event ?? "").toLowerCase();
    const status = ev.includes("delivered")
      ? "delivered"
      : ev.includes("return")
        ? "returned"
        : ev.includes("cancel")
          ? "cancelled"
          : "in_transit";
    return {
      eventId: `${data.consignment_id ?? ""}-${ev}`,
      consignmentId: data.consignment_id ?? "",
      status,
      codCollectedPoisha: toPoisha(data.collected_amount ?? 0),
      raw: data as Record<string, unknown>,
    };
  },
};

const redxAdapter: CourierAdapter = {
  code: "redx",
  async book(input: BookingInput): Promise<BookingResult> {
    const endpoint = "https://openapi.redx.com.bd/v1.0.0-beta/parcel";
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-ACCESS-TOKEN": `Bearer ${input.config["token"] ?? ""}`,
      },
      body: JSON.stringify({
        customer_name: input.recipientName,
        customer_phone: input.recipientPhone,
        customer_address: input.recipientAddress,
        merchant_invoice_id: input.orderNumber,
        cash_collection_amount: toTaka(input.codAmountPoisha),
        parcel_weight: input.weightG,
      }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "RedX booking failed");
    }
    const json = (await res.json()) as { tracking_id?: string };
    return {
      consignmentId: json.tracking_id ?? "",
      trackingCode: json.tracking_id ?? "",
      feePoisha: 6000,
      raw: json as Record<string, unknown>,
    };
  },
  async track(consignmentId, config): Promise<TrackingResult> {
    const endpoint = `https://openapi.redx.com.bd/v1.0.0-beta/parcel/info/${encodeURIComponent(consignmentId)}`;
    assertAllowedCourierUrl(endpoint);
    const res = await fetch(endpoint, {
      headers: { "API-ACCESS-TOKEN": `Bearer ${config["token"] ?? ""}` },
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "RedX track failed");
    }
    const json = (await res.json()) as { parcel?: { status?: string } };
    return { status: json.parcel?.status ?? "unknown", raw: json };
  },
  async cancel(): Promise<void> {},
  async parseWebhook(req, config): Promise<NormalizedCourierEvent> {
    const text = await req.text();
    const sig = req.headers.get("x-redx-signature") ?? "";
    if (!verifyCourierSig(text, sig, config["webhookSecret"] ?? "")) {
      throw new AppError("UNAUTHORIZED", "Invalid RedX signature");
    }
    const data = JSON.parse(text) as {
      tracking_number?: string;
      status?: string;
    };
    const st = (data.status ?? "").toLowerCase();
    const status =
      st === "delivered"
        ? "delivered"
        : st === "returned"
          ? "returned"
          : st === "cancelled"
            ? "cancelled"
            : "in_transit";
    return {
      eventId: `${data.tracking_number ?? ""}-${status}`,
      consignmentId: data.tracking_number ?? "",
      status,
      codCollectedPoisha: 0,
      raw: data as Record<string, unknown>,
    };
  },
};

const COURIER_REGISTRY: Record<CourierCode, CourierAdapter> = {
  steadfast: steadfastAdapter,
  pathao: pathaoAdapter,
  redx: redxAdapter,
};

export function getCourierAdapter(code: CourierCode): CourierAdapter {
  return COURIER_REGISTRY[code];
}
