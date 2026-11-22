export type DiscountType = "pct" | "flat";
export type TargetScope = "all" | "product" | "category" | "brand";

export interface PricingLineInput {
  variantId: string;
  productId: string;
  brandId: string | null;
  categoryIds: readonly string[];
  sku: string;
  name: string;
  qty: number;
  basePrice: number;
  salePrice: number | null;
  weightG: number;
}

export interface ActiveCampaignInput {
  id: string;
  name: string;
  priority: number;
  startsAt: Date;
  endsAt: Date;
  discountType: DiscountType;
  value: number;
  maxDiscount: number | null;
  targets: ReadonlyArray<{ scope: TargetScope; targetId: string | null }>;
}

export interface ActiveSpecialDayInput {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  banner?: string | null;
  discountType: DiscountType;
  value: number;
  maxDiscount: number | null;
}

export interface CouponInput {
  id: string;
  code: string;
  type: "pct" | "flat" | "free_ship";
  value: number;
  minCart: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  totalRedemptions: number;
  perUserLimit: number | null;
  userRedemptions: number;
  startsAt: Date;
  expiresAt: Date;
  scope: TargetScope;
  stackable: boolean;
  status: string;
  targetIds: readonly string[];
}

export interface LineBreakdown {
  variantId: string;
  qty: number;
  basePrice: number;
  salePriceApplied: number | null;
  campaignId: string | null;
  specialDayId: string | null;
  unitDiscount: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PriceBreakdown {
  lines: LineBreakdown[];
  subtotal: number;
  campaignDiscountTotal: number;
  couponId: string | null;
  couponCode: string | null;
  couponDiscount: number;
  shippingFee: number;
  freeShippingApplied: boolean;
  total: number;
}
