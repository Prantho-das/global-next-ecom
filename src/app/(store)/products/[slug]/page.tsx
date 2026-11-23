import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdpClient } from "@/components/store/pdp-client";
import { StoreProductCard } from "@/components/store/store-product-card";
import { getStoreProductBySlugCached } from "@/modules/sales/queries";

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
    title: `${data.product.name} | BASA World`,
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
    <div className="py-6 font-sans space-y-8">
      <div className="text-xs text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
        <Link href="/" className="hover:text-[#5F9118]">হোম</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#5F9118]">পণ্যসমূহ</Link>
        <span>/</span>
        <span className="text-slate-800 font-bold truncate">{product.name}</span>
      </div>

      <PdpClient
        productName={product.name}
        brandName={product.brand?.name ?? null}
        description={product.description}
        images={product.images}
        variants={product.variants}
        salePrice={product.salePrice}
      />

      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-black text-slate-800">
            গ্রাহক পর্যালোচনা ও মতামত ({product.reviews.length})
          </h2>
          <span className="text-xs text-[#5F9118] font-bold">১০০% ভেরিফাইড ক্রেতা</span>
        </div>

        {product.reviews.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            এই পণ্যের জন্য এখনও কোন রিভিউ দেওয়া হয়নি। আপনি পণ্যটি অর্ডার করে প্রথম রিভিউ দিন!
          </p>
        ) : (
          <div className="space-y-3">
            {product.reviews.map((rev) => (
              <div key={rev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-slate-800">{rev.title}</strong>
                  <span className="text-xs text-[#E8B65D] font-bold">★ {rev.rating}/5</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{rev.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118]" />
            <h2 className="text-lg font-black text-slate-800">
              সম্পর্কিত আরও পণ্য
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((item) => (
              <StoreProductCard
                key={item.id}
                product={{
                  id: item.id,
                  name: item.name,
                  slug: item.slug,
                  basePrice: item.basePrice,
                  salePrice: item.salePrice,
                  imageUrl: item.imageUrl,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
