"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { openCartDrawer } from "@/components/store/cart-events";
import {
  Heart,
  Home,
  Search,
  ShoppingBag,
  Truck,
} from "@/components/store/icons";

export interface MobileBottomNavProps {
  cartCount: number;
}

export function MobileBottomNav({ cartCount }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isProducts = pathname.startsWith("/products");
  const isTrack = pathname.startsWith("/track");

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none md:hidden">
      <nav
        aria-label="Mobile Navigation"
        className="pointer-events-auto relative flex items-center justify-between w-full max-w-[360px] bg-[#1e2420]/95 backdrop-blur-md text-slate-300 rounded-[28px] px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-white/10"
      >
        <Link
          href="/products"
          aria-label="অনুসন্ধান"
          className="flex items-center justify-center w-11 h-11 text-slate-300 hover:text-[#5F9118] active:scale-90 transition-transform"
          title="সার্চ ও পণ্য"
        >
          <Search className="w-5 h-5" />
        </Link>

        <Link
          href="/products"
          aria-label="সকল পণ্য"
          className={`relative flex items-center justify-center w-11 h-11 active:scale-90 transition-transform ${
            isProducts ? "text-[#5F9118]" : "text-slate-300 hover:text-white"
          }`}
        >
          <Heart className="w-5 h-5" />
        </Link>

        <div className="relative -mt-6">
          <Link
            href="/"
            aria-label="হোম"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#5F9118] hover:bg-[#487D12] text-white shadow-[0_6px_20px_rgba(95,145,24,0.45)] border-4 border-[#1e2420] active:scale-95 transition-all"
          >
            <Home className="w-6 h-6" />
          </Link>
        </div>

        <button
          type="button"
          onClick={openCartDrawer}
          aria-label="শপিং ব্যাগ"
          className="relative flex items-center justify-center w-11 h-11 text-slate-300 hover:text-white active:scale-90 transition-transform"
        >
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-[#E8B65D] text-[#0F2920] text-[10px] font-black flex items-center justify-center border border-[#1e2420]">
              {cartCount}
            </span>
          )}
        </button>

        <Link
          href="/track"
          aria-label="অর্ডার ট্র্যাক"
          className={`flex items-center justify-center w-11 h-11 active:scale-90 transition-transform ${
            isTrack ? "text-[#5F9118]" : "text-slate-300 hover:text-white"
          }`}
        >
          <Truck className="w-5 h-5" />
        </Link>
      </nav>
    </div>
  );
}
