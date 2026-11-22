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
      <PdpClient
        productName={product.name}
        brandName={product.brand?.name ?? null}
        description={product.description}
        images={product.images}
        variants={product.variants}
        salePrice={product.salePrice}
      />

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
