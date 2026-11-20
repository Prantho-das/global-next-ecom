import { z } from "zod";

export const shippingZoneInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(100),
  type: z.enum(["flat", "weight", "price_based"]).default("flat"),
  isDefault: z.boolean().default(false),
});

export const shippingZoneAreaInputSchema = z.object({
  zoneId: z.string().min(1),
  division: z.string().trim().min(1).max(60),
  district: z.string().trim().max(60).default(""),
  thana: z.string().trim().max(60).nullable().optional(),
});

export const shippingRateInputSchema = z.object({
  zoneId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  minWeightG: z.number().int().min(0).default(0),
  maxWeightG: z.number().int().min(0).nullable().optional(),
  minCartAmount: z.number().int().min(0).default(0),
  maxCartAmount: z.number().int().min(0).nullable().optional(),
  price: z.number().int().min(0),
  estimatedDaysMin: z.number().int().min(1).default(1),
  estimatedDaysMax: z.number().int().min(1).default(3),
  isFreeAbove: z.number().int().min(0).nullable().optional(),
});

export const shippingSettingsInputSchema = z.object({
  freeShippingGlobalThreshold: z.number().int().min(0).nullable(),
  defaultWeightG: z.number().int().min(1).default(500),
});

export const shippingTestAddressSchema = z.object({
  division: z.string().trim().min(1),
  district: z.string().trim().default(""),
  thana: z.string().trim().default(""),
  totalWeightG: z.number().int().min(0).default(500),
  cartSubtotal: z.number().int().min(0).default(100000),
});
