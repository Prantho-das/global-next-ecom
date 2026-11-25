"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { openCartDrawer } from "@/components/store/cart-events";
import {
  Heart,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "@/components/store/icons";

export interface StoreHeaderCategory {
  id: string;
  name: string;
  slug: string;
}

export interface StoreHeaderProps {
  siteName?: string;
  tagline?: string;
  supportPhone?: string;
  logoUrl?: string;
  announcement?: string;
  cartCount: number;
  categories: readonly StoreHeaderCategory[];
}

export function StoreHeader({
  siteName = "BD Shop",
  tagline = "Quality products delivered across Bangladesh",
  supportPhone = "01700000000",
  logoUrl = "",
  announcement,
  cartCount,
  categories,
}: StoreHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const resolvedLogo = logoUrl.trim() !== "" ? logoUrl : "/logo.png";

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query !== "") {
      router.push(`/products?q=${encodeURIComponent(query)}`);
      setMobileSearchOpen(false);
    }
  }

  return (
    <>
      <aside className="bg-[#F8DE9E] text-[#0F2920] py-1.5 px-3 sm:px-4 lg:px-6 text-xs font-medium border-b border-[#E8B65D]/40 z-40 relative w-full">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5F9118] animate-pulse" />
            <span className="truncate">
              {announcement ||
                "সারাদেশে ক্যাশ অন ডেলিভারি | ১০০% প্রাকৃতিক খাঁটি খাদ্য গ্যারান্টি"}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold shrink-0">
            <Link
              href="/track"
              className="hover:text-[#5F9118] flex items-center gap-1 transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-[#5F9118]" />
              <span>অর্ডার ট্র্যাক</span>
            </Link>
            <span>•</span>
            <Link
              href="/products"
              className="hover:text-[#5F9118] flex items-center gap-1 transition-colors"
            >
              <span>সকল পণ্য</span>
            </Link>
            <span>•</span>
            <span>হটলাইন: {supportPhone}</span>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-100 w-full">
        <div className="w-full px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("toggle-mobile-sidebar", {
                      detail: { open: true },
                    }),
                  );
                }
              }}
              className="xl:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              aria-label="ক্যাটাগরি মেনু"
            >
              <Menu className="w-5 h-5 text-[#5F9118]" />
            </button>

            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
              <Image
                src={resolvedLogo}
                alt={siteName}
                width={40}
                height={40}
                className="h-9 sm:h-10 w-auto object-contain group-hover:scale-105 transition-transform"
                priority
              />
              <div>
                <span className="block text-lg sm:text-xl font-black tracking-tight text-[#0F2920] group-hover:text-[#5F9118] transition-colors leading-none font-serif">
                  {siteName}
                </span>
                <span className="block text-[9px] sm:text-[10px] font-semibold text-[#637381] tracking-wider uppercase mt-0.5 line-clamp-1 max-w-[160px] sm:max-w-none">
                  {tagline}
                </span>
              </div>
            </Link>
          </div>

          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl mx-4"
          >
            <div className="relative w-full">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খাঁটি মধু, সরিষার তেল, ঘি, বাদাম খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-[#0F2920] placeholder-slate-400 focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all bg-slate-50/50"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </form>

          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
              aria-label="সার্চ অপশন"
            >
              <Search className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <a
              href={`tel:${supportPhone}`}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2920] border border-slate-200 hover:border-[#5F9118] px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#5F9118]" />
              অর্ডার সহায়তা
            </a>

            <Link
              href="/track"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 hover:border-[#5F9118] text-slate-700 hover:text-[#5F9118] hover:bg-slate-50 transition-colors"
              title="অর্ডার ট্র্যাক করুন"
            >
              <Truck className="w-4.5 h-4.5" />
            </Link>

            <Link
              href="/products"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 hover:border-[#5F9118] text-slate-700 hover:text-[#5F9118] hover:bg-slate-50 transition-colors"
              title="সকল পণ্যসমূহ"
            >
              <Heart className="w-4.5 h-4.5" />
            </Link>

            <button
              type="button"
              onClick={openCartDrawer}
              className="relative inline-flex items-center justify-center gap-2 bg-[#5F9118] hover:bg-[#487D12] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-xs transition-all active:scale-95"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>ব্যাগ</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E8B65D] text-[#0F2920] text-xs font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="md:hidden px-3 pb-3 pt-1 border-t border-slate-100 bg-white">
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-[#0F2920] placeholder-slate-400 focus:outline-none focus:border-[#5F9118]"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </form>
          </div>
        )}

        <nav className="hidden md:block bg-slate-50/80 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-xs font-bold text-slate-700">
            <Link
              href="/products"
              className="px-3 py-1.5 rounded-md hover:bg-white hover:text-[#5F9118] transition-colors shrink-0 flex items-center gap-1 text-[#5F9118]"
            >
              সকল পণ্য
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="px-3 py-1.5 rounded-md hover:bg-white hover:text-[#5F9118] transition-colors shrink-0"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-5 flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Image
                  src={resolvedLogo}
                  alt={siteName}
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
                <span className="font-bold text-[#0F2920]">মেনু</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-bold text-sm text-[#5F9118] bg-slate-50"
              >
                সকল পণ্যসমূহ
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg font-medium text-sm text-slate-700 hover:bg-slate-50"
                >
                  {cat.name}
                </Link>
              ))}
              <div className="border-t border-slate-100 pt-3 mt-3 space-y-1">
                <Link
                  href="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 font-medium"
                >
                  <Truck className="w-4 h-4 text-[#5F9118]" />
                  <span>অর্ডার ট্র্যাক</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
