"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/sales/actions";
import type { CartViewItem } from "@/modules/sales/queries";

export interface CartDrawerProps {
  items: readonly CartViewItem[];
  subtotal: number;
}

export function CartDrawer({ items, subtotal }: CartDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    function handleToggle(e: Event) {
      const custom = e as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === "boolean") {
        setOpen(custom.detail.open);
      } else {
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("toggle-store-cart", handleToggle);
    return () => window.removeEventListener("toggle-store-cart", handleToggle);
  }, []);

  async function changeQty(variantId: string, qty: number) {
    if (qty < 1) {
      await removeItem(variantId);
      return;
    }
    setBusyId(variantId);
    await updateCartItemAction({ variantId, qty });
    setBusyId(null);
    router.refresh();
  }

  async function removeItem(variantId: string) {
    setBusyId(variantId);
    await removeCartItemAction({ variantId });
    setBusyId(null);
    router.refresh();
  }

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const freeShippingThreshold = 200000; // 2000 BDT in poisha
  const diffToFree = freeShippingThreshold - subtotal;

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="শপিং ব্যাগ"
        className={`fixed inset-y-0 right-0 h-full w-full max-w-[420px] bg-white z-50 shadow-2xl transform ${
          open ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out flex flex-col font-sans`}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5F9118]/10 text-[#5F9118] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              আপনার শপিং ব্যাগ
            </h3>
            <span className="text-xs bg-[#5F9118] text-white px-2 py-0.5 rounded-full font-bold">
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="bg-[#EBF7EF] px-5 py-2.5 border-b border-[#5F9118]/20 shrink-0">
            {diffToFree > 0 ? (
              <p className="text-xs text-[#0F3F0D] font-medium">
                আর মাত্র{" "}
                <span className="font-bold text-[#5F9118]">
                  {formatBdt(diffToFree)}
                </span>{" "}
                টাকার পণ্য কিনলে ফ্রি ডেলিভারি!
              </p>
            ) : (
              <p className="text-xs text-[#5F9118] font-bold">
                অভিনন্দন! আপনি ফ্রি ডেলিভারি সুবিধা পাচ্ছেন 🎉
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 space-y-3">
              <div className="w-20 h-20 bg-[#F4FAF6] rounded-2xl flex items-center justify-center border border-[#5F9118]/20">
                <ShoppingBag className="w-10 h-10 text-[#5F9118]/70" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-base text-slate-800">
                  আপনার ব্যাগ এখনও খালি
                </p>
                <p className="text-xs text-slate-500 max-w-[220px]">
                  পছন্দের স্বাস্থ্যকর ও অর্গানিক পণ্য ব্যাগে যোগ করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/products");
                }}
                className="mt-2 inline-flex items-center gap-2 bg-[#5F9118] hover:bg-[#487D12] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <span>পণ্য ব্রাউজ করুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-all"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-50 p-1 shrink-0 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/banners/organic-food-1.jpg"
                    alt={item.productName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productSlug}`}
                    onClick={() => setOpen(false)}
                    className="font-bold text-xs sm:text-sm text-slate-800 truncate block hover:text-[#5F9118]"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.sku} • {formatBdt(item.unitPrice)}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-[#0F3F0D] mt-1">
                    {formatBdt(item.unitPrice * item.qty)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    disabled={busyId === item.variantId}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => changeQty(item.variantId, item.qty - 1)}
                      disabled={busyId === item.variantId}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-100 text-slate-700 shadow-2xs active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-800">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQty(item.variantId, item.qty + 1)}
                      disabled={busyId === item.variantId}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-100 text-slate-700 shadow-2xs active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-800">
              <span>মোট সাবটোটাল:</span>
              <span className="text-base text-[#0F3F0D] font-black">
                {formatBdt(subtotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="w-full bg-[#5F9118] hover:bg-[#487D12] active:scale-[0.99] text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#5F9118]/25 transition-all"
            >
              <span>অর্ডার সম্পন্ন করুন (ক্যাশ অন ডেলিভারি)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
