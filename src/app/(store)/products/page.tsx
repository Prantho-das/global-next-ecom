import type { Metadata } from "next";
import Link from "next/link";

import { formatBdt } from "@/lib/money";
import {
  getBrandsCached,
  getCategoriesTreeCached,
} from "@/modules/catalog/queries";
import { listStoreProductsCursor } from "@/modules/sales/queries";
import { computeFlatUnitPrice } from "@/modules/sales/service";

export const metadata: Metadata = {
  title: "Shop Catalog | BD Shop",
  description: "Filter and search products by category, brand, and price.",
};

export default async function StoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    sort?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const sort =
    params.sort === "price_asc" || params.sort === "price_desc"
      ? params.sort
      : "newest";

  const [page, categories, brands] = await Promise.all([
    listStoreProductsCursor({
      cursor: params.cursor ?? null,
      categorySlug: params.category,
      brandSlug: params.brand,
      search: params.q,
      sort,
    }),
    getCategoriesTreeCached(),
    getBrandsCached(),
  ]);

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>Catalog</h1>

      <form method="GET" className="card-panel white">
        <div className="row" style={{ marginBottom: 0 }}>
          <div className="col s12 m4">
            <label htmlFor="store-q">Search</label>
            <input
              id="store-q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Search products..."
            />
          </div>
          <div className="col s12 m3">
            <label htmlFor="store-cat">Category</label>
            <select
              id="store-cat"
              name="category"
              className="browser-default"
              defaultValue={params.category ?? ""}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col s12 m3">
            <label htmlFor="store-brand">Brand</label>
            <select
              id="store-brand"
              name="brand"
              className="browser-default"
              defaultValue={params.brand ?? ""}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col s12 m2">
            <label htmlFor="store-sort">Sort</label>
            <select
              id="store-sort"
              name="sort"
              className="browser-default"
              defaultValue={sort}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low-High</option>
              <option value="price_desc">Price: High-Low</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="btn waves-effect waves-light"
          style={{ marginTop: "12px" }}
        >
          Apply Filters
        </button>
      </form>

      {page.items.length === 0 ? (
        <div className="card-panel white">
          <p className="grey-text">No products match your filters.</p>
        </div>
      ) : (
        <div className="row">
          {page.items.map((item) => {
            const unitPrice = computeFlatUnitPrice(
              item.basePrice,
              item.salePrice,
            );
            return (
              <div key={item.id} className="col s12 m6 l3">
                <div className="card white">
                  <div className="card-content">
                    <span className="card-title" style={{ fontSize: "1.1rem" }}>
                      {item.name}
                    </span>
                    <p className="grey-text">{item.brandName ?? "Store"}</p>
                    <p style={{ fontWeight: 600 }}>{formatBdt(unitPrice)}</p>
                  </div>
                  <div className="card-action">
                    <Link href={`/products/${item.slug}`}>View</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {page.nextCursor !== null && (
        <div style={{ marginTop: "16px" }}>
          <Link
            href={`/products?cursor=${encodeURIComponent(page.nextCursor)}`}
            className="btn-flat"
          >
            Load More
          </Link>
        </div>
      )}
    </main>
  );
}
