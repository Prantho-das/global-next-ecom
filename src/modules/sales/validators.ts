import { z } from "zod";

export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number");

export const cartAddSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(99).default(1),
});

export const cartUpdateQtySchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(0).max(99),
});

export const cartRemoveSchema = z.object({
  variantId: z.string().min(1),
});

export const otpRequestSchema = z.object({
  phone: bdPhoneSchema,
});

export const checkoutSchema = z.object({
  phone: bdPhoneSchema,
  name: z.string().trim().min(2, "Name is required").max(120),
  division: z.string().trim().min(2, "Division is required").max(60),
  district: z.string().trim().min(2, "District is required").max(60),
  thana: z.string().trim().min(2, "Thana is required").max(60),
  line: z.string().trim().min(5, "Street address is required").max(300),
  note: z.string().trim().max(300).optional(),
  otpCode: z.string().trim().regex(/^\d{6}$/, "6-digit OTP is required"),
  idempotencyKey: z.string().min(8).max(120),
});

export const trackRequestOtpSchema = z.object({
  phone: bdPhoneSchema,
  orderNumber: z.string().trim().min(3).max(40),
});

export const trackVerifySchema = z.object({
  phone: bdPhoneSchema,
  orderNumber: z.string().trim().min(3).max(40),
  otpCode: z.string().trim().regex(/^\d{6}$/, "6-digit OTP is required"),
});

export const guestConvertSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  phone: bdPhoneSchema,
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
