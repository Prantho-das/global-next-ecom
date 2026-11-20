import type { Metadata } from "next";
import Link from "next/link";

import { formatBdt } from "@/lib/money";
import { getStoreHomeDataCached } from "@/modules/sales/queries";
import { computeFlatUnitPrice } from "@/modules/sales/service";

export const metadata: Metadata = {
  title: "BD Shop | Online Store Bangladesh",
  description: "Shop quality products across Bangladesh with fast COD delivery.",
};

export default async function StoreHomePage() {
  const { featured, rootCategories } = await getStoreHomeDataCached();

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <section className="card-panel teal darken-2 white-text">
        <h1 style={{ fontSize: "2.25rem", marginTop: 0 }}>
          Welcome to BD Shop
        </h1>
        <p>Nationwide Cash on Delivery across all 64 districts.</p>
        <Link href="/products" className="btn white teal-text text-darken-3">
          Browse Catalog
        </Link>
      </section>

      {rootCategories.length > 0 && (
        <section style={{ marginTop: "24px" }} aria-labelledby="cats-heading">
          <h2 id="cats-heading" style={{ fontSize: "1.5rem" }}>
            Categories
          </h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {rootCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="chip"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: "32px" }} aria-labelledby="featured-heading">
        <h2 id="featured-heading" style={{ fontSize: "1.5rem" }}>
          Featured Products
        </h2>
        {featured.length === 0 ? (
          <p className="grey-text">No active products available yet.</p>
        ) : (
          <div className="row">
            {featured.map((prod) => {
              const price = computeFlatUnitPrice(
                prod.basePrice,
                prod.salePrice,
              );
              return (
                <div key={prod.id} className="col s12 m6 l3">
                  <div className="card white">
                    <div className="card-content">
                      <span
                        className="card-title"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {prod.name}
                      </span>
                      <p className="grey-text">{prod.brandName ?? "Store"}</p>
                      <p style={{ fontWeight: 600, marginTop: "8px" }}>
                        {formatBdt(price)}
                      </p>
                    </div>
                    <div className="card-action">
                      <Link href={`/products/${prod.slug}`}>View Details</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
