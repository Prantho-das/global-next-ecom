import { and, eq, gt, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  campaignRules,
  campaignTargets,
  campaigns,
  couponRedemptions,
  couponTargets,
  coupons,
  specialDays,
} from "@/modules/pricing/schema";
import type {
  ActiveCampaignInput,
  ActiveSpecialDayInput,
  CouponInput,
  DiscountType,
  TargetScope,
} from "@/modules/pricing/types";

export async function getActivePricingContext(now: Date = new Date()): Promise<{
  campaigns: ActiveCampaignInput[];
  specialDays: ActiveSpecialDayInput[];
}> {
  const db = getDb();
  const [campRows, targetRows, ruleRows, specialRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        priority: campaigns.priority,
        startsAt: campaigns.startsAt,
        endsAt: campaigns.endsAt,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, "active"),
          lte(campaigns.startsAt, now),
          gt(campaigns.endsAt, now),
        ),
      ),
    db
      .select({
        campaignId: campaignTargets.campaignId,
        scope: campaignTargets.scope,
        targetId: campaignTargets.targetId,
      })
      .from(campaignTargets),
    db
      .select({
        id: campaignRules.id,
        campaignId: campaignRules.campaignId,
        discountType: campaignRules.discountType,
        value: campaignRules.value,
        maxDiscount: campaignRules.maxDiscount,
      })
      .from(campaignRules),
    db
      .select({
        id: specialDays.id,
        name: specialDays.name,
        startsAt: specialDays.startsAt,
        endsAt: specialDays.endsAt,
        banner: specialDays.banner,
        ruleId: specialDays.ruleId,
      })
      .from(specialDays)
      .where(and(lte(specialDays.startsAt, now), gt(specialDays.endsAt, now))),
  ]);

  const ruleByCampId = new Map(
    ruleRows
      .filter((r) => r.campaignId !== null)
      .map((r) => [r.campaignId as string, r]),
  );
  const ruleById = new Map(ruleRows.map((r) => [r.id, r]));

  const activeCampaigns: ActiveCampaignInput[] = [];
  for (const camp of campRows) {
    const rule = ruleByCampId.get(camp.id);
    if (rule === undefined) {
      continue;
    }
    activeCampaigns.push({
      id: camp.id,
      name: camp.name,
      priority: camp.priority,
      startsAt: camp.startsAt,
      endsAt: camp.endsAt,
      discountType: rule.discountType as DiscountType,
      value: rule.value,
      maxDiscount: rule.maxDiscount,
      targets: targetRows
        .filter((t) => t.campaignId === camp.id)
        .map((t) => ({
          scope: t.scope as TargetScope,
          targetId: t.targetId,
        })),
    });
  }

  const activeSpecialDays: ActiveSpecialDayInput[] = [];
  for (const sd of specialRows) {
    const rule = ruleById.get(sd.ruleId);
    if (rule === undefined) {
      continue;
    }
    activeSpecialDays.push({
      id: sd.id,
      name: sd.name,
      startsAt: sd.startsAt,
      endsAt: sd.endsAt,
      banner: sd.banner,
      discountType: rule.discountType as DiscountType,
      value: rule.value,
      maxDiscount: rule.maxDiscount,
    });
  }

  return { campaigns: activeCampaigns, specialDays: activeSpecialDays };
}

export async function getCouponInputByCode(
  rawCode: string,
  userId: string | null,
): Promise<CouponInput | null> {
  const db = getDb();
  const code = rawCode.trim().toUpperCase();
  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      type: coupons.type,
      value: coupons.value,
      minCart: coupons.minCart,
      maxDiscount: coupons.maxDiscount,
      usageLimit: coupons.usageLimit,
      perUserLimit: coupons.perUserLimit,
      startsAt: coupons.startsAt,
      expiresAt: coupons.expiresAt,
      scope: coupons.scope,
      stackable: coupons.stackable,
      status: coupons.status,
    })
    .from(coupons)
    .where(sql`upper(${coupons.code}) = ${code}`)
    .limit(1);

  const coupon = rows[0];
  if (coupon === undefined) {
    return null;
  }

  const [targets, totalRows, userRows] = await Promise.all([
    db
      .select({ targetId: couponTargets.targetId })
      .from(couponTargets)
      .where(eq(couponTargets.couponId, coupon.id)),
    db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, coupon.id)),
    userId !== null
      ? db
          .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
          .from(couponRedemptions)
          .where(
            and(
              eq(couponRedemptions.couponId, coupon.id),
              eq(couponRedemptions.userId, userId),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type as "pct" | "flat" | "free_ship",
    value: coupon.value,
    minCart: coupon.minCart,
    maxDiscount: coupon.maxDiscount,
    usageLimit: coupon.usageLimit,
    totalRedemptions: totalRows[0]?.count ?? 0,
    perUserLimit: coupon.perUserLimit,
    userRedemptions: userRows[0]?.count ?? 0,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    scope: coupon.scope as TargetScope,
    stackable: coupon.stackable,
    status: coupon.status,
    targetIds: targets.map((t) => t.targetId),
  };
}
