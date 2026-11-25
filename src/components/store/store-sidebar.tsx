"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Coffee,
  Droplets,
  Flame,
  Gift,
  Layers,
  Leaf,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  Truck,
} from "@/components/store/icons";

export interface SidebarCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subcategories?: Array<{ label: string; slug: string }>;
}

export interface StoreSidebarProps {
  categories: readonly SidebarCategoryItem[];
  totalProductCount: number;
  supportPhone: string;
}

function getCategoryIcon(slug: string) {
  switch (slug) {
    case "honey":
      return Droplets;
    case "oil":
      return Flame;
    case "nuts":
      return Leaf;
    case "special":
      return Sparkles;
    case "dates":
      return Package;
    case "spices":
      return Flame;
    case "tea":
      return Coffee;
    case "combo":
      return Gift;
    default:
      return Layers;
  }
}

export function StoreSidebar({
  categories,
  totalProductCount,
  supportPhone,
}: StoreSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleToggle(e: Event) {
      const custom = e as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === "boolean") {
        setMobileOpen(custom.detail.open);
      } else {
        setMobileOpen((prev) => !prev);
      }
    }
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () =>
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

  function toggleAccordion(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpenAccordions((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity xl:hidden"
        />
      )}

      {/* Desktop Sticky Left Sidebar (Exact Basa UI w-64 Sidebar) */}
      <aside className="hidden xl:flex shrink-0 w-64 bg-white border-r border-slate-200 overflow-hidden flex-col justify-between sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] z-20 font-sans shadow-xs">
        <div className="w-64 flex flex-col flex-1 min-h-0 bg-white">
          <div className="p-3 border-b border-slate-100 bg-[#EBF7EF]/50">
            <span className="text-[11px] font-black text-[#5F9118] uppercase tracking-wider block">
              ক্যাটাগরি ব্রাউজ করুন
            </span>
          </div>

          <ul className="text-sm font-semibold text-slate-700 divide-y divide-slate-100 flex-1 overflow-y-auto pb-4 scrollbar-thin">
            <li>
              <Link
                href="/products"
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  pathname === "/products"
                    ? "bg-[#EBF7EF] text-[#5F9118] font-bold"
                    : "hover:bg-[#EBF7EF]/50 hover:text-[#5F9118] text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Layers className="w-4.5 h-4.5 text-[#5F9118] shrink-0" />
                  <span className="truncate text-sm font-bold">
                    সকল পণ্যসমূহ (All)
                  </span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {totalProductCount}
                </span>
              </Link>
            </li>

            {categories.map((category) => {
              const isOpen = openAccordions[category.slug] ?? false;
              const Icon = getCategoryIcon(category.slug);
              const hasSubs =
                category.subcategories !== undefined &&
                category.subcategories.length > 0;

              return (
                <li key={category.id} className="flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#EBF7EF]/50 transition-colors group select-none">
                    <Link
                      href={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="flex items-center gap-2.5 truncate flex-1 min-w-0"
                    >
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#5F9118] transition-colors shrink-0" />
                      <span className="truncate text-xs font-bold text-slate-700 group-hover:text-[#5F9118]">
                        {category.name}
                      </span>
                    </Link>

                    {hasSubs && (
                      <button
                        type="button"
                        onClick={(e) => toggleAccordion(category.slug, e)}
                        className="p-1 hover:bg-black/5 rounded text-slate-400 hover:text-[#5F9118] transition-colors shrink-0 ml-1"
                        aria-label="সাবক্যাটাগরি খুলুন"
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isOpen ? "rotate-90 text-[#5F9118]" : "text-slate-400"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {isOpen && hasSubs && (
                    <div className="bg-slate-50/80 border-t border-slate-100 py-1.5 px-3 space-y-0.5">
                      {category.subcategories?.map((sub, idx) => (
                        <Link
                          key={idx}
                          href={`/products?category=${encodeURIComponent(sub.slug)}`}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-md text-xs font-medium text-slate-600 hover:text-[#5F9118] hover:bg-white transition-colors"
                        >
                          <span className="truncate">• {sub.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs space-y-1.5">
            <Link
              href="/track"
              className="flex items-center gap-2 text-slate-700 hover:text-[#5F9118] font-bold py-1"
            >
              <Truck className="w-4 h-4 text-[#5F9118]" />
              <span>লাইভ অর্ডার ট্র্যাকিং</span>
            </Link>
            <div className="flex items-center gap-2 text-slate-500 py-0.5">
              <Phone className="w-3.5 h-3.5 text-[#5F9118]" />
              <span>হটলাইন: {supportPhone}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Off-Canvas Drawer (Exact Basa UI Mobile Drawer) */}
      <div
        className={`fixed inset-0 z-50 xl:hidden transition-all duration-300 ease-in-out ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`fixed inset-y-0 left-0 w-72 sm:w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between z-50 transform transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#5F9118] text-white shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-white" />
              <span className="font-bold text-sm tracking-wide">
                সকল ক্যাটাগরি মেনু
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1 hover:bg-black/15 rounded-lg active:scale-95 transition-all text-white"
              aria-label="বন্ধ করুন"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
          </div>

          <div className="p-2 flex-1 overflow-y-auto space-y-1">
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-between border-b border-slate-100"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#5F9118]" />
                <span>সকল পণ্যসমূহ</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 block">
                পণ্যের ক্যাটাগরি
              </span>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span>{category.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 block">
                বিশেষ সেবা ও লিংক
              </span>
              <Link
                href="/track"
                onClick={() => setMobileOpen(false)}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>অর্ডার ট্র্যাকিং</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
