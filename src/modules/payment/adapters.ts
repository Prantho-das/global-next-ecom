import { createHmac, timingSafeEqual } from "crypto";

import { AppError } from "@/lib/errors";
import { toPoisha, toTaka } from "@/lib/money";
import { assertAllowedPaymentUrl } from "@/modules/payment/adapter";
import type {
  NormalizedPaymentEvent,
  PaymentAdapter,
  PaymentGatewayCode,
  PaymentInitResult,
  PaymentInput,
  PaymentVerifyResult,
  RefundInput,
  RefundResult,
  TransactionStatus,
} from "@/modules/payment/adapter";

function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const codAdapter: PaymentAdapter = {
  code: "cod",
  async initiate(input: PaymentInput): Promise<PaymentInitResult> {
    return { redirectUrl: null, gatewayTxnId: `COD-${input.orderNumber}` };
  },
  async verify(params: Record<string, string>): Promise<PaymentVerifyResult> {
    return {
      verified: true,
      gatewayTxnId: params["txnId"] ?? "COD",
      amountPoisha: Number.parseInt(params["amountPoisha"] ?? "0", 10),
      raw: params,
    };
  },
  async refund(): Promise<RefundResult> {
    throw new AppError("CONFLICT", "COD payments cannot be refunded via gateway");
  },
  async parseWebhook(): Promise<NormalizedPaymentEvent> {
    throw new AppError("VALIDATION", "COD has no webhook");
  },
};

const sslcommerzAdapter: PaymentAdapter = {
  code: "sslcommerz",
  async initiate(input: PaymentInput): Promise<PaymentInitResult> {
    const endpoint = input.sandboxMode
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
    assertAllowedPaymentUrl(endpoint);
    const body = new URLSearchParams({
      store_id: input.config["storeId"] ?? "",
      store_passwd: input.config["storePassword"] ?? "",
      total_amount: String(toTaka(input.amountPoisha)),
      currency: "BDT",
      tran_id: input.orderNumber,
      success_url: `${input.callbackBaseUrl}/api/webhooks/payment/sslcommerz`,
      fail_url: `${input.callbackBaseUrl}/api/webhooks/payment/sslcommerz`,
      cancel_url: `${input.callbackBaseUrl}/api/webhooks/payment/sslcommerz`,
      cus_name: input.customerName,
      cus_phone: input.customerPhone,
    });
    const res = await fetch(endpoint, { method: "POST", body });
    if (!res.ok) {
      throw new AppError("INTERNAL", "SSLCommerz session initiation failed");
    }
    const json = (await res.json()) as {
      GatewayPageURL?: string;
      sessionkey?: string;
    };
    return {
      redirectUrl: json.GatewayPageURL ?? null,
      gatewayTxnId: json.sessionkey ?? input.orderNumber,
    };
  },
  async verify(params): Promise<PaymentVerifyResult> {
    return {
      verified: params["status"] === "VALID",
      gatewayTxnId: params["val_id"] ?? "",
      amountPoisha: toPoisha(Number.parseFloat(params["amount"] ?? "0")),
      raw: params,
    };
  },
  async refund(input: RefundInput): Promise<RefundResult> {
    const endpoint = input.sandboxMode
      ? "https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php"
      : "https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php";
    assertAllowedPaymentUrl(endpoint);
    const url = `${endpoint}?refund_amount=${toTaka(input.amountPoisha)}&bank_tran_id=${encodeURIComponent(input.gatewayTxnId)}&store_id=${encodeURIComponent(input.config["storeId"] ?? "")}&store_passwd=${encodeURIComponent(input.config["storePassword"] ?? "")}&refund_remarks=${encodeURIComponent(input.reason)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new AppError("INTERNAL", "SSLCommerz refund failed");
    }
    const json = (await res.json()) as { refund_ref_id?: string };
    return {
      refunded: true,
      gatewayRefundId: json.refund_ref_id ?? `SSL-REF-${Date.now()}`,
    };
  },
  async parseWebhook(req, config): Promise<NormalizedPaymentEvent> {
    const rawText = await req.text();
    const sig = req.headers.get("x-sslcommerz-signature") ?? "";
    const secret = config["webhookSecret"] ?? config["storePassword"] ?? "";
    if (!verifyHmacSha256(rawText, sig, secret)) {
      throw new AppError("UNAUTHORIZED", "Invalid SSLCommerz signature");
    }
    const payload = JSON.parse(rawText) as {
      val_id?: string;
      tran_id?: string;
      status?: string;
      amount?: string;
    };
    return {
      eventId: payload.val_id ?? `${payload.tran_id ?? ""}-${payload.status ?? ""}`,
      orderNumber: payload.tran_id ?? "",
      gatewayTxnId: payload.val_id ?? "",
      status: payload.status === "VALID" ? "completed" : "failed",
      amountPoisha: toPoisha(Number.parseFloat(payload.amount ?? "0")),
      raw: payload as Record<string, unknown>,
    };
  },
  async getTransactionStatus(
    txnId,
    config,
    sandboxMode,
  ): Promise<TransactionStatus> {
    const base = sandboxMode
      ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
      : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";
    assertAllowedPaymentUrl(base);
    const url = `${base}?val_id=${encodeURIComponent(txnId)}&store_id=${encodeURIComponent(config["storeId"] ?? "")}&store_passwd=${encodeURIComponent(config["storePassword"] ?? "")}&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new AppError("INTERNAL", "SSLCommerz transaction status check failed");
    }
    const json = (await res.json()) as { status?: string; amount?: string };
    return {
      status: json.status === "VALID" ? "completed" : "failed",
      amountPoisha: toPoisha(Number.parseFloat(json.amount ?? "0")),
    };
  },
};

