import { AppError } from "@/lib/errors";
import { pctOfHalfUp } from "@/lib/money";
import type {
  ActiveCampaignInput,
  ActiveSpecialDayInput,
  CouponInput,
  DiscountType,
  LineBreakdown,
  PriceBreakdown,
  PricingLineInput,
  TargetScope,
} from "@/modules/pricing/types";

function isWithinWindow(now: Date, startsAt: Date, endsAt: Date): boolean {
  return now.getTime() >= startsAt.getTime() && now.getTime() < endsAt.getTime();
}

function matchesTarget(
  line: PricingLineInput,
  scope: TargetScope,
  targetIds: readonly string[],
): boolean {
  if (scope === "all") {
    return true;
  }
  if (scope === "product") {
    return targetIds.includes(line.productId);
  }
  if (scope === "brand") {
    return line.brandId !== null && targetIds.includes(line.brandId);
  }
  if (scope === "category") {
    return line.categoryIds.some((cid) => targetIds.includes(cid));
  }
  return false;
}

function computeRuleDiscount(
  unitPrice: number,
  discountType: DiscountType,
  value: number,
  maxDiscount: number | null,
): number {
  if (unitPrice <= 0 || value <= 0) {
    return 0;
  }
  const raw =
    discountType === "pct" ? pctOfHalfUp(unitPrice, value) : value;
  const capped =
    maxDiscount !== null && maxDiscount >= 0
      ? Math.min(raw, maxDiscount)
      : raw;
  return Math.min(capped, unitPrice);
}

function pickBestCampaign(
  line: PricingLineInput,
  unitPrice: number,
  campaigns: readonly ActiveCampaignInput[],
  now: Date,
): { campaignId: string; discount: number } | null {
  const eligible = campaigns
    .filter((c) => isWithinWindow(now, c.startsAt, c.endsAt))
    .filter((c) =>
      c.targets.some((t) =>
        matchesTarget(line, t.scope, t.targetId !== null ? [t.targetId] : []),
      ),
    )
    .map((c) => ({
      campaignId: c.id,
      priority: c.priority,
      discount: computeRuleDiscount(
        unitPrice,
        c.discountType,
        c.value,
        c.maxDiscount,
      ),
    }))
    .filter((c) => c.discount > 0);

  if (eligible.length === 0) {
    return null;
  }

  eligible.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.discount - a.discount;
  });

  const best = eligible[0];
  return best !== undefined
    ? { campaignId: best.campaignId, discount: best.discount }
    : null;
}

function pickBestSpecialDay(
  unitPrice: number,
  specialDays: readonly ActiveSpecialDayInput[],
  now: Date,
): { specialDayId: string; discount: number } | null {
  let best: { specialDayId: string; discount: number } | null = null;
  for (const sd of specialDays) {
    if (!isWithinWindow(now, sd.startsAt, sd.endsAt)) {
      continue;
    }
    const discount = computeRuleDiscount(
      unitPrice,
      sd.discountType,
      sd.value,
      sd.maxDiscount,
    );
    if (discount > 0 && (best === null || discount > best.discount)) {
      best = { specialDayId: sd.id, discount };
    }
  }
  return best;
}

export function validateCoupon(
  coupon: CouponInput,
  lines: readonly PricingLineInput[],
  subtotal: number,
  hasCampaignOrSpecialDiscount: boolean,
  now: Date,
): void {
  if (coupon.status !== "active") {
    throw new AppError("VALIDATION", "Coupon is not active");
  }
  if (!isWithinWindow(now, coupon.startsAt, coupon.expiresAt)) {
    throw new AppError("VALIDATION", "Coupon is outside its valid date window");
  }
  if (subtotal < coupon.minCart) {
    throw new AppError("VALIDATION", "Cart subtotal does not meet coupon minimum");
  }
  if (
    coupon.usageLimit !== null &&
    coupon.totalRedemptions >= coupon.usageLimit
  ) {
    throw new AppError("VALIDATION", "Coupon global usage limit reached");
  }
  if (
    coupon.perUserLimit !== null &&
    coupon.userRedemptions >= coupon.perUserLimit
  ) {
    throw new AppError("VALIDATION", "Coupon per-user usage limit reached");
  }
  const hasEligibleLine = lines.some((l) =>
    matchesTarget(l, coupon.scope, coupon.targetIds),
  );
  if (!hasEligibleLine) {
    throw new AppError("VALIDATION", "Coupon does not apply to items in cart");
  }
  if (!coupon.stackable && hasCampaignOrSpecialDiscount) {
    throw new AppError(
      "VALIDATION",
      "Coupon cannot be stacked with active campaign discounts",
    );
  }
}

