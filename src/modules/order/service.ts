import { AppError } from "@/lib/errors";
import type { RiskLevel } from "@/modules/fraud/service";

export const ORDER_STATUSES = [
  "pending",
  "on_hold",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "on_hold", "cancelled"],
  on_hold: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function assertValidOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new AppError(
      "CONFLICT",
      `Illegal order transition from "${from}" to "${to}"`,
    );
  }
}

export function routeOrderByRisk(riskLevel: RiskLevel): {
  initialStatus: OrderStatus;
  requiresSmsVerify: boolean;
} {
  if (riskLevel === "high") {
    return { initialStatus: "on_hold", requiresSmsVerify: false };
  }
  if (riskLevel === "medium") {
    return { initialStatus: "confirmed", requiresSmsVerify: true };
  }
  return { initialStatus: "confirmed", requiresSmsVerify: false };
}

export function shouldRestockOnTransition(to: OrderStatus): boolean {
  return to === "cancelled" || to === "returned";
}