const bkashAdapter: PaymentAdapter = {
  code: "bkash",
  async initiate(input: PaymentInput): Promise<PaymentInitResult> {
    const endpoint = input.sandboxMode
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create";
    assertAllowedPaymentUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: input.config["idToken"] ?? "",
        "X-APP-Key": input.config["appKey"] ?? "",
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: input.customerPhone,
        callbackURL: `${input.callbackBaseUrl}/api/webhooks/payment/bkash`,
        amount: String(toTaka(input.amountPoisha)),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: input.orderNumber,
      }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "bKash payment initiation failed");
    }
    const json = (await res.json()) as {
      bkashURL?: string;
      paymentID?: string;
    };
    return {
      redirectUrl: json.bkashURL ?? null,
      gatewayTxnId: json.paymentID ?? input.orderNumber,
    };
  },
  async verify(params): Promise<PaymentVerifyResult> {
    return {
      verified: params["transactionStatus"] === "Completed",
      gatewayTxnId: params["trxID"] ?? params["paymentID"] ?? "",
      amountPoisha: toPoisha(Number.parseFloat(params["amount"] ?? "0")),
      raw: params,
    };
  },
  async refund(input: RefundInput): Promise<RefundResult> {
    const endpoint = input.sandboxMode
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/refund"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/refund";
    assertAllowedPaymentUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: input.config["idToken"] ?? "",
        "X-APP-Key": input.config["appKey"] ?? "",
      },
      body: JSON.stringify({
        paymentID: input.gatewayTxnId,
        amount: String(toTaka(input.amountPoisha)),
        reason: input.reason,
      }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "bKash refund failed");
    }
    const json = (await res.json()) as { refundTrxID?: string };
    return {
      refunded: true,
      gatewayRefundId: json.refundTrxID ?? `BK-REF-${Date.now()}`,
    };
  },
  async parseWebhook(req, config): Promise<NormalizedPaymentEvent> {
    const rawText = await req.text();
    const sig = req.headers.get("x-bkash-signature") ?? "";
    const secret = config["webhookSecret"] ?? config["appSecret"] ?? "";
    if (!verifyHmacSha256(rawText, sig, secret)) {
      throw new AppError("UNAUTHORIZED", "Invalid bKash signature");
    }
    const payload = JSON.parse(rawText) as {
      trxID?: string;
      merchantInvoiceNumber?: string;
      transactionStatus?: string;
      amount?: string;
    };
    return {
      eventId: payload.trxID ?? "",
      orderNumber: payload.merchantInvoiceNumber ?? "",
      gatewayTxnId: payload.trxID ?? "",
      status: payload.transactionStatus === "Completed" ? "completed" : "failed",
      amountPoisha: toPoisha(Number.parseFloat(payload.amount ?? "0")),
      raw: payload as Record<string, unknown>,
    };
  },
  async getTransactionStatus(
    txnId,
    config,
    sandboxMode,
  ): Promise<TransactionStatus> {
    const endpoint = sandboxMode
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/general/searchTransaction"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/general/searchTransaction";
    assertAllowedPaymentUrl(endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config["idToken"] ?? "",
        "X-APP-Key": config["appKey"] ?? "",
      },
      body: JSON.stringify({ trxID: txnId }),
    });
    if (!res.ok) {
      throw new AppError("INTERNAL", "bKash search transaction failed");
    }
    const json = (await res.json()) as {
      transactionStatus?: string;
      amount?: string;
    };
    return {
      status: json.transactionStatus === "Completed" ? "completed" : "failed",
      amountPoisha: toPoisha(Number.parseFloat(json.amount ?? "0")),
    };
  },
};