export function calculatePriceBreakdown(input: {
  lines: readonly PricingLineInput[];
  campaigns: readonly ActiveCampaignInput[];
  specialDays: readonly ActiveSpecialDayInput[];
  coupon: CouponInput | null;
  shippingFee: number;
  now?: Date;
}): PriceBreakdown {
  const now = input.now ?? new Date();
  if (input.shippingFee < 0) {
    throw new AppError("VALIDATION", "Shipping fee cannot be negative");
  }

  const lineBreakdowns: LineBreakdown[] = [];
  let campaignDiscountTotal = 0;
  let hasCampaignOrSpecialDiscount = false;

  for (const line of input.lines) {
    if (line.qty < 0 || line.basePrice < 0) {
      throw new AppError("VALIDATION", "Line price and quantity cannot be negative");
    }

    const afterSale =
      line.salePrice !== null &&
      line.salePrice >= 0 &&
      line.salePrice < line.basePrice
        ? line.salePrice
        : line.basePrice;

    const bestCampaign = pickBestCampaign(
      line,
      afterSale,
      input.campaigns,
      now,
    );
    const bestSpecial = pickBestSpecialDay(afterSale, input.specialDays, now);

    let campaignId: string | null = null;
    let specialDayId: string | null = null;
    let unitDiscount = 0;

    if (bestCampaign !== null && bestSpecial !== null) {
      if (bestSpecial.discount > bestCampaign.discount) {
        specialDayId = bestSpecial.specialDayId;
        unitDiscount = bestSpecial.discount;
      } else {
        campaignId = bestCampaign.campaignId;
        unitDiscount = bestCampaign.discount;
      }
    } else if (bestCampaign !== null) {
      campaignId = bestCampaign.campaignId;
      unitDiscount = bestCampaign.discount;
    } else if (bestSpecial !== null) {
      specialDayId = bestSpecial.specialDayId;
      unitDiscount = bestSpecial.discount;
    }

    if (unitDiscount > 0) {
      hasCampaignOrSpecialDiscount = true;
      campaignDiscountTotal += unitDiscount * line.qty;
    }

    const unitPrice = Math.max(0, afterSale - unitDiscount);
    const lineTotal = unitPrice * line.qty;

    lineBreakdowns.push({
      variantId: line.variantId,
      qty: line.qty,
      basePrice: line.basePrice,
      salePriceApplied: afterSale < line.basePrice ? afterSale : null,
      campaignId,
      specialDayId,
      unitDiscount,
      unitPrice,
      lineTotal,
    });
  }

  const subtotal = lineBreakdowns.reduce((sum, l) => sum + l.lineTotal, 0);
  let couponDiscount = 0;
  let shippingFee = input.shippingFee;
  let freeShippingApplied = shippingFee === 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;

  if (input.coupon !== null) {
    validateCoupon(
      input.coupon,
      input.lines,
      subtotal,
      hasCampaignOrSpecialDiscount,
      now,
    );
    couponId = input.coupon.id;
    couponCode = input.coupon.code;

    if (input.coupon.type === "free_ship") {
      shippingFee = 0;
      freeShippingApplied = true;
    } else {
      const eligibleSubtotal = input.lines.reduce((sum, line, idx) => {
        if (!matchesTarget(line, input.coupon?.scope ?? "all", input.coupon?.targetIds ?? [])) {
          return sum;
        }
        return sum + (lineBreakdowns[idx]?.lineTotal ?? 0);
      }, 0);

      const rawDiscount =
        input.coupon.type === "pct"
          ? pctOfHalfUp(eligibleSubtotal, input.coupon.value)
          : input.coupon.value;
      const capped =
        input.coupon.maxDiscount !== null
          ? Math.min(rawDiscount, input.coupon.maxDiscount)
          : rawDiscount;
      couponDiscount = Math.max(0, Math.min(capped, eligibleSubtotal, subtotal));
    }
  }

  const total = Math.max(0, subtotal - couponDiscount + shippingFee);

  return {
    lines: lineBreakdowns,
    subtotal,
    campaignDiscountTotal,
    couponId,
    couponCode,
    couponDiscount,
    shippingFee,
    freeShippingApplied,
    total,
  };
}
