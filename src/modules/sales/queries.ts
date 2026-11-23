import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";
import {
  brands,
  categories,
  productCategories,
  productImages,
  products,
  reviews,
  variants,
} from "@/modules/catalog/schema";
import { cartItems, carts, customers, orderEvents, orderItems, orders } from "@/modules/sales/schema";
import { computeFlatUnitPrice } from "@/modules/sales/service";

const STORE_PAGE_SIZE = 16;

export interface StoreProductCard {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  brandName: string | null;
  imageUrl: string | null;
  defaultVariantId: string | null;
  createdAt: Date;
}

export const getStoreHomeDataCached = unstable_cache(
  async () => {
    const db = getDb();
    const [featured, rootCategories, allBrands] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          basePrice: products.basePrice,
          salePrice: products.salePrice,
          compareAtPrice: products.compareAtPrice,
          brandName: brands.name,
          createdAt: products.createdAt,
          imageUrl: sql<string | null>`(
            SELECT ${productImages.url}
            FROM ${productImages}
            WHERE ${productImages.productId} = ${products.id}
            ORDER BY ${productImages.position} ASC
            LIMIT 1
          )`,
          defaultVariantId: sql<string | null>`(
            SELECT ${variants.id}
            FROM ${variants}
            WHERE ${variants.productId} = ${products.id}
            ORDER BY ${variants.isDefault} DESC, ${variants.createdAt} ASC
            LIMIT 1
          )`,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.status, "active"), isNull(products.deletedAt)))
        .orderBy(desc(products.createdAt))
        .limit(8),
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .where(and(eq(categories.depth, 0), isNull(categories.deletedAt)))
        .orderBy(asc(categories.position), asc(categories.name))
        .limit(8),
      db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
        })
        .from(brands)
        .where(isNull(brands.deletedAt))
        .orderBy(asc(brands.name))
        .limit(8),
    ]);

    return { featured, rootCategories, allBrands };
  },
  ["store-home-data"],
  { tags: ["products", "categories", "brands"] },
);

