import { createHash, createHmac, timingSafeEqual } from "crypto";

import type { SegmentRule } from "@/modules/marketing/schema";

export type AbandonStage = "1h" | "24h" | "72h";

const HOUR_MS = 60 * 60 * 1000;
const DHAKA_OFFSET_HOURS = 6;

export function isQuietHoursDhaka(now: Date): boolean {
  const dhakaHour = (now.getUTCHours() + DHAKA_OFFSET_HOURS) % 24;
  return dhakaHour >= 22 || dhakaHour < 8;
}

export function resolveAbandonStage(input: {
  cartStatus: string;
  optedOut: boolean;
  lastActivityAt: Date;
  sentStages: readonly AbandonStage[];
  now: Date;
}): AbandonStage | null {
  if (input.cartStatus !== "active" || input.optedOut) {
    return null;
  }
  if (isQuietHoursDhaka(input.now)) {
    return null;
  }
  const idleMs = input.now.getTime() - input.lastActivityAt.getTime();
  if (idleMs >= 72 * HOUR_MS && !input.sentStages.includes("72h")) {
    return "72h";
  }
  if (idleMs >= 24 * HOUR_MS && !input.sentStages.includes("24h")) {
    return "24h";
  }
  if (idleMs >= 1 * HOUR_MS && !input.sentStages.includes("1h")) {
    return "1h";
  }
  return null;
}

export function signRecoveryToken(
  cartId: string,
  expiresAtMs: number,
  secret: string,
): string {
  const payload = `${cartId}.${expiresAtMs}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

export function verifyRecoveryToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): { cartId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [cartId, expStr, sig] = decoded.split(".");
    if (cartId === undefined || expStr === undefined || sig === undefined) {
      return null;
    }
    const exp = Number.parseInt(expStr, 10);
    if (!Number.isFinite(exp) || exp < nowMs) {
      return null;
    }
    const expected = createHmac("sha256", secret)
      .update(`${cartId}.${expStr}`)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    return { cartId };
  } catch {
    return null;
  }
}

export interface CustomerSegmentMetrics {
  spent: number;
  orders: number;
  lastOrderDays: number;
  categories: readonly string[];
  city: string;
  tags: readonly string[];
}

export function evaluateSegmentRules(
  metrics: CustomerSegmentMetrics,
  rules: readonly SegmentRule[],
): boolean {
  for (const rule of rules) {
    if (rule.field === "spent") {
      const target = Number(rule.value);
      if (rule.op === "gte" && !(metrics.spent >= target)) return false;
      if (rule.op === "lte" && !(metrics.spent <= target)) return false;
    } else if (rule.field === "orders") {
      const target = Number(rule.value);
      if (rule.op === "gte" && !(metrics.orders >= target)) return false;
      if (rule.op === "lte" && !(metrics.orders <= target)) return false;
    } else if (rule.field === "last_order_days") {
      const target = Number(rule.value);
      if (rule.op === "gte" && !(metrics.lastOrderDays >= target)) return false;
      if (rule.op === "lte" && !(metrics.lastOrderDays <= target)) return false;
    } else if (rule.field === "city") {
      if (metrics.city.toLowerCase() !== String(rule.value).toLowerCase()) {
        return false;
      }
    } else if (rule.field === "category") {
      if (!metrics.categories.includes(String(rule.value))) return false;
    } else if (rule.field === "tag") {
      if (!metrics.tags.includes(String(rule.value))) return false;
    }
  }
  return true;
}

export function sha256Normalized(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function shouldSendTrackingEvent(
  sentEventIds: ReadonlySet<string>,
  eventId: string,
): boolean {
  return !sentEventIds.has(eventId);
}

export function buildFbCapiPayload(input: {
  eventName:
    | "ViewContent"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase"
    | "CompleteRegistration"
    | "Search"
    | "ViewCategory";
  eventId: string;
  email?: string;
  phone?: string;
  name?: string;
  city?: string;
  valueTaka?: number;
}) {
  return {
    event_name: input.eventName,
    event_id: input.eventId,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: {
      ...(input.email ? { em: [sha256Normalized(input.email)] } : {}),
      ...(input.phone ? { ph: [sha256Normalized(input.phone)] } : {}),
      ...(input.name ? { fn: [sha256Normalized(input.name)] } : {}),
      ...(input.city ? { ct: [sha256Normalized(input.city)] } : {}),
      country: [sha256Normalized("bd")],
    },
    custom_data: {
      currency: "BDT",
      ...(input.valueTaka !== undefined ? { value: input.valueTaka } : {}),
    },
  };
}

export interface FeedProductRow {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  priceBdt: number;
  availability: "in stock" | "out of stock";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderGoogleMerchantXml(
  items: readonly FeedProductRow[],
): string {
  const xmlItems = items
    .map(
      (i) => `<item>
<g:id>${escapeXml(i.id)}</g:id>
<g:title>${escapeXml(i.title)}</g:title>
<g:description>${escapeXml(i.description)}</g:description>
<g:link>${escapeXml(i.link)}</g:link>
<g:image_link>${escapeXml(i.imageLink)}</g:image_link>
<g:availability>${i.availability}</g:availability>
<g:price>${i.priceBdt.toFixed(2)} BDT</g:price>
</item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>BD Shop Product Feed</title>
${xmlItems}
</channel>
</rss>`;
}

export function renderFacebookCatalogCsv(
  items: readonly FeedProductRow[],
): string {
  const header = "id,title,description,link,image_link,price,availability";
  const rows = items.map((i) =>
    [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      i.link,
      i.imageLink,
      `${i.priceBdt.toFixed(2)} BDT`,
      i.availability,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
