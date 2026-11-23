"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { openCartDrawer } from "@/components/store/cart-events";
import {
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import { addToCartAction } from "@/modules/sales/actions";
import { computeFlatUnitPrice } from "@/modules/sales/service";

export interface PdpVariant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  optionValues: Record<string, string>;
  imageId?: string | null;
  isDefault: boolean;
}

export interface PdpImage {
  id: string;
  url: string;
  alt: string;
}

export interface PdpClientProps {
  productName: string;
  brandName?: string | null;
  description: string;
  images: readonly PdpImage[];
  variants: readonly PdpVariant[];
  salePrice: number | null;
}

export function PdpClient({
  productName,
  brandName,
  description,
  images,
  variants,
  salePrice,
}: PdpClientProps) {
  const router = useRouter();
  const defaultVariant =
    variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState<string>(
    defaultVariant?.id ?? "",
  );
  const [activeImageId, setActiveImageId] = useState<string>(
    defaultVariant?.imageId ?? images[0]?.id ?? "",
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;

  useEffect(() => {
    if (selected?.imageId) {
      setActiveImageId(selected.imageId);
    }
  }, [selected?.id, selected?.imageId]);

  const activeImage =
    images.find((im) => im.id === activeImageId) ?? images[0] ?? null;

  if (selected === null) {
    return (
      <div className="p-8 text-center text-red-500 font-bold bg-white rounded-2xl border border-red-200">
        পণ্যটি বর্তমানে অনুপলব্ধ।
      </div>
    );
  }

  const effectivePrice = computeFlatUnitPrice(selected.price, salePrice);
  const outOfStock = selected.stock <= 0;

  async function handleAdd(isBuyNow = false) {
    if (selected === null) return;
    setLoading(true);
    setFeedback(null);
    const res = await addToCartAction({ variantId: selected.id, qty });
    setLoading(false);
    if (!res.ok) {
      setFeedback(res.message);
      return;
    }
    if (isBuyNow) {
      router.push("/checkout");
    } else {
      setFeedback("ব্যাগে সফলভাবে যোগ করা হয়েছে!");
      openCartDrawer();
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 font-sans">
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
          <div className="relative rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[320px] max-h-[460px] border border-slate-100">
            <span className="absolute top-3 left-3 bg-[#5F9118] text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-xs">
              ১০০% অর্গানিক ও খাঁটি
            </span>
            {activeImage === null ? (
              <p className="text-slate-400">কোন ছবি নেই</p>
            ) : (
              <Image
                src={activeImage.url}
                alt={activeImage.alt || productName}
                width={700}
                height={700}
                priority
                className="w-full h-full max-h-[440px] object-contain"
              />
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img) => {
                const isActive = img.id === activeImageId;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageId(img.id)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white shrink-0 ${
                      isActive
                        ? "border-[#5F9118] shadow-sm scale-105"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || productName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <span className="text-xs font-bold text-[#5F9118] uppercase tracking-wider">
              {brandName || "BASA World Organic"}
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight mt-1 leading-snug">
              {productName}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-[#E8B65D] font-bold text-sm">★★★★★</span>
              <span className="text-slate-500 font-semibold">(৫.০ / ৪৮ রিভিউ)</span>
              <span>•</span>
              <span
                className={`font-bold ${
                  outOfStock ? "text-red-500" : "text-[#5F9118]"
                }`}
              >
                {outOfStock ? "স্টক শেষ" : `ইন স্টক (${selected.stock} টি অবশিষ্ট)`}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 py-3 border-y border-slate-100">
            <span className="text-2xl sm:text-3xl font-black text-[#5F9118]">
              {formatBdt(effectivePrice)}
            </span>
            {selected.compareAtPrice !== null &&
              selected.compareAtPrice > effectivePrice && (
                <span className="text-sm text-slate-400 line-through">
                  {formatBdt(selected.compareAtPrice)}
                </span>
              )}
          </div>

          {variants.length > 1 && (
            <div className="space-y-1.5">
              <label
                htmlFor="pdp-variant"
                className="block text-xs font-bold text-slate-700"
              >
                প্যাকেজ / সাইজ নির্বাচন করুন
              </label>
              <select
                id="pdp-variant"
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {Object.values(v.optionValues).join(" / ") || v.sku} —{" "}
                    {formatBdt(computeFlatUnitPrice(v.price, salePrice))}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">পরিমাণ:</span>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-700 shadow-2xs font-bold active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-black text-sm text-slate-800">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQty((prev) => Math.min(selected.stock || 99, prev + 1))
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-700 shadow-2xs font-bold active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={outOfStock || loading}
                onClick={() => handleAdd(false)}
                className="w-full bg-[#5F9118] hover:bg-[#487D12] active:scale-[0.99] text-white py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                <span>ব্যাগে যোগ করুন</span>
              </button>

              <button
                type="button"
                disabled={outOfStock || loading}
                onClick={() => handleAdd(true)}
                className="w-full bg-[#0F3F0D] hover:bg-[#071f06] active:scale-[0.99] text-white py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <span>এখনই অর্ডার করুন</span>
              </button>
            </div>

            {feedback !== null && (
              <p
                role="status"
                className={`text-xs font-bold p-2.5 rounded-lg text-center ${
                  feedback.includes("সফল")
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {feedback}
              </p>
            )}
          </div>

          <div className="bg-[#F4FAF6] rounded-xl p-4 border border-[#5F9118]/20 space-y-2 mt-4 text-xs text-slate-700">
            <p className="flex items-center gap-2 font-bold text-[#0F3F0D]">
              <Truck className="w-4 h-4 text-[#5F9118]" />
              <span>সারাদেশে দ্রুত ক্যাশ অন হোম ডেলিভারি সুবিধা</span>
            </p>
            <p className="flex items-center gap-2 font-bold text-[#0F3F0D]">
              <ShieldCheck className="w-4 h-4 text-[#5F9118]" />
              <span>১০০% খাঁটি ও প্রাকৃতিক না হলে মূল্য ফেরত গ্যারান্টি</span>
            </p>
            <p className="flex items-center gap-2 font-bold text-[#0F3F0D]">
              <Check className="w-4 h-4 text-[#5F9118]" />
              <span>পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ করুন</span>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 mb-2">পণ্যের বিবরণ</h3>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
              <p>{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
