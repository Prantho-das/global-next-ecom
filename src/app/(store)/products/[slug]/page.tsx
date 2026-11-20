import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdpClient } from "@/components/store/pdp-client";
import { formatBdt } from "@/lib/money";
import { getStoreProductBySlugCached } from "@/modules/sales/queries";
import { computeFlatUnitPrice } from "@/modules/sales/service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStoreProductBySlugCached(slug);
  if (data === null) {
    return { title: "Product Not Found" };
  }
  return {
    title: data.product.seo?.title ?? data.product.name,
    description:
      data.product.seo?.description ?? data.product.description.slice(0, 160),
  };
}

export default async function StoreProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStoreProductBySlugCached(slug);
  if (data === null) {
    notFound();
  }
  const { product, related } = data;

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <div className="row">
        <div className="col s12 m6">
          <div className="card-panel white">
            {product.images.length === 0 ? (
              <p className="grey-text">No product images uploaded.</p>
            ) : (
              product.images.map((img) => (
                <div key={img.id} style={{ marginBottom: "8px" }}>
                  <p>{img.alt || product.name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col s12 m6">
          <div className="card-panel white">
            <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>
              {product.name}
            </h1>
            {product.brand !== null && (
              <p className="grey-text">Brand: {product.brand.name}</p>
            )}
            <PdpClient
              variants={product.variants}
              salePrice={product.salePrice}
            />
            <p style={{ marginTop: "16px" }}>{product.description}</p>
          </div>
        </div>
      </div>

      <section style={{ marginTop: "24px" }} aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" style={{ fontSize: "1.35rem" }}>
          Customer Reviews ({product.reviews.length})
        </h2>
        {product.reviews.length === 0 ? (
          <p className="grey-text">No reviews yet.</p>
        ) : (
          <ul className="collection">
            {product.reviews.map((rev) => (
              <li key={rev.id} className="collection-item">
                <strong>
                  {rev.title} ({rev.rating}/5)
                </strong>
                <p>{rev.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section style={{ marginTop: "32px" }} aria-labelledby="related-heading">
          <h2 id="related-heading" style={{ fontSize: "1.35rem" }}>
            Related Products
          </h2>
          <div className="row">
            {related.map((item) => (
              <div key={item.id} className="col s12 m6 l3">
                <div className="card white">
                  <div className="card-content">
                    <span className="card-title" style={{ fontSize: "1rem" }}>
                      {item.name}
                    </span>
                    <p>
                      {formatBdt(
                        computeFlatUnitPrice(item.basePrice, item.salePrice),
                      )}
                    </p>
                  </div>
                  <div className="card-action">
                    <Link href={`/products/${item.slug}`}>View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
