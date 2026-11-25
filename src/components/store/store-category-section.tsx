"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { ChevronLeft, ChevronRight } from "@/components/store/icons";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

export function StoreCategorySection({
  categories,
}: {
  categories: readonly CategoryItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) return null;

  const displayList = categories.map((c) => ({
    id: c.slug,
    name: c.name,
    img: c.imageUrl ?? "/banners/organic-food-1.jpg",
  }));

  function scroll(direction: "left" | "right") {
    if (containerRef.current) {
      const offset = direction === "left" ? -280 : 280;
      containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }

  return (
    <section
      aria-label="Shop By Category"
      className="w-full my-6 font-sans overflow-hidden"
    >
      <div className="flex items-center justify-between pb-2.5 sm:pb-3 mb-4 sm:mb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
              ক্যাটাগরি অনুযায়ী কেনাকাটা করুন
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            আপনার পছন্দের প্রাকৃতিক অর্গানিক খাদ্যপণ্য বেছে নিন
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:border-[#5F9118] text-slate-600 hover:text-[#5F9118] flex items-center justify-center transition-all shadow-xs active:scale-95"
            aria-label="পূর্ববর্তী ক্যাটাগরি"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:border-[#5F9118] text-slate-600 hover:text-[#5F9118] flex items-center justify-center transition-all shadow-xs active:scale-95"
            aria-label="পরবর্তী ক্যাটাগরি"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-none scroll-smooth"
      >
        {displayList.map((cat, idx) => (
          <Link
            key={cat.id || idx}
            href={`/products?category=${encodeURIComponent(cat.id)}`}
            className="group flex flex-col items-center text-center select-none transition-transform duration-300 hover:-translate-y-2 py-2 px-1 w-32 sm:w-36 md:w-40 shrink-0"
          >
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center mb-3">
              <div className="absolute bottom-1 w-20 sm:w-24 h-2.5 bg-black/15 rounded-full blur-[4px]" />
              <Image
                src={cat.img}
                alt={cat.name}
                width={140}
                height={140}
                className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-300"
              />
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#5F9118] transition-colors leading-tight line-clamp-1">
              {cat.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
