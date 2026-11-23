import type { Metadata } from "next";
import Link from "next/link";

import { StoreCampaignBento } from "@/components/store/store-campaign-bento";
import { StoreCategorySection } from "@/components/store/store-category-section";
import { StoreHeroBanner } from "@/components/store/store-hero-banner";
import { StoreProductCard } from "@/components/store/store-product-card";
import { StoreTrustShowcase } from "@/components/store/store-trust-showcase";
import { getStoreHomeDataCached } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "BASA World | শতভাগ প্রাকৃতিক ও খাঁটি খাদ্য সম্ভার",
  description:
    "সুন্দরবনের খাঁটি মধু, ঘানি সরিষার তেল, গাওয়া ঘি ও অর্গানিক বাদাম সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি।",
};

export default async function StoreHomePage() {
  const { featured, rootCategories } = await getStoreHomeDataCached();

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <StoreHeroBanner />

      <StoreCategorySection categories={rootCategories} />

      <section aria-labelledby="featured-heading" className="w-full my-6">
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
              <h2
                id="featured-heading"
                className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight"
              >
                জনপ্রিয় ও সেরা বিক্রিত পণ্যসমূহ
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              আমাদের সর্বাধিক জনপ্রিয় ও গ্রাহক প্রিয় খাঁটি পণ্য
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold text-[#5F9118] hover:underline"
          >
            সবগুলো দেখুন →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            কোন পণ্য পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {featured.map((prod) => (
              <StoreProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </section>

      <StoreCampaignBento />

      <StoreTrustShowcase />
    </div>
  );
}
