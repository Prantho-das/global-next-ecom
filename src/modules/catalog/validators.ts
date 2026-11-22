import { z } from "zod";

export const MAX_PRODUCT_OPTIONS = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const seoMetaSchema = z.object({
  title: z.string().trim().max(60).optional(),
  description: z.string().trim().max(160).optional(),
  ogImage: z.string().trim().max(500).optional(),
});

export const brandInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Brand name is required").max(120),
  slug: z.string().trim().max(140).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  seo: seoMetaSchema.optional(),
});

export const deleteByIdSchema = z.object({
  id: z.string().min(1),
});

export const categoryInputSchema = z.object({
  id: z.string().min(1).optional(),
  parentId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(1, "Category name is required").max(120),
  slug: z.string().trim().max(140).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  position: z.number().int().min(0).default(0),
  seo: seoMetaSchema.optional(),
});

export const categoryReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        parentId: z.string().min(1).nullable(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const productOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  values: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
});

export const variantInputSchema = z.object({
  id: z.string().min(1).optional(),
  sku: z.string().trim().min(1, "SKU is required").max(80),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).nullable().optional(),
  costPrice: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  weightG: z.number().int().min(0).default(0),
  barcode: z.string().trim().max(80).nullable().optional(),
  optionValues: z.record(z.string(), z.string()).default({}),
  imageId: z.string().min(1).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const productImageInputSchema = z.object({
  id: z.string().min(1).optional(),
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().max(200).default(""),
  position: z.number().int().min(0).default(0),
  variantIds: z.array(z.string()).nullable().optional(),
});

export const productInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Product title is required").max(200),
  slug: z.string().trim().max(220).optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  brandId: z.string().min(1).nullable().optional(),
  categoryIds: z.array(z.string().min(1)).default([]),
  description: z.string().default(""),
  basePrice: z.number().int().min(0),
  salePrice: z.number().int().min(0).nullable().optional(),
  compareAtPrice: z.number().int().min(0).nullable().optional(),
  hasVariants: z.boolean().default(false),
  options: z
    .array(productOptionInputSchema)
    .max(MAX_PRODUCT_OPTIONS, "Maximum 3 options allowed")
    .default([]),
  variants: z.array(variantInputSchema).min(1),
  images: z.array(productImageInputSchema).default([]),
  seo: seoMetaSchema.optional(),
  vendor: z.string().trim().max(120).nullable().optional(),
  productType: z.string().trim().max(120).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  optionsReordered: z.boolean().optional(),
  confirmRegenerate: z.boolean().optional(),
});

export const stockAdjustSchema = z.object({
  variantId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((val) => val !== 0, "Stock delta cannot be zero"),
  reason: z.string().trim().min(2).max(200),
  refType: z.enum(["manual", "order", "return", "restock"]).default("manual"),
  refId: z.string().trim().min(1).max(120).default("admin"),
});

export type BrandInput = z.infer<typeof brandInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
