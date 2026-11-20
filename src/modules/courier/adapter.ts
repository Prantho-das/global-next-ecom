import { AppError } from "@/lib/errors";

export type CourierCode = "steadfast" | "pathao" | "redx";

export interface BookingInput {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  division: string;
  district: string;
  thana: string;
  codAmountPoisha: number;
  weightG: number;
  config: Record<string, string>;
}

export interface BookingResult {
  consignmentId: string;
  trackingCode: string;
  feePoisha: number;
  raw: Record<string, unknown>;
}

export interface TrackingResult {
  status: string;
  raw: Record<string, unknown>;
}

export interface NormalizedCourierEvent {
  eventId: string;
  consignmentId: string;
  status: "pending" | "in_transit" | "delivered" | "returned" | "cancelled";
  codCollectedPoisha: number;
  raw: Record<string, unknown>;
}

export interface CourierAdapter {
  readonly code: CourierCode;
  book(input: BookingInput): Promise<BookingResult>;
  track(
    consignmentId: string,
    config: Record<string, string>,
  ): Promise<TrackingResult>;
  cancel(consignmentId: string, config: Record<string, string>): Promise<void>;
  parseWebhook(
    req: Request,
    config: Record<string, string>,
  ): Promise<NormalizedCourierEvent>;
  getBalance?(config: Record<string, string>): Promise<number>;
}

const ALLOWED_COURIER_HOSTS = new Set([
  "portal.steadfast.com.bd",
  "api-hermes.pathao.com",
  "sandbox.pathao.com",
  "openapi.redx.com.bd",
]);

export function assertAllowedCourierUrl(rawUrl: string): void {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" || !ALLOWED_COURIER_HOSTS.has(parsed.hostname)) {
    throw new AppError("FORBIDDEN", `Disallowed courier host: ${parsed.hostname}`);
  }
}
