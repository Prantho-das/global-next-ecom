import { createHash, randomUUID } from "crypto";

import { cookies, headers } from "next/headers";

import { getSiteSettings, type SiteSettingsConfig } from "@/modules/settings/queries";

export type ConversionEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export interface ConversionUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  city?: string;
  state?: string;
  country?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  externalId?: string;
}

export interface ConversionEventInput {
  eventName: ConversionEventName;
  eventId?: string;
  eventTime?: number;
  sourceUrl?: string;
  currency?: string;
  valueMajor?: number;
  orderId?: string;
  contentIds?: string[];
  numItems?: number;
  userData?: ConversionUserData;
}

export function hashCapiValue(raw: string): string {
  return createHash("sha256")
    .update(raw.trim().toLowerCase())
    .digest("hex");
}

function normalizePhoneForHash(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("01") && digits.length === 11) {
    return `88${digits}`;
  }
  return digits;
}

export function buildMetaCapiPayload(
  input: ConversionEventInput,
  testEventCode?: string,
) {
  const eventId = input.eventId ?? randomUUID();
  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  const ud = input.userData ?? {};

  const userData: Record<string, unknown> = {};
  if (ud.email) userData.em = [hashCapiValue(ud.email)];
  if (ud.phone) {
    const norm = normalizePhoneForHash(ud.phone);
    if (norm) userData.ph = [hashCapiValue(norm)];
  }
  if (ud.firstName) userData.fn = [hashCapiValue(ud.firstName)];
  if (ud.city) userData.ct = [hashCapiValue(ud.city)];
  if (ud.state) userData.st = [hashCapiValue(ud.state)];
  if (ud.country) userData.country = [hashCapiValue(ud.country)];
  if (ud.externalId) userData.external_id = [hashCapiValue(ud.externalId)];
  if (ud.clientIp) userData.client_ip_address = ud.clientIp;
  if (ud.userAgent) userData.client_user_agent = ud.userAgent;
  if (ud.fbp) userData.fbp = ud.fbp;
  if (ud.fbc) userData.fbc = ud.fbc;

  const customData: Record<string, unknown> = {};
  if (input.currency) customData.currency = input.currency;
  if (input.valueMajor !== undefined) customData.value = Number(input.valueMajor.toFixed(2));
  if (input.orderId) customData.order_id = input.orderId;
  if (input.contentIds && input.contentIds.length > 0) {
    customData.content_ids = input.contentIds;
    customData.content_type = "product";
  }
  if (input.numItems !== undefined) customData.num_items = input.numItems;

  const eventItem: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    user_data: userData,
  };
  if (input.sourceUrl) eventItem.event_source_url = input.sourceUrl;
  if (Object.keys(customData).length > 0) eventItem.custom_data = customData;

  const payload: Record<string, unknown> = { data: [eventItem] };
  if (testEventCode && testEventCode.trim() !== "") {
    payload.test_event_code = testEventCode.trim();
  }
  return payload;
}

async function readRequestContext(): Promise<{
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}> {
  try {
    const [hdrs, store] = await Promise.all([headers(), cookies()]);
    const forwarded = hdrs.get("x-forwarded-for");
    const clientIp =
      forwarded?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? undefined;
    const userAgent = hdrs.get("user-agent") ?? undefined;
    const fbp = store.get("_fbp")?.value;
    const fbc = store.get("_fbc")?.value;
    return { clientIp, userAgent, fbp, fbc };
  } catch {
    return {};
  }
}