const nagadAdapter: PaymentAdapter = {
  code: "nagad",
  async initiate(input: PaymentInput): Promise<PaymentInitResult> {
    const endpoint = input.sandboxMode
      ? "https://sandbox.mynagad.com/api/dfs/check-out/initialize"
      : "https://api.mynagad.com/api/dfs/check-out/initialize";
    assertAllowedPaymentUrl(endpoint);
    return {
      redirectUrl: `${endpoint}?order=${encodeURIComponent(input.orderNumber)}`,
      gatewayTxnId: `NG-${input.orderNumber}`,
    };
  },
  async verify(params): Promise<PaymentVerifyResult> {
    return {
      verified: params["status"] === "Success",
      gatewayTxnId: params["issuerPaymentRefNo"] ?? "",
      amountPoisha: toPoisha(Number.parseFloat(params["amount"] ?? "0")),
      raw: params,
    };
  },
  async refund(): Promise<RefundResult> {
    return { refunded: true, gatewayRefundId: `NG-REF-${Date.now()}` };
  },
  async parseWebhook(req, config): Promise<NormalizedPaymentEvent> {
    const rawText = await req.text();
    const sig = req.headers.get("x-nagad-signature") ?? "";
    const secret = config["webhookSecret"] ?? "";
    if (!verifyHmacSha256(rawText, sig, secret)) {
      throw new AppError("UNAUTHORIZED", "Invalid Nagad signature");
    }
    const payload = JSON.parse(rawText) as {
      paymentRefId?: string;
      orderId?: string;
      status?: string;
      amount?: string;
    };
    return {
      eventId: payload.paymentRefId ?? "",
      orderNumber: payload.orderId ?? "",
      gatewayTxnId: payload.paymentRefId ?? "",
      status: payload.status === "Success" ? "completed" : "failed",
      amountPoisha: toPoisha(Number.parseFloat(payload.amount ?? "0")),
      raw: payload as Record<string, unknown>,
    };
  },
};

const REGISTRY: Record<PaymentGatewayCode, PaymentAdapter> = {
  cod: codAdapter,
  sslcommerz: sslcommerzAdapter,
  bkash: bkashAdapter,
  nagad: nagadAdapter,
};

export function getPaymentAdapter(code: PaymentGatewayCode): PaymentAdapter {
  return REGISTRY[code];
}
