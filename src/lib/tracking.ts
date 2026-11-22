"use client";

import type { ConversionEventName } from "@/modules/marketing/capi";

export interface ClientTrackPayload {
  valueMajor?: number;
  currency?: string;
  orderId?: string;
  contentIds?: string[];
  numItems?: number;
}

export function trackStoreEvent(
  eventName: ConversionEventName,
  payload: ClientTrackPayload = {},
): string {
  const eventId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  if (typeof window !== "undefined") {
    const w = window as unknown as {
      fbq?: (
        cmd: string,
        event: string,
        params?: Record<string, unknown>,
        opts?: Record<string, unknown>,
      ) => void;
      gtag?: (
        cmd: string,
        event: string,
        params?: Record<string, unknown>,
      ) => void;
    };

    if (typeof w.fbq === "function") {
      w.fbq(
        "track",
        eventName,
        {
          value: payload.valueMajor,
          currency: payload.currency ?? "BDT",
          content_ids: payload.contentIds,
          content_type: payload.contentIds ? "product" : undefined,
          num_items: payload.numItems,
          order_id: payload.orderId,
        },
        { eventID: eventId },
      );
    }

    if (typeof w.gtag === "function") {
      const gaEventMap: Record<ConversionEventName, string> = {
        PageView: "page_view",
        ViewContent: "view_item",
        AddToCart: "add_to_cart",
        InitiateCheckout: "begin_checkout",
        Purchase: "purchase",
      };
      w.gtag("event", gaEventMap[eventName], {
        currency: payload.currency ?? "BDT",
        value: payload.valueMajor,
        transaction_id: payload.orderId,
      });
    }

    const body = JSON.stringify({
      eventName,
      eventId,
      sourceUrl: window.location.href,
      ...payload,
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/tracking/capi",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      void fetch("/api/tracking/capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  }

  return eventId;
}