export async function listStoreProductsCursor(opts: {
  cursor?: string | null;
  limit?: number;
  categorySlug?: string;
  brandSlug?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
}): Promise<{ items: StoreProductCard[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = Math.min(opts.limit ?? STORE_PAGE_SIZE, 48);
  const conditions = [
    eq(products.status, "active"),
    isNull(products.deletedAt),
  ];

  if (opts.brandSlug !== undefined && opts.brandSlug !== "") {
    conditions.push(eq(brands.slug, opts.brandSlug));
  }

  if (opts.categorySlug !== undefined && opts.categorySlug !== "") {
    const catRows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, opts.categorySlug), isNull(categories.deletedAt)))
      .limit(1);
    const cat = catRows[0];
    if (cat === undefined) {
      return { items: [], nextCursor: null };
    }
    const prodIds = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, cat.id));
    if (prodIds.length === 0) {
      return { items: [], nextCursor: null };
    }
    conditions.push(
      inArray(
        products.id,
        prodIds.map((p) => p.productId),
      ),
    );
  }

  if (opts.search !== undefined && opts.search.trim() !== "") {
    const term = `%${opts.search.trim()}%`;
    const searchCond = or(like(products.name, term), like(products.description, term));
    if (searchCond !== undefined) {
      conditions.push(searchCond);
    }
  }

  if (opts.cursor !== undefined && opts.cursor !== null && opts.cursor !== "") {
    conditions.push(lt(products.createdAt, new Date(opts.cursor)));
  }

  const orderByClause =
    opts.sort === "price_asc"
      ? asc(products.basePrice)
      : opts.sort === "price_desc"
        ? desc(products.basePrice)
        : desc(products.createdAt);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      basePrice: products.basePrice,
      salePrice: products.salePrice,
      compareAtPrice: products.compareAtPrice,
      brandName: brands.name,
      createdAt: products.createdAt,
      imageUrl: sql<string | null>`(
        SELECT ${productImages.url}
        FROM ${productImages}
        WHERE ${productImages.productId} = ${products.id}
        ORDER BY ${productImages.position} ASC
        LIMIT 1
      )`,
      defaultVariantId: sql<string | null>`(
        SELECT ${variants.id}
        FROM ${variants}
        WHERE ${variants.productId} = ${products.id}
        ORDER BY ${variants.isDefault} DESC, ${variants.createdAt} ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last !== undefined ? last.createdAt.toISOString() : null,
  };
}

export const getStoreProductBySlugCached = unstable_cache(
  async (slug: string) => {
    const db = getDb();
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.slug, slug),
        eq(products.status, "active"),
        isNull(products.deletedAt),
      ),
      with: {
        brand: { columns: { id: true, name: true, slug: true } },
        images: {
          columns: { id: true, url: true, alt: true, position: true },
          orderBy: (img, { asc: ascOrd }) => [ascOrd(img.position)],
        },
        options: {
          columns: { id: true, name: true, position: true, values: true },
          orderBy: (opt, { asc: ascOrd }) => [ascOrd(opt.position)],
        },
        variants: {
          where: isNull(variants.deletedAt),
          columns: {
            id: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            stock: true,
            optionValues: true,
            imageId: true,
            isDefault: true,
          },
        },
        reviews: {
          where: eq(reviews.status, "approved"),
          columns: {
            id: true,
            rating: true,
            title: true,
            body: true,
            isVerified: true,
            createdAt: true,
          },
          limit: 10,
        },
      },
    });

    if (product === undefined) {
      return null;
    }

    const related = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        basePrice: products.basePrice,
        salePrice: products.salePrice,
        compareAtPrice: products.compareAtPrice,
        brandName: brands.name,
        createdAt: products.createdAt,
        imageUrl: sql<string | null>`(
          SELECT ${productImages.url}
          FROM ${productImages}
          WHERE ${productImages.productId} = ${products.id}
          ORDER BY ${productImages.position} ASC
          LIMIT 1
        )`,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(
        and(
          eq(products.status, "active"),
          isNull(products.deletedAt),
          ne(products.id, product.id),
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(4);

    return { product, related };
  },
  ["store-pdp"],
  { tags: ["products"] },
);

export interface CartViewItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  optionValues: Record<string, string>;
  qty: number;
  unitPrice: number;
  stock: number;
}

export async function getActiveCartView(
  sessionId: string | null,
  userId: string | null,
): Promise<{ cartId: string | null; items: CartViewItem[]; subtotal: number }> {
  if (sessionId === null && userId === null) {
    return { cartId: null, items: [], subtotal: 0 };
  }
  const db = getDb();
  const cartRows = await db
    .select({ id: carts.id })
    .from(carts)
    .where(
      userId !== null
        ? and(eq(carts.userId, userId), eq(carts.status, "active"))
        : and(eq(carts.sessionId, sessionId ?? ""), eq(carts.status, "active")),
    )
    .limit(1);

  const cart = cartRows[0];
  if (cart === undefined) {
    return { cartId: null, items: [], subtotal: 0 };
  }

  const rows = await db
    .select({
      variantId: variants.id,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      sku: variants.sku,
      optionValues: variants.optionValues,
      qty: cartItems.qty,
      variantPrice: variants.price,
      salePrice: products.salePrice,
      stock: variants.stock,
    })
    .from(cartItems)
    .innerJoin(variants, eq(cartItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(cartItems.cartId, cart.id));

  const items: CartViewItem[] = rows.map((r) => ({
    variantId: r.variantId,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug,
    sku: r.sku,
    optionValues: r.optionValues,
    qty: r.qty,
    unitPrice: computeFlatUnitPrice(r.variantPrice, r.salePrice),
    stock: r.stock,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  return { cartId: cart.id, items, subtotal };
}

export async function getOrderSuccessSummary(orderNumber: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      subtotal: orders.subtotal,
      shippingFee: orders.shippingFee,
      total: orders.total,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      customerPhone: customers.phone,
      customerName: customers.name,
      isGuest: customers.isGuest,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(eq(orders.number, orderNumber), isNull(orders.deletedAt)))
    .limit(1);

  const order = rows[0];
  if (order === undefined) {
    return null;
  }

  const [items, events] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        nameSnapshot: orderItems.nameSnapshot,
        skuSnapshot: orderItems.skuSnapshot,
        qty: orderItems.qty,
        priceSnapshot: orderItems.priceSnapshot,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id)),
    db
      .select({
        id: orderEvents.id,
        fromStatus: orderEvents.fromStatus,
        toStatus: orderEvents.toStatus,
        note: orderEvents.note,
        createdAt: orderEvents.createdAt,
      })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(asc(orderEvents.createdAt)),
  ]);

  return { order, items, events };
}
