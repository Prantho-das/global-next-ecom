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
