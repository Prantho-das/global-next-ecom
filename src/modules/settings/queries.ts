import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";
import { siteSettings } from "@/modules/settings/schema";

export interface ShippingStateRule {
  id: string;
  country: string;
  state: string;
}

export interface ShippingLocationRule {
  id: string;
  country: string;
  state: string;
  area: string;
  cost: number;
}

export const DEFAULT_SHIPPING_LOCATIONS: ShippingLocationRule[] = [
  { id: "loc-bd-dhaka-city", country: "Bangladesh", state: "Dhaka", area: "Dhaka", cost: 60 },
  { id: "loc-bd-dhaka-gazipur", country: "Bangladesh", state: "Dhaka", area: "Gazipur", cost: 100 },
  { id: "loc-bd-dhaka-narayanganj", country: "Bangladesh", state: "Dhaka", area: "Narayanganj", cost: 100 },
  { id: "loc-bd-ctg", country: "Bangladesh", state: "Chattogram", area: "Chattogram", cost: 120 },
  { id: "loc-bd-cox", country: "Bangladesh", state: "Chattogram", area: "Cox's Bazar", cost: 130 },
  { id: "loc-bd-sylhet", country: "Bangladesh", state: "Sylhet", area: "Sylhet", cost: 120 },
  { id: "loc-bd-rajshahi", country: "Bangladesh", state: "Rajshahi", area: "Rajshahi", cost: 120 },
  { id: "loc-bd-khulna", country: "Bangladesh", state: "Khulna", area: "Khulna", cost: 120 },
  { id: "loc-bd-barishal", country: "Bangladesh", state: "Barishal", area: "Barishal", cost: 130 },
  { id: "loc-bd-rangpur", country: "Bangladesh", state: "Rangpur", area: "Rangpur", cost: 130 },
  { id: "loc-bd-mymensingh", country: "Bangladesh", state: "Mymensingh", area: "Mymensingh", cost: 120 },
  { id: "loc-ae-dubai", country: "United Arab Emirates", state: "Dubai", area: "Dubai", cost: 1500 },
  { id: "loc-uk-london", country: "United Kingdom", state: "England", area: "London", cost: 2500 },
];

export interface HeroSlideItem {
  id: string;
  img: string;
  alt: string;
  link: string;
}

export interface StoreVideoItem {
  id: string;
  title: string;
  category: string;
  date: string;
  duration: string;
  thumbnail: string;
  youtubeId: string;
}

export interface TrustFeatureItem {
  title: string;
  desc: string;
}

export interface TrustSectionConfig {
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  leftFeatures: TrustFeatureItem[];
  rightFeatures: TrustFeatureItem[];
}

export interface CampaignBentoConfig {
  mainImg: string;
  mainBadge: string;
  mainTitle: string;
  mainSubtitle: string;
  mainLink: string;
  leftImg: string;
  leftLink: string;
  rightImg: string;
  rightLink: string;
  deliveryImg: string;
  deliveryTitle: string;
  deliverySubtitle: string;
}