export async function sendServerConversionEvent(
  input: ConversionEventInput,
  settingsOverride?: SiteSettingsConfig,
): Promise<{ sent: string[]; errors: string[]; eventId: string }> {
  const eventId = input.eventId ?? randomUUID();
  const sent: string[] = [];
  const errors: string[] = [];

  try {
    const settings = settingsOverride ?? (await getSiteSettings());
    const reqCtx = await readRequestContext();
    const enriched: ConversionEventInput = {
      ...input,
      eventId,
      currency: input.currency ?? settings.currency ?? "BDT",
      userData: {
        ...reqCtx,
        ...input.userData,
      },
    };

    const tasks: Promise<void>[] = [];

    if (
      settings.metaCapiEnabled &&
      settings.metaPixelId.trim() !== "" &&
      settings.metaCapiAccessToken.trim() !== ""
    ) {
      const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        settings.metaPixelId.trim(),
      )}/events?access_token=${encodeURIComponent(
        settings.metaCapiAccessToken.trim(),
      )}`;
      const body = buildMetaCapiPayload(
        enriched,
        settings.metaCapiTestEventCode,
      );
      tasks.push(
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        })
          .then(async (res) => {
            if (res.ok) {
              sent.push("meta");
            } else {
              const text = await res.text().catch(() => "");
              errors.push(`meta:${res.status}:${text.slice(0, 180)}`);
            }
          })
          .catch((err) => {
            errors.push(
              `meta:${err instanceof Error ? err.message : "unknown"}`,
            );
          }),
      );
    }

    if (
      settings.tiktokPixelId.trim() !== "" &&
      settings.tiktokAccessToken.trim() !== ""
    ) {
      const tiktokEventMap: Record<ConversionEventName, string> = {
        PageView: "Pageview",
        ViewContent: "ViewContent",
        AddToCart: "AddToCart",
        InitiateCheckout: "InitiateCheckout",
        Purchase: "CompletePayment",
      };
      const ttBody = {
        event_source: "web",
        event_source_id: settings.tiktokPixelId.trim(),
        data: [
          {
            event: tiktokEventMap[enriched.eventName],
            event_time: enriched.eventTime ?? Math.floor(Date.now() / 1000),
            event_id: eventId,
            user: {
              ip: enriched.userData?.clientIp,
              user_agent: enriched.userData?.userAgent,
              email: enriched.userData?.email
                ? hashCapiValue(enriched.userData.email)
                : undefined,
              phone: enriched.userData?.phone
                ? hashCapiValue(normalizePhoneForHash(enriched.userData.phone))
                : undefined,
            },
            properties: {
              currency: enriched.currency,
              value: enriched.valueMajor,
              content_ids: enriched.contentIds,
              order_id: enriched.orderId,
            },
          },
        ],
      };
      tasks.push(
        fetch(
          "https://business-api.tiktok.com/open_api/v1.3/event/track/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Access-Token": settings.tiktokAccessToken.trim(),
            },
            body: JSON.stringify(ttBody),
            signal: AbortSignal.timeout(5000),
          },
        )
          .then(async (res) => {
            if (res.ok) {
              sent.push("tiktok");
            } else {
              const text = await res.text().catch(() => "");
              errors.push(`tiktok:${res.status}:${text.slice(0, 180)}`);
            }
          })
          .catch((err) => {
            errors.push(
              `tiktok:${err instanceof Error ? err.message : "unknown"}`,
            );
          }),
      );
    }

    if (
      settings.ga4MeasurementId.trim() !== "" &&
      settings.ga4ApiSecret.trim() !== ""
    ) {
      const ga4EventMap: Record<ConversionEventName, string> = {
        PageView: "page_view",
        ViewContent: "view_item",
        AddToCart: "add_to_cart",
        InitiateCheckout: "begin_checkout",
        Purchase: "purchase",
      };
      const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        settings.ga4MeasurementId.trim(),
      )}&api_secret=${encodeURIComponent(settings.ga4ApiSecret.trim())}`;
      const gaBody = {
        client_id: enriched.userData?.externalId ?? eventId,
        events: [
          {
            name: ga4EventMap[enriched.eventName],
            params: {
              currency: enriched.currency,
              value: enriched.valueMajor ?? 0,
              transaction_id: enriched.orderId,
            },
          },
        ],
      };
      tasks.push(
        fetch(gaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gaBody),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => {
            if (res.ok) sent.push("ga4");
            else errors.push(`ga4:${res.status}`);
          })
          .catch((err) => {
            errors.push(`ga4:${err instanceof Error ? err.message : "unknown"}`);
          }),
      );
    }

    await Promise.all(tasks);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "capi_error");
  }

  return { sent, errors, eventId };
}
