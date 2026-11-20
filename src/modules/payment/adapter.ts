import { AppError } from "@/lib/errors";

export type PaymentGatewayCode = "sslcommerz" | "bkash" | "nagad" | "cod";

export interface PaymentInput {
  orderId: string;
  orderNumber: string;
  amountPoisha: number;
  currency: "BDT";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  callbackBaseUrl: string;
  config: Record<string, string>;
  sandboxMode: boolean;
}

export interface PaymentInitResult {
  redirectUrl: string | null;
  gatewayTxnId: string;
}

export interface PaymentVerifyResult {
  verified: boolean;
  gatewayTxnId: string;
  amountPoisha: number;
  raw: Record<string, unknown>;
}

export interface RefundInput {
  gatewayTxnId: string;
  amountPoisha: number;
  reason: string;
  config: Record<string, string>;
  sandboxMode: boolean;
}

export interface RefundResult {
  refunded: boolean;
  gatewayRefundId: string;
}

export interface NormalizedPaymentEvent {
  eventId: string;
  orderNumber: string;
  gatewayTxnId: string;
  status: "completed" | "failed";
  amountPoisha: number;
  raw: Record<string, unknown>;
}

export interface TransactionStatus {
  status: "completed" | "pending" | "failed";
  amountPoisha: number;
}

export interface PaymentAdapter {
  readonly code: PaymentGatewayCode;
  initiate(input: PaymentInput): Promise<PaymentInitResult>;
  verify(
    params: Record<string, string>,
    config: Record<string, string>,
    sandboxMode: boolean,
  ): Promise<PaymentVerifyResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  parseWebhook(
    req: Request,
    config: Record<string, string>,
  ): Promise<NormalizedPaymentEvent>;
  getTransactionStatus?(
    txnId: string,
    config: Record<string, string>,
    sandboxMode: boolean,
  ): Promise<TransactionStatus>;
}

const ALLOWED_PAYMENT_HOSTS = new Set([
  "sandbox.sslcommerz.com",
  "securepay.sslcommerz.com",
  "tokenized.sandbox.bka.sh",
  "tokenized.pay.bka.sh",
  "sandbox.mynagad.com",
  "api.mynagad.com",
]);

export function assertAllowedPaymentUrl(rawUrl: string): void {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" || !ALLOWED_PAYMENT_HOSTS.has(parsed.hostname)) {
    throw new AppError("FORBIDDEN", `Disallowed payment host: ${parsed.hostname}`);
  }
}
