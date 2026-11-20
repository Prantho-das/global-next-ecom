import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { toTaka } from "@/lib/money";
import { productImages, products, variants } from "@/modules/catalog/schema";
import { renderFacebookCatalogCsv } from "@/modules/marketing/service";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const db = getDb();
  const baseUrl = getEnv().APP_URL;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      basePrice: products.basePrice,
      stock: sql<number>`coalesce(sum(${variants.stock}), 0)::int`,
      imageUrl: sql<string | null>`(
        SELECT ${productImages.url}
        FROM ${productImages}
        WHERE ${productImages.productId} = ${products.id}
        ORDER BY ${productImages.position} ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .leftJoin(variants, eq(variants.productId, products.id))
    .where(and(eq(products.status, "active"), isNull(products.deletedAt)))
    .groupBy(products.id)
    .limit(500);

  const csv = renderFacebookCatalogCsv(
    rows.map((r) => ({
      id: r.id,
      title: r.name,
      description: r.description,
      link: `${baseUrl}/products/${r.slug}`,
      imageLink: r.imageUrl ?? `${baseUrl}/placeholder.png`,
      priceBdt: toTaka(r.basePrice),
      availability: r.stock > 0 ? "in stock" : "out of stock",
    })),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
