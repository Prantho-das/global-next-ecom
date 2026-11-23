"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { openCartDrawer } from "@/components/store/cart-events";
import { Flame, Gift, ShoppingCart } from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import { addToCartAction } from "@/modules/sales/actions";

export interface TopSellingItem {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  save?: number | null;
  unit: string;
  isBestSelling?: boolean;
  isFreeGift?: boolean;
  badge?: string;
  img: string;
  defaultVariantId?: string | null;
}

const TOP_SELLING_DEFAULTS: TopSellingItem[] = [
  {
    id: "top-1",
    name: "গাওয়া ঘি ১ কেজি",
    subtitle: "১০০% খাঁটি ও দানাদার গাওয়া ঘি",
    slug: "ghee-1kg",
    price: 189000,
    originalPrice: 199000,
    save: 10000,
    unit: "১ কেজি",
    isBestSelling: true,
    badge: "সেরা বিক্রয়",
    img: "https://cdn.falaqfood.com/uploads/media/2026/09/01a0f1c3-0b24-71db-96ad-e1ddaf47d0c4.webp",
  },
  {
    id: "top-2",
    name: "কালোজিরা মধু ১ কেজি",
    subtitle: "কালোজিরা ফুলের প্রাকৃতিক চাকের মধু",
    slug: "black-honey-1kg",
    price: 160000,
    originalPrice: null,
    save: null,
    unit: "১ কেজি",
    isFreeGift: true,
    badge: "ফ্রি উপহার",
    img: "https://cdn.falaqfood.com/uploads/media/2026/09/01a0f207-2dfe-7770-8dd7-8a2adaa31b48.webp",
  },
  {
    id: "top-3",
    name: "সুন্দরবনের প্রাকৃতিক মধু ১ কেজি",
    subtitle: "সুন্দরবনের প্রাকৃতিক চাক থেকে সংগৃহীত",
    slug: "sundarban-honey-1kg",
    price: 230000,
    originalPrice: 250000,
    save: 20000,
    unit: "১ কেজি",
    isBestSelling: false,
    badge: "স্পেশাল ছাড়",
    img: "https://cdn.falaqfood.com/uploads/media/2026/09/01a0ec6f-bcb4-7172-a7c0-e8a41d1eaa4c.webp",
  },
  {
    id: "top-4",
    name: "দেশি সরিষার তেল ৫ লিটার",
    subtitle: "কাঠের ঘানিতে ভাঙা খাঁটি সরিষার তেল",
    slug: "mustard-oil-5l",
    price: 170000,
    originalPrice: 180000,
    save: 10000,
    unit: "৫ লিটার",
    isBestSelling: true,
    badge: "সেরা বিক্রয়",
    img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a1717a-7b79-7806-8524-cd419b7fef80.webp",
  },
  {
    id: "top-5",
    name: "প্রিমিয়াম হানি নাটস ৫০০ গ্রাম",
    subtitle: "৮+ প্রকার ড্রাই ফ্রুটস ও খাঁটি মধু",
    slug: "honey-nuts-500g",
    price: 75000,
    originalPrice: 85000,
    save: 10000,
    unit: "৫০০ গ্রাম",
    isBestSelling: true,
    badge: "বেস্ট সেলার",
    img: "https://cdn.falaqfood.com/uploads/media/2026/09/01a0ec79-c3da-7dc9-bf55-9a364479cbe5.webp",
  },
  {
    id: "top-6",
    name: "রোস্টেড প্রিমিয়াম কাজুবাদাম",
    subtitle: "মুচমুচে ফ্রেশ ও পুষ্টিকর রোস্টেড নাট",
    slug: "roasted-cashew-500g",
    price: 82000,
    originalPrice: 90000,
    save: 8000,
    unit: "৫০০ গ্রাম",
    isBestSelling: false,
    badge: "রোস্টেড",
    img: "https://cdn.falaqfood.com/uploads/media/2026/09/01a0ed2c-9168-7fab-ba3c-1d2d1eec42a6.webp",
  },
];

export function StoreTopSelling() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd(item: TopSellingItem) {
    if (item.defaultVariantId) {
      setBusyId(item.id);
      const res = await addToCartAction({
        variantId: item.defaultVariantId,
        qty: 1,
      });
      setBusyId(null);
      if (res.ok) {
        openCartDrawer();
        router.refresh();
        return;
      }
    }
    router.push(`/products/${item.slug}`);
  }

  return (
    <section aria-labelledby="top-selling-heading" className="w-full my-6 font-sans">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
          <span className="text-xs font-bold text-[#5F9118] tracking-widest uppercase">
            জনপ্রিয় কালেকশন
          </span>
        </div>
        <h2
          id="top-selling-heading"
          className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight"
        >
          জনপ্রিয় শীর্ষ বিক্রিত পণ্য
        </h2>
        <div className="w-16 h-1 bg-[#5F9118] mx-auto mt-2 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
        {TOP_SELLING_DEFAULTS.map((item) => (
          <article
            key={item.id}
            className="relative bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-[#5F9118]/40 transition-all duration-200 flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4 group"
          >
            {item.isBestSelling && (
              <span className="absolute top-2 right-2 bg-[#FF3B30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
                <Flame className="w-3 h-3 fill-white" />
                <span>{item.badge}</span>
              </span>
            )}

            <Link
              href={`/products/${item.slug}`}
              className="relative w-full aspect-square sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 bg-slate-50 rounded-xl p-2 flex items-center justify-center overflow-hidden border border-slate-100"
            >
              <Image
                src={item.img}
                alt={item.name}
                width={130}
                height={130}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />

              {item.isFreeGift && (
                <div className="absolute bottom-1.5 right-1.5 bg-[#FF3B30] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  ফ্রি উপহার
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0 w-full flex flex-col justify-between py-0.5">
              <Link href={`/products/${item.slug}`}>
                <h3
                  className="text-xs sm:text-sm md:text-base font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-[#5F9118] transition-colors"
                  title={item.name}
                >
                  {item.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {item.subtitle}
                </p>

                <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                  <span className="text-sm sm:text-base md:text-lg font-black text-[#5F9118]">
                    {formatBdt(item.price)}
                  </span>
                  {item.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatBdt(item.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-1 h-5 flex items-center">
                  {item.save ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-[#5F9118] bg-[#EBF7EF] px-2 py-0.5 rounded-full">
                      সাশ্রয় {formatBdt(item.save)}
                    </span>
                  ) : item.isFreeGift ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#5F9118] bg-[#EBF7EF] px-2 py-0.5 rounded-full">
                      <Gift className="w-3 h-3" />
                      <span>ফ্রি উপহার</span>
                    </span>
                  ) : null}
                </div>
              </Link>

              <div className="mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleAdd(item)}
                  disabled={busyId === item.id}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#5F9118] hover:bg-[#487D12] active:bg-[#31620D] text-white rounded-xl py-2 px-3 text-xs font-bold shadow-xs transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="truncate">
                    {busyId === item.id ? "যোগ হচ্ছে..." : "ব্যাগে যোগ করুন"}
                  </span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
