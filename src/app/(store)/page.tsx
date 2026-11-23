import type { Metadata } from "next";

import { StoreCampaignBento } from "@/components/store/store-campaign-bento";
import { StoreCategorySection } from "@/components/store/store-category-section";
import { StoreHeroBanner } from "@/components/store/store-hero-banner";
import { StoreProductSlider } from "@/components/store/store-product-slider";
import { StoreTopSelling } from "@/components/store/store-top-selling";
import { StoreTrustShowcase } from "@/components/store/store-trust-showcase";
import { StoreVideoGallery } from "@/components/store/store-video-gallery";
import { getStoreHomeDataCached } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "BASA World | শতভাগ প্রাকৃতিক ও খাঁটি খাদ্য সম্ভার",
  description:
    "সুন্দরবনের খাঁটি মধু, ঘানি সরিষার তেল, গাওয়া ঘি ও অর্গানিক বাদাম সারা বাংলাদেশে ক্যাশ অন হোম ডেলিভারি।",
};

export default async function StoreHomePage() {
  const { featured, rootCategories } = await getStoreHomeDataCached();

  const honeyGheeProducts = featured.filter(
    (p) =>
      p.name.includes("মধু") ||
      p.name.includes("ঘি") ||
      p.name.includes("তেল") ||
      p.name.toLowerCase().includes("honey") ||
      p.name.toLowerCase().includes("ghee") ||
      p.name.toLowerCase().includes("oil"),
  );

  const nutsSeedsProducts = featured.filter(
    (p) =>
      p.name.includes("বাদাম") ||
      p.name.includes("বীজ") ||
      p.name.includes("নাট") ||
      p.name.includes("সিড") ||
      p.name.toLowerCase().includes("nuts") ||
      p.name.toLowerCase().includes("seed"),
  );

  return (
    <div className="space-y-8 sm:space-y-12 w-full font-sans">
      <StoreHeroBanner />

      <StoreCategorySection categories={rootCategories} />

      <StoreTopSelling />

      <StoreProductSlider
        title="সেরা ও বিশেষ অফার"
        subtitle="গ্রাহকদের সবচেয়ে পছন্দের ট্রেন্ডিং অর্গানিক খাদ্যপণ্য"
        products={featured}
        viewAllHref="/products"
      />

      <StoreProductSlider
        title="খাঁটি মধু ও গাওয়া ঘি স্পেশাল"
        subtitle="প্রাকৃতিক চাকের মধু ও ঐতিহ্যবাহী কাঠের ঘানি ও গাওয়া ঘি"
        products={honeyGheeProducts.length > 0 ? honeyGheeProducts : featured}
        viewAllHref="/products?category=honey"
      />

      <StoreProductSlider
        title="প্রিমিয়াম ড্রাই ফ্রুটস ও স্বাস্থ্যকর বাদাম"
        subtitle="প্রতিদিনের শক্তি ও পুষ্টির জন্য সেরা মানের বাদাম ও সিড মিক্স"
        products={nutsSeedsProducts.length > 0 ? nutsSeedsProducts : featured}
        viewAllHref="/products?category=nuts"
      />

      <StoreTrustShowcase />

      <StoreVideoGallery />

      <StoreCampaignBento />
    </div>
  );
}
