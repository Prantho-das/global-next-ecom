import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  apiKey?: string;
  from?: string;
}

export interface SmsSendInput {
  to: string;
  message: string;
  senderId?: string;
  provider?: "ssl_wireless" | "bulksmsbd";
  apiKey?: string;
}

export interface PushSendInput {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  serverKey?: string;
}

export interface AdapterSendResult {
  providerId: string;
}

export async function sendResendEmail(
  input: EmailSendInput,
): Promise<AdapterSendResult> {
  if (!input.apiKey) {
    logger.info("Resend dry-run email", { subject: input.subject });
    return { providerId: `dry_email_${Date.now()}` };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      from: input.from ?? "no-reply@example.com",
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    throw new AppError("INTERNAL", "Resend email delivery failed");
  }
  const json = (await res.json()) as { id?: string };
  return { providerId: json.id ?? `resend_${Date.now()}` };
}

export async function sendBdSms(
  input: SmsSendInput,
): Promise<AdapterSendResult> {
  const maskedSender = input.senderId ?? "BDSHOP";
  if (!input.apiKey) {
    logger.info("BD SMS dry-run", {
      provider: input.provider ?? "ssl_wireless",
      senderId: maskedSender,
    });
    return { providerId: `dry_sms_${Date.now()}` };
  }
  const endpoint =
    input.provider === "bulksmsbd"
      ? "https://bulksmsbd.net/api/smsapi"
      : "https://smsplus.sslwireless.com/api/v3/send-sms";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_token: input.apiKey,
      sid: maskedSender,
      msisdn: input.to,
      sms: input.message,
    }),
  });
  if (!res.ok) {
    throw new AppError("INTERNAL", "BD SMS delivery failed");
  }
  return { providerId: `sms_${Date.now()}` };
}

export async function sendFcmPush(
  input: PushSendInput,
): Promise<AdapterSendResult> {
  if (!input.serverKey) {
    logger.info("FCM dry-run push", {
      title: input.title,
      hasTopic: input.topic !== undefined,
    });
    return { providerId: `dry_fcm_${Date.now()}` };
  }
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${input.serverKey}`,
    },
    body: JSON.stringify({
      to: input.topic !== undefined ? `/topics/${input.topic}` : input.token,
      notification: { title: input.title, body: input.body },
    }),
  });
  if (!res.ok) {
    throw new AppError("INTERNAL", "FCM push delivery failed");
  }
  return { providerId: `fcm_${Date.now()}` };
}
