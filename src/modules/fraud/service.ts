import type { FraudSignalResult } from "@/modules/fraud/schema";

export type RiskLevel = "low" | "medium" | "high";
export type FraudDecision = "approve" | "sms_verify" | "hold";

export interface FraudRuleConfig {
  key: string;
  weight: number;
  enabled: boolean;
  config?: Record<string, unknown> | null;
}

export interface FraudEvaluationInput {
  phone: string;
  addressLine: string;
  isNewCustomer: boolean;
  paymentMethod: "cod" | "sslcommerz" | "bkash" | "nagad";
  orderTotalPoisha: number;
  maxLineQty: number;
  blacklistHit: boolean;
  ordersLast24hByPhone: number;
  ordersLast1hByIp: number;
  distinctPhonesOnDevice: number;
  courierStats: { delivered: number; returned: number; cancelled: number } | null;
  rules: readonly FraudRuleConfig[];
}

export interface FraudEvaluationResult {
  score: number;
  riskLevel: RiskLevel;
  decision: FraudDecision;
  signals: FraudSignalResult[];
}

export const DEFAULT_FRAUD_RULES: readonly FraudRuleConfig[] = [
  { key: "blacklist_hit", weight: 100, enabled: true },
  { key: "phone_velocity", weight: 25, enabled: true },
  { key: "ip_velocity", weight: 20, enabled: true },
  { key: "courier_ratio", weight: 30, enabled: true },
  { key: "fake_phone", weight: 20, enabled: true },
  { key: "address_quality", weight: 10, enabled: true },
  { key: "high_cod_new", weight: 15, enabled: true },
  { key: "multi_account", weight: 20, enabled: true },
  { key: "qty_anomaly", weight: 10, enabled: true },
];

const HIGH_COD_THRESHOLD_POISHA = 500000;
const QTY_ANOMALY_THRESHOLD = 10;

export function isSuspiciousBdPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("880") ? digits.slice(2) : digits;
  if (!/^01[3-9]\d{8}$/.test(normalized)) {
    return true;
  }
  const subscriber = normalized.slice(3);
  return /^(\d)\1{7}$/.test(subscriber);
}

export function isLowQualityAddress(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 8) {
    return true;
  }
  const alphaCount = (trimmed.match(/[a-zA-Z0-9\u0980-\u09FF]/g) ?? []).length;
  return alphaCount < 5;
}

function isSignalTriggered(
  key: string,
  input: FraudEvaluationInput,
): { matched: boolean; reason: string } {
  switch (key) {
    case "blacklist_hit":
      return {
        matched: input.blacklistHit,
        reason: "Matched blacklist entry",
      };
    case "phone_velocity":
      return {
        matched: input.ordersLast24hByPhone > 3,
        reason: `${input.ordersLast24hByPhone} orders in 24h on same phone`,
      };
    case "ip_velocity":
      return {
        matched: input.ordersLast1hByIp > 5,
        reason: `${input.ordersLast1hByIp} orders in 1h from same IP`,
      };
    case "courier_ratio": {
      if (input.courierStats === null) {
        return { matched: false, reason: "No prior courier history" };
      }
      const total =
        input.courierStats.delivered +
        input.courierStats.returned +
        input.courierStats.cancelled;
      if (total < 3) {
        return { matched: false, reason: "Fewer than 3 prior courier orders" };
      }
      const ratio = input.courierStats.delivered / total;
      return {
        matched: ratio < 0.6,
        reason: `Past courier delivery ratio ${(ratio * 100).toFixed(0)}%`,
      };
    }
    case "fake_phone":
      return {
        matched: isSuspiciousBdPhone(input.phone),
        reason: "Invalid BD format or repeated digits",
      };
    case "address_quality":
      return {
        matched: isLowQualityAddress(input.addressLine),
        reason: "Address too short or low quality",
      };
    case "high_cod_new":
      return {
        matched:
          input.isNewCustomer &&
          input.paymentMethod === "cod" &&
          input.orderTotalPoisha > HIGH_COD_THRESHOLD_POISHA,
        reason: "New customer high-value COD order",
      };
    case "multi_account":
      return {
        matched: input.distinctPhonesOnDevice > 2,
        reason: `${input.distinctPhonesOnDevice} phones on same device`,
      };
    case "qty_anomaly":
      return {
        matched: input.maxLineQty > QTY_ANOMALY_THRESHOLD,
        reason: `Single SKU qty ${input.maxLineQty} exceeds threshold`,
      };
    default:
      return { matched: false, reason: "Unknown rule" };
  }
}

export function evaluateFraudRisk(
  input: FraudEvaluationInput,
): FraudEvaluationResult {
  const rules =
    input.rules.length > 0 ? input.rules : DEFAULT_FRAUD_RULES;

  let rawScore = 0;
  const signals: FraudSignalResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }
    const evalRes = isSignalTriggered(rule.key, input);
    if (evalRes.matched) {
      rawScore += rule.weight;
    }
    signals.push({
      key: rule.key,
      matched: evalRes.matched,
      weight: rule.weight,
      reason: evalRes.reason,
    });
  }

  const score = Math.max(0, Math.min(100, rawScore));
  const riskLevel: RiskLevel =
    score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  const decision: FraudDecision =
    riskLevel === "high"
      ? "hold"
      : riskLevel === "medium"
        ? "sms_verify"
        : "approve";

  return { score, riskLevel, decision, signals };
}
