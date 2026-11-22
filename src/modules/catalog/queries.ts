import { and, asc, desc, eq, isNull, like, lt, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";
import {
  brands,
  categories,
  products,
  purchaseOrders,
  stockMovements,
  variants,
} from "@/modules/catalog/schema";
import type {
  BrandItem,
  CategoryNode,
  ProductListItem,
  StockMovementRow,
} from "@/modules/catalog/types";

const DEFAULT_PAGE_SIZE = 20;

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export const getBrandsCached = unstable_cache(
  async (): Promise<BrandItem[]> => {
    const db = getDb();
    return db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        status: brands.status,
        logoUrl: brands.logoUrl,
        seo: brands.seo,
      })
      .from(brands)
      .where(isNull(brands.deletedAt))
      .orderBy(asc(brands.name));
  },
  ["catalog-brands"],
  { tags: ["brands"] },
);

export const getCategoriesTreeCached = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const db = getDb();
    return db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        slug: categories.slug,
        status: categories.status,
        path: categories.path,
        depth: categories.depth,
        position: categories.position,
        seo: categories.seo,
      })
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.depth), asc(categories.position), asc(categories.name));
  },
  ["catalog-categories"],
  { tags: ["categories"] },
);

export async function listProductsCursor(opts: {
  cursor?: string | null;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<CursorPage<ProductListItem>> {
  const db = getDb();
  const limit = Math.min(opts.limit ?? DEFAULT_PAGE_SIZE, 100);
  const conditions = [isNull(products.deletedAt)];

  if (opts.status !== undefined && opts.status !== "") {
    conditions.push(eq(products.status, opts.status));
  }
  if (opts.search !== undefined && opts.search.trim() !== "") {
    const term = `%${opts.search.trim()}%`;
    const searchCond = or(like(products.name, term), like(products.slug, term));
    if (searchCond !== undefined) {
      conditions.push(searchCond);
    }
  }
  if (opts.cursor !== undefined && opts.cursor !== null && opts.cursor !== "") {
    conditions.push(lt(products.createdAt, new Date(opts.cursor)));
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      basePrice: products.basePrice,
      brandName: brands.name,
      createdAt: products.createdAt,
      variantCount: sql<number>`CAST(COUNT(${variants.id}) AS SIGNED)`,
      totalStock: sql<number>`CAST(COALESCE(SUM(${variants.stock}), 0) AS SIGNED)`,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(
      variants,
      and(eq(variants.productId, products.id), isNull(variants.deletedAt)),
    )
    .where(and(...conditions))
    .groupBy(products.id, brands.name)
    .orderBy(desc(products.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last !== undefined ? last.createdAt.toISOString() : null,
  };
}

export const getProductByIdCached = unstable_cache(
  async (productId: string) => {
    const db = getDb();
    return db.query.products.findFirst({
      where: and(eq(products.id, productId), isNull(products.deletedAt)),
      with: {
        brand: {
          columns: { id: true, name: true, slug: true },
        },
        categories: {
          columns: { categoryId: true },
        },
        images: {
          columns: {
            id: true,
            url: true,
            alt: true,
            position: true,
            variantIds: true,
          },
          orderBy: (img, { asc: ascOrder }) => [ascOrder(img.position)],
        },
        options: {
          columns: { id: true, name: true, position: true, values: true },
          orderBy: (opt, { asc: ascOrder }) => [ascOrder(opt.position)],
        },
        variants: {
          where: isNull(variants.deletedAt),
          columns: {
            id: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            costPrice: true,
            stock: true,
            weightG: true,
            barcode: true,
            optionValues: true,
            imageId: true,
            isDefault: true,
          },
        },
      },
    });
  },
  ["catalog-product-detail"],
  { tags: ["products"] },
);

export async function listStockMovementsCursor(opts: {
  cursor?: string | null;
  limit?: number;
}): Promise<CursorPage<StockMovementRow>> {
  const db = getDb();
  const limit = Math.min(opts.limit ?? DEFAULT_PAGE_SIZE, 100);
  const conditions =
    opts.cursor !== undefined && opts.cursor !== null && opts.cursor !== ""
      ? [lt(stockMovements.createdAt, new Date(opts.cursor))]
      : [];

  const rows = await db
    .select({
      id: stockMovements.id,
      variantId: stockMovements.variantId,
      sku: variants.sku,
      productName: products.name,
      delta: stockMovements.delta,
      reason: stockMovements.reason,
      refType: stockMovements.refType,
      refId: stockMovements.refId,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(variants, eq(stockMovements.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last !== undefined ? last.createdAt.toISOString() : null,
  };
}


export interface InventoryVariantRow {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  optionValues: Record<string, string>;
  stock: number;
  price: number;
  costPrice: number | null;
}

export async function listInventoryVariants(): Promise<InventoryVariantRow[]> {
  const db = getDb();
  return db
    .select({
      variantId: variants.id,
      productId: products.id,
      productName: products.name,
      sku: variants.sku,
      optionValues: variants.optionValues,
      stock: variants.stock,
      price: variants.price,
      costPrice: variants.costPrice,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(and(isNull(variants.deletedAt), isNull(products.deletedAt)))
    .orderBy(asc(variants.stock), asc(products.name))
    .limit(200);
}


export interface PurchaseOrderRow {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierPhone: string | null;
  status: string;
  totalCost: number;
  receivedAt: Date;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const db = getDb();
  return db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierName: purchaseOrders.supplierName,
      supplierPhone: purchaseOrders.supplierPhone,
      status: purchaseOrders.status,
      totalCost: purchaseOrders.totalCost,
      receivedAt: purchaseOrders.receivedAt,
    })
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.receivedAt))
    .limit(50);
}
