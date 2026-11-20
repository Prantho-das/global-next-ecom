import { randomInt, randomUUID } from "crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/redis";
import { otpCodes } from "@/modules/auth/schema";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 3;
export const OTP_PHONE_LIMIT = 3;
export const OTP_PHONE_WINDOW_SEC = 3600;
export const OTP_IP_LIMIT = 10;
export const OTP_IP_WINDOW_SEC = 3600;

export type OtpPurpose = "login" | "checkout_verify" | "order_track";

export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) {
    return digits.slice(2);
  }
  return digits;
}

export function generateSixDigitOtp(): string {
  return String(randomInt(100000, 1000000));
}

export async function enforceOtpRateLimits(
  phone: string,
  ip: string | null,
): Promise<void> {
  const normalized = normalizeBdPhone(phone);
  await enforceRateLimit(normalized, {
    key: "otp:phone",
    limit: OTP_PHONE_LIMIT,
    windowSec: OTP_PHONE_WINDOW_SEC,
  });
  await enforceRateLimit(ip ?? "unknown", {
    key: "otp:ip",
    limit: OTP_IP_LIMIT,
    windowSec: OTP_IP_WINDOW_SEC,
  });
}

export async function issueOtpCode(
  phone: string,
  purpose: OtpPurpose,
): Promise<{ expiresAt: Date }> {
  const db = getDb();
  const normalized = normalizeBdPhone(phone);
  const code = generateSixDigitOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(otpCodes).values({
    id: randomUUID(),
    phone: normalized,
    code,
    purpose,
    expiresAt,
    attempts: 0,
  });

  logger.info("OTP dispatched", { purpose });
  return { expiresAt };
}

export async function verifyOtpCode(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  const db = getDb();
  const normalized = normalizeBdPhone(phone);
  const rows = await db
    .select({
      id: otpCodes.id,
      code: otpCodes.code,
      expiresAt: otpCodes.expiresAt,
      attempts: otpCodes.attempts,
    })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, normalized),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.verifiedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  const record = rows[0];
  if (record === undefined) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired OTP");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new AppError("UNAUTHORIZED", "OTP has expired");
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError("RATE_LIMITED", "Maximum OTP attempts exceeded");
  }
  if (record.code !== code) {
    await db
      .update(otpCodes)
      .set({ attempts: record.attempts + 1, updatedAt: new Date() })
      .where(eq(otpCodes.id, record.id));
    throw new AppError("UNAUTHORIZED", "Invalid OTP code");
  }

  await db
    .update(otpCodes)
    .set({ verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(otpCodes.id, record.id));
}
