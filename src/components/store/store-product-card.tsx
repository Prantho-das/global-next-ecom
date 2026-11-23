"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { openCartDrawer } from "@/components/store/cart-events";
import { ShoppingCart } from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import { addToCartAction } from "@/modules/sales/actions";

export interface StoreProductCardData {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  basePrice: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  defaultVariantId?: string | null;
  badge?: string | null;
}

export function StoreProductCard({ product }: { product: StoreProductCardData }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const displayPrice = product.salePrice ?? product.basePrice;
  const hasDiscount =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice < product.basePrice;

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.defaultVariantId) {
      router.push(`/products/${product.slug}`);
      return;
    }
    setAdding(true);
    const res = await addToCartAction({
      variantId: product.defaultVariantId,
      qty: 1,
    });
    setAdding(false);
    if (res.ok) {
      openCartDrawer();
      router.refresh();
    } else {
      router.push(`/products/${product.slug}`);
    }
  }

  return (
    <div className="group bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between font-sans">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative bg-slate-50 rounded-lg h-44 sm:h-48 flex items-center justify-center overflow-hidden mb-3">
          <span className="absolute top-2.5 left-2.5 bg-[#5F9118] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 shadow-xs">
            {product.badge || (hasDiscount ? "স্পেশাল ছাড়" : "১০০% খাঁটি")}
          </span>
          <Image
            src={product.imageUrl || "/banners/organic-food-1.jpg"}
            alt={product.name}
            width={240}
            height={240}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="flex items-center gap-1 text-[#E8B65D] text-xs mb-1">
          <span>★★★★★</span>
          <span className="text-[#637381] text-[11px] ml-1">(৫.০)</span>
        </div>

        <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#0F2920] group-hover:text-[#5F9118] transition-colors leading-snug line-clamp-1">
          {product.name}
        </h3>
        <p className="text-[11px] text-[#637381] mt-0.5 line-clamp-1">
          {product.brandName || "BASA World"}
        </p>
      </Link>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-baseline justify-between mb-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base md:text-lg font-black text-[#5F9118]">
              {formatBdt(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">
                {formatBdt(product.basePrice)}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-[#5F9118] bg-[#5F9118]/10 px-2 py-0.5 rounded">
            ইন স্টক
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={adding}
          className="w-full bg-[#5F9118] hover:bg-[#487D12] active:scale-[0.99] text-white text-xs sm:text-sm font-bold py-2 sm:py-2.5 px-3 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{adding ? "যোগ হচ্ছে..." : "ব্যাগে যোগ করুন"}</span>
        </button>
      </div>
    </div>
  );
}
