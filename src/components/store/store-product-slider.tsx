"use client";

import Link from "next/link";
import { useRef } from "react";

import { ArrowRight, ChevronLeft, ChevronRight } from "@/components/store/icons";
import {
  StoreProductCard,
  type StoreProductCardData,
} from "@/components/store/store-product-card";

export interface StoreProductSliderProps {
  title: string;
  subtitle?: string;
  products: readonly StoreProductCardData[];
  viewAllHref?: string;
}

export function StoreProductSlider({
  title,
  subtitle,
  products,
  viewAllHref = "/products",
}: StoreProductSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  function scroll(direction: "left" | "right") {
    if (containerRef.current) {
      const offset = direction === "left" ? -300 : 300;
      containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }

  return (
    <section aria-label={title} className="w-full my-6 font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#5F9118] hover:bg-[#487D12] px-3 py-1.5 rounded-full shadow-xs transition-colors shrink-0"
          >
            <span>সবগুলো</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="পূর্ববর্তী"
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:border-[#5F9118] text-slate-600 hover:text-[#5F9118] flex items-center justify-center transition-all shadow-xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="পরবর্তী"
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:border-[#5F9118] text-slate-600 hover:text-[#5F9118] flex items-center justify-center transition-all shadow-xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
      >
        {products.map((prod) => (
          <div
            key={prod.id}
            className="w-[180px] sm:w-[220px] md:w-[240px] shrink-0"
          >
            <StoreProductCard product={prod} />
          </div>
        ))}
      </div>
    </section>
  );
}
