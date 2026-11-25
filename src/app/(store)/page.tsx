import type { Metadata } from "next";

import { StoreCampaignBento } from "@/components/store/store-campaign-bento";
import { StoreCategorySection } from "@/components/store/store-category-section";
import { StoreHeroBanner } from "@/components/store/store-hero-banner";
import { StoreProductSlider } from "@/components/store/store-product-slider";
import { StoreTopSelling } from "@/components/store/store-top-selling";
import { StoreTrustShowcase } from "@/components/store/store-trust-showcase";
import { StoreVideoGallery } from "@/components/store/store-video-gallery";
import { getStoreHomeDataCached } from "@/modules/sales/queries";
import { getSiteSettings } from "@/modules/settings/queries";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.metaTitle || settings.siteName,
    description: settings.metaDescription || settings.tagline,
  };
}

export default async function StoreHomePage() {
  const [{ featured, topSelling, rootCategories }, settings] = await Promise.all([
    getStoreHomeDataCached(),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-8 sm:space-y-12 w-full font-sans">
      <StoreHeroBanner
        slides={settings.heroSlides}
        sideTop={settings.heroSideTop}
        sideBottom={settings.heroSideBottom}
      />

      <StoreCategorySection categories={rootCategories} />

      <StoreTopSelling products={topSelling} />

      <StoreProductSlider
        title="সেরা ও বিশেষ অফার"
        subtitle="গ্রাহকদের সবচেয়ে পছন্দের ট্রেন্ডিং পণ্যসমূহ"
        products={featured}
        viewAllHref="/products"
      />

      <StoreTrustShowcase config={settings.trustSection} />

      <StoreVideoGallery videos={settings.storeVideos} />

      <StoreCampaignBento
        config={settings.campaignBento}
        supportPhone={settings.supportPhone}
      />
    </div>
  );
}
