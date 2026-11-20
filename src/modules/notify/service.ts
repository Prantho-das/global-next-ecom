export const NOTIFICATION_EVENTS = [
  "order.created",
  "order.confirmed",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.returned",
  "order.on_hold",
  "payment.received",
  "cart.abandoned",
  "coupon.issued",
  "stock.low",
  "fraud.flagged",
  "user.registered",
  "password.reset",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = "email" | "sms" | "push";

export const MAX_NOTIFY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000;
const GSM_SINGLE_LIMIT = 160;
const GSM_MULTI_LIMIT = 153;
const UNICODE_SINGLE_LIMIT = 70;
const UNICODE_MULTI_LIMIT = 67;

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

export function isUnicodeSms(text: string): boolean {
  return /[^\x00-\x7F]/.test(text);
}

export function calculateSmsSegments(text: string): {
  encoding: "gsm7" | "ucs2";
  length: number;
  segments: number;
} {
  const length = text.length;
  if (length === 0) {
    return { encoding: "gsm7", length: 0, segments: 0 };
  }
  const unicode = isUnicodeSms(text);
  const singleLimit = unicode ? UNICODE_SINGLE_LIMIT : GSM_SINGLE_LIMIT;
  const multiLimit = unicode ? UNICODE_MULTI_LIMIT : GSM_MULTI_LIMIT;
  const segments = length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
  return {
    encoding: unicode ? "ucs2" : "gsm7",
    length,
    segments,
  };
}

export function computeNextRetryDelayMs(attempts: number): number {
  const exp = Math.max(0, attempts - 1);
  return BASE_BACKOFF_MS * Math.pow(2, exp);
}

export function resolveDeliveryFailureStatus(
  attempts: number,
): "failed" | "dead_letter" {
  return attempts >= MAX_NOTIFY_ATTEMPTS ? "dead_letter" : "failed";
}

export function resolveChannelsForEvent(
  type: NotificationEventType,
): NotificationChannel[] {
  switch (type) {
    case "fraud.flagged":
    case "stock.low":
      return ["email", "push"];
    case "password.reset":
      return ["email", "sms"];
    default:
      return ["email", "sms", "push"];
  }
}
