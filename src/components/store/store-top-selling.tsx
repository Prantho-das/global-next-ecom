"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { openCartDrawer } from "@/components/store/cart-events";
import { Flame, ShoppingCart } from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import { addToCartAction } from "@/modules/sales/actions";

export interface TopSellingItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  brandName: string | null;
  imageUrl: string | null;
  defaultVariantId: string | null;
  soldQty: number;
}

export function StoreTopSelling({
  products,
}: {
  products: readonly TopSellingItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (products.length === 0) return null;

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
        {products.map((item) => {
          const effectivePrice = item.salePrice ?? item.basePrice;
          const originalPrice =
            item.compareAtPrice && item.compareAtPrice > effectivePrice
              ? item.compareAtPrice
              : item.salePrice && item.basePrice > item.salePrice
                ? item.basePrice
                : null;
          const save = originalPrice ? originalPrice - effectivePrice : null;

          return (
            <article
              key={item.id}
              className="relative bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-[#5F9118]/40 transition-all duration-200 flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4 group"
            >
              {item.soldQty > 0 && (
                <span className="absolute top-2 right-2 bg-[#FF3B30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>সেরা বিক্রয়</span>
                </span>
              )}

              <Link
                href={`/products/${item.slug}`}
                className="relative w-full aspect-square sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 bg-slate-50 rounded-xl p-2 flex items-center justify-center overflow-hidden border border-slate-100"
              >
                <Image
                  src={item.imageUrl ?? "/banners/organic-food-1.jpg"}
                  alt={item.name}
                  width={130}
                  height={130}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </Link>

              <div className="flex-1 min-w-0 w-full flex flex-col justify-between py-0.5">
                <Link href={`/products/${item.slug}`}>
                  <h3
                    className="text-xs sm:text-sm md:text-base font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-[#5F9118] transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  {item.brandName && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.brandName}
                    </p>
                  )}

                  <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                    <span className="text-sm sm:text-base md:text-lg font-black text-[#5F9118]">
                      {formatBdt(effectivePrice)}
                    </span>
                    {originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatBdt(originalPrice)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 h-5 flex items-center">
                    {save ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-[#5F9118] bg-[#EBF7EF] px-2 py-0.5 rounded-full">
                        সাশ্রয় {formatBdt(save)}
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
          );
        })}
      </div>
    </section>
  );
}
