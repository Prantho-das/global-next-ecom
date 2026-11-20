import type { SeoMeta } from "@/modules/catalog/schema";

export type ProductStatus = "draft" | "active" | "archived";

export interface OptionDraft {
  name: string;
  values: string[];
}

export interface VariantDraft {
  id?: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  stock: number;
  weightG: number;
  barcode: string | null;
  optionValues: Record<string, string>;
  imageId: string | null;
  isDefault: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  basePrice: number;
  brandName: string | null;
  variantCount: number;
  totalStock: number;
  createdAt: Date;
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  depth: number;
  position: number;
  seo: SeoMeta | null;
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  seo: SeoMeta | null;
}

export interface StockMovementRow {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  delta: number;
  reason: string;
  refType: string;
  refId: string;
  createdAt: Date;
}