export interface SiteSettingsConfig {
  siteName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  storeAddress: string;
  currency: string;
  timezone: string;
  announcementBar: string;
  maintenanceMode: boolean;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  robotsIndex: boolean;
  metaPixelId: string;
  metaCapiEnabled: boolean;
  metaCapiAccessToken: string;
  metaCapiTestEventCode: string;
  ga4MeasurementId: string;
  ga4ApiSecret: string;
  gtmContainerId: string;
  tiktokPixelId: string;
  tiktokAccessToken: string;
  guestCheckoutEnabled: boolean;
  requirePhoneOtp: boolean;
  autoConfirmOrders: boolean;
  orderPrefix: string;
  minOrderAmount: number;
  maxCodAmount: number;
  taxRatePct: number;
  shippingMode: "simple" | "advanced";
  insideDhakaFee: number;
  outsideDhakaFee: number;
  defaultCountry: string;
  shippingCountries: string[];
  shippingStates: ShippingStateRule[];
  shippingLocations: ShippingLocationRule[];
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  smsProvider: string;
  smsSenderId: string;
  fraudAutoHoldScore: number;
  heroSlides: HeroSlideItem[];
  heroSideTop: HeroSlideItem;
  heroSideBottom: HeroSlideItem;
  storeVideos: StoreVideoItem[];
  trustSection: TrustSectionConfig;
  campaignBento: CampaignBentoConfig;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsConfig = {
  siteName: "BD Shop",
  tagline: "Quality products delivered across Bangladesh",
  supportEmail: "support@ecom.local",
  supportPhone: "01700000000",
  whatsappNumber: "8801700000000",
  storeAddress: "Dhaka, Bangladesh",
  currency: "BDT",
  timezone: "Asia/Dhaka",
  announcementBar: "",
  maintenanceMode: false,
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#4F46E5",
  metaTitle: "BD Shop — Online Store",
  metaDescription: "Shop online with fast delivery across Bangladesh.",
  ogImage: "",
  robotsIndex: true,
  metaPixelId: "",
  metaCapiEnabled: false,
  metaCapiAccessToken: "",
  metaCapiTestEventCode: "",
  ga4MeasurementId: "",
  ga4ApiSecret: "",
  gtmContainerId: "",
  tiktokPixelId: "",
  tiktokAccessToken: "",
  guestCheckoutEnabled: true,
  requirePhoneOtp: false,
  autoConfirmOrders: false,
  orderPrefix: "ORD",
  minOrderAmount: 0,
  maxCodAmount: 50000,
  taxRatePct: 0,
  shippingMode: "simple",
  insideDhakaFee: 60,
  outsideDhakaFee: 120,
  defaultCountry: "Bangladesh",
  shippingCountries: Array.from(
    new Set(DEFAULT_SHIPPING_LOCATIONS.map((l) => l.country)),
  ),
  shippingStates: Array.from(
    new Map(
      DEFAULT_SHIPPING_LOCATIONS.map((l) => [
        `${l.country}::${l.state}`,
        { id: `st-${l.country}-${l.state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), country: l.country, state: l.state },
      ]),
    ).values(),
  ),
  shippingLocations: DEFAULT_SHIPPING_LOCATIONS,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpFrom: "no-reply@ecom.local",
  smsProvider: "sslwireless",
  smsSenderId: "BDSHOP",
  fraudAutoHoldScore: 70,
  heroSlides: [
    {
      id: "slide-1",
      img: "/banners/organic-food-1.jpg",
      alt: "অর্গানিক ফুড ও প্রাকৃতিক পুষ্টিকর পণ্য",
      link: "/products",
    },
    {
      id: "slide-2",
      img: "/banners/honey-combo.jpg",
      alt: "খাঁটি মধু ও প্রাকৃতিক কম্বো কালেকশন",
      link: "/products",
    },
    {
      id: "slide-3",
      img: "/banners/honey-nuts-banner.jpg",
      alt: "প্রিমিয়াম হানি নাটস ও ড্রাই ফ্রুটস",
      link: "/products",
    },
  ],
  heroSideTop: {
    id: "side-top",
    img: "/banners/chia-banner.jpg",
    alt: "অর্গানিক চিয়া সিড ও সুপারফুড",
    link: "/products",
  },
  heroSideBottom: {
    id: "side-bottom",
    img: "/banners/neem-oil-banner.jpg",
    alt: "খাঁটি প্রাকৃতিক তেল ও ভেষজ পণ্য",
    link: "/products",
  },
  storeVideos: [
    {
      id: "vid-1",
      title: "খাঁটি মধু সংগ্রহের বাস্তব দৃশ্য | ১০০% প্রাকৃতিক চাকের মধু",
      category: "মধু সংগ্রহ",
      date: "১০ নভেম্বর ২০২৬",
      duration: "০৩:৪৫",
      thumbnail: "/videos/video-1.jpg",
      youtubeId: "6P5pSpUps6A",
    },
    {
      id: "vid-2",
      title: "কাঠের ঘানিতে খাঁটি সরিষার তেল ভাঙানোর প্রক্রিয়া",
      category: "তেল ও ঘি",
      date: "০৮ নভেম্বর ২০২৬",
      duration: "০৫:২০",
      thumbnail: "/videos/video-2.jpg",
      youtubeId: "6P5pSpUps6A",
    },
    {
      id: "vid-3",
      title: "খাঁটি গরুর দুধের মাখন থেকে দানাদার গাওয়া ঘি তৈরি",
      category: "তেল ও ঘি",
      date: "০৫ নভেম্বর ২০২৬",
      duration: "০৪:১৫",
      thumbnail: "/videos/video-3.jpg",
      youtubeId: "6P5pSpUps6A",
    },
    {
      id: "vid-4",
      title: "প্রিমিয়াম হানি নাটস ও ড্রাই ফ্রুটস সিলেকশন গাইড",
      category: "বাদাম ও বীজ",
      date: "০২ নভেম্বর ২০২৬",
      duration: "০৬:১০",
      thumbnail: "/videos/video-4.jpg",
      youtubeId: "6P5pSpUps6A",
    },
  ],
  trustSection: {
    badge: "অর্গানিক • শতভাগ খাঁটি • স্বাস্থ্যকর",
    title: "বিশুদ্ধতার বিশ্বস্ত প্রতীক, সেরা মানে সেরা পছন্দ",
    subtitle:
      "আমরা আপনার ও আপনার পরিবারের জন্য নিয়ে আসি শতভাগ কেমিক্যালমুক্ত ও স্বাস্থ্যসম্মত অর্গানিক খাদ্যপণ্য। প্রতিটি পণ্য বিশুদ্ধতা ও শ্রেষ্ঠত্বের নিশ্চয়তা বহন করে।",
    image: "/trust-showcase.jpg",
    leftFeatures: [
      {
        title: "১০০% খাঁটি ও প্রাকৃতিক মধু",
        desc: "ল্যাব টেস্টেড খাঁটি অর্গানিক মধু, যার রয়েছে বিশুদ্ধ স্বাদ ও পুষ্টির পূর্ণ নিশ্চয়তা।",
      },
      {
        title: "বিশুদ্ধ, স্বাস্থ্যকর ও নিরাপদ খাদ্য",
        desc: "আমাদের প্রতিটি খাদ্যপণ্য ভেজালমুক্ত, নিরাপদ ও স্বাস্থ্যসম্মত পরিবেশে প্যাকেটজাত করা হয়।",
      },
      {
        title: "ন্যায্যমূল্যে প্রিমিয়াম কোয়ালিটি",
        desc: "সেরা মানের খাঁটি পণ্য পৌঁছে দিই সবার সাধ্যের মধ্যে, যাতে পরিবারের সুস্থতা নিশ্চিত হয়।",
      },
    ],
    rightFeatures: [
      {
        title: "বিশ্বস্ত তাজা ও ফ্রেশ নিশ্চয়তা",
        desc: "সরাসরি নিজস্ব সোর্সিং থেকে হাইজিনিক প্যাকেজিং পর্যন্ত প্রতিটি ধাপে ফ্রেশনেস বজায় রাখা হয়।",
      },
      {
        title: "২৪/৭ নির্ভরযোগ্য কাস্টমার সাপোর্ট",
        desc: "যেকোনো জিজ্ঞাসা, পরামর্শ কিংবা প্রোডাক্ট সহায়তায় আমাদের সাপোর্ট টিম সবসময় আপনার পাশে।",
      },
      {
        title: "আস্থা ও সততায় প্রতিষ্ঠিত ব্র্যান্ড",
        desc: "সচেতন পরিবারের প্রথম পছন্দ, কারণ আমরা সততা, বিশুদ্ধতা ও সুস্থতাকে সর্বোচ্চ মূল্যায়ন করি।",
      },
    ],
  },
  campaignBento: {
    mainImg: "/banners/behance-header-wide.jpg",
    mainBadge: "১০০% ন্যাচারাল",
    mainTitle: "খাঁটি ও পুষ্টিকর খাদ্যপণ্যের সমাহার",
    mainSubtitle: "প্রকৃতির শ্রেষ্ঠ উপহার সরাসরি আপনার ঘরে",
    mainLink: "/products",
    leftImg: "/banners/behance-grid-3.jpg",
    leftLink: "/products",
    rightImg: "/banners/behance-grid-5.jpg",
    rightLink: "/products",
    deliveryImg: "/banners/steadfast-delivery.jpg",
    deliveryTitle: "দেশজুড়ে দ্রুততম হোম ডেলিভারি",
    deliverySubtitle: "ক্যাশ অন ডেলিভারি ও দ্রুত এক্সপ্রেস ডেলিভারি",
  },
};

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettingsConfig> => {
    const db = getDb();
    const rows = await db.select().from(siteSettings);
    const merged: Record<string, unknown> = { ...DEFAULT_SITE_SETTINGS };
    for (const row of rows) {
      if (row.key in merged) {
        merged[row.key] = row.value;
      }
    }
    return merged as unknown as SiteSettingsConfig;
  },
  ["site-settings"],
  { revalidate: 60, tags: ["settings"] },
);
