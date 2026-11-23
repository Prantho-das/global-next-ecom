"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import { trackStoreEvent } from "@/lib/tracking";
import { captureAbandonContactAction } from "@/modules/marketing/actions";
import { applyCouponPreviewAction } from "@/modules/pricing/actions";
import type { PriceBreakdown } from "@/modules/pricing/types";
import {
  placeCodOrderAction,
  requestCheckoutOtpAction,
} from "@/modules/sales/actions";
import type { CartViewItem } from "@/modules/sales/queries";
import { DEFAULT_FLAT_SHIPPING_POISHA } from "@/modules/sales/service";
import type { ShippingLocationRule } from "@/modules/settings/queries";

const LOCATION_TREE: Record<
  string,
  Record<string, Record<string, string[]>>
> = {
  Bangladesh: {
    Dhaka: {
      Dhaka: ["Dhanmondi", "Gulshan", "Mirpur", "Uttara", "Mohammadpur", "Motijheel", "Banani"],
      Gazipur: ["Gazipur Sadar", "Tongi", "Sreepur"],
      Narayanganj: ["Narayanganj Sadar", "Siddhirganj", "Fatullah"],
      Savar: ["Savar Sadar", "Ashulia"],
    },
    Chattogram: {
      Chattogram: ["Kotwali", "Panchlaish", "Halishahar", "Agrabad"],
      "Cox's Bazar": ["Cox's Bazar Sadar", "Teknaf"],
      Cumilla: ["Cumilla Sadar", "Daudkandi"],
    },
    Sylhet: {
      Sylhet: ["Sylhet Sadar", "Beanibazar", "Zindabazar"],
      Moulvibazar: ["Moulvibazar Sadar", "Sreemangal"],
    },
    Rajshahi: {
      Rajshahi: ["Boalia", "Motihar", "Rajpara"],
      Bogura: ["Bogura Sadar", "Sherpur"],
    },
    Khulna: {
      Khulna: ["Khulna Sadar", "Sonadanga", "Khalishpur"],
      Jashore: ["Jashore Sadar", "Benapole"],
    },
    Barishal: {
      Barishal: ["Barishal Sadar", "Babuganj"],
    },
    Rangpur: {
      Rangpur: ["Rangpur Sadar", "Mithapukur"],
    },
    Mymensingh: {
      Mymensingh: ["Mymensingh Sadar", "Trishal"],
    },
  },
  India: {
    "West Bengal": {
      Kolkata: ["Salt Lake", "Park Street", "New Town", "Howrah"],
      Siliguri: ["Siliguri Town", "Matigara"],
    },
    Maharashtra: {
      Mumbai: ["Andheri", "Bandra", "Colaba"],
      Pune: ["Kothrud", "Hinjewadi"],
    },
    Delhi: {
      "New Delhi": ["Connaught Place", "Saket", "Dwarka"],
    },
  },
  "United Arab Emirates": {
    Dubai: {
      Dubai: ["Deira", "Bur Dubai", "Downtown", "Marina"],
    },
    "Abu Dhabi": {
      "Abu Dhabi": ["Al Reem", "Khalifa City"],
    },
  },
  "United Kingdom": {
    England: {
      London: ["Central London", "East London", "Canary Wharf"],
      Manchester: ["City Centre", "Salford"],
    },
  },
  "United States": {
    "New York": {
      "New York City": ["Manhattan", "Brooklyn", "Queens"],
    },
    California: {
      "Los Angeles": ["Downtown LA", "Santa Monica"],
    },
  },
};

export interface CheckoutFormProps {
  items: readonly CartViewItem[];
  subtotal: number;
  shippingMode?: "simple" | "advanced";
  insideDhakaFee?: number;
  outsideDhakaFee?: number;
  defaultCountry?: string;
  shippingLocations?: readonly ShippingLocationRule[];
}

export function CheckoutForm({
  items,
  subtotal,
  shippingMode = "simple",
  insideDhakaFee = 60,
  outsideDhakaFee = 120,
  defaultCountry = "Bangladesh",
  shippingLocations = [],
}: CheckoutFormProps) {
  const router = useRouter();
  const dynamicTree: Record<string, Record<string, Record<string, string[]>>> =
    shippingLocations.length > 0
      ? shippingLocations.reduce<
          Record<string, Record<string, Record<string, string[]>>>
        >((acc, loc) => {
          const cMap = (acc[loc.country] ??= {});
          const sMap = (cMap[loc.state] ??= {});
          const existingThanas =
            LOCATION_TREE[loc.country]?.[loc.state]?.[loc.area] ?? [loc.area];
          sMap[loc.area] = existingThanas;
          return acc;
        }, {})
      : LOCATION_TREE;

  const initialCountry =
    dynamicTree[defaultCountry] !== undefined
      ? defaultCountry
      : (Object.keys(dynamicTree)[0] ?? "Bangladesh");
  const initialState = Object.keys(dynamicTree[initialCountry] ?? {})[0] ?? "Dhaka";
  const initialDistrict =
    Object.keys(dynamicTree[initialCountry]?.[initialState] ?? {})[0] ?? "Dhaka";
  const initialThana =
    dynamicTree[initialCountry]?.[initialState]?.[initialDistrict]?.[0] ??
    "Dhanmondi";

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [simpleZone, setSimpleZone] = useState<"inside" | "outside">("inside");
  const [country, setCountry] = useState(initialCountry);
  const [division, setDivision] = useState(initialState);
  const [district, setDistrict] = useState(initialDistrict);
  const [thana, setThana] = useState(initialThana);
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<PriceBreakdown | null>(
    null,
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutTrackedRef = useRef(false);

  useEffect(() => {
    if (checkoutTrackedRef.current) {
      return;
    }
    checkoutTrackedRef.current = true;
    trackStoreEvent("InitiateCheckout", {
      valueMajor: subtotal / 100,
      contentIds: items.map((i) => i.variantId),
      numItems: items.reduce((sum, i) => sum + i.qty, 0),
    });
  }, [items, subtotal]);

  const states = Object.keys(dynamicTree[country] ?? {});
  const districts = Object.keys(dynamicTree[country]?.[division] ?? {});
  const thanas = dynamicTree[country]?.[division]?.[district] ?? [];

  const matchedRule = shippingLocations.find(
    (loc) =>
      loc.country === country &&
      loc.state === division &&
      loc.area === district,
  );

  const shippingFeePoisha =
    shippingMode === "simple"
      ? (simpleZone === "inside" ? insideDhakaFee : outsideDhakaFee) * 100
      : matchedRule !== undefined
        ? Math.round(matchedRule.cost * 100)
        : (country === "Bangladesh" && district === "Dhaka"
            ? insideDhakaFee
            : outsideDhakaFee) * 100 || DEFAULT_FLAT_SHIPPING_POISHA;

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    const res = await requestCheckoutOtpAction({ phone });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOtpSent(true);
  }

  async function handleApplyCoupon() {
    setError(null);
    const res = await applyCouponPreviewAction({
      code: couponCode,
      shippingFee: shippingFeePoisha,
    });
    if (!res.ok) {
      setCouponPreview(null);
      setError(res.message);
      return;
    }
    setCouponPreview(res.data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const effectiveCountry = shippingMode === "simple" ? "Bangladesh" : country;
    const effectiveDivision =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : division;
    const effectiveDistrict =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : district;
    const effectiveThana =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : thana;
    const res = await placeCodOrderAction({
      phone,
      name,
      country: effectiveCountry,
      division: effectiveDivision,
      district: effectiveDistrict,
      thana: effectiveThana,
      line,
      note: note.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      otpCode,
      idempotencyKey,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/order-success/${encodeURIComponent(res.data.orderNumber)}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 font-sans">
      <div className="lg:col-span-7">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
          <div>
            <span className="text-xs font-bold text-[#5F9118] uppercase tracking-wider">ক্যাশ অন ডেলিভারি</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
              ডেলিভারি ঠিকানা ও তথ্য
            </h2>
          </div>

          {error !== null && (
            <div
              role="alert"
              className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-8">
              <label htmlFor="chk-phone" className="block text-xs font-bold text-slate-700 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                id="chk-phone"
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  if (phone.trim().length >= 11) {
                    void captureAbandonContactAction({ contact: phone.trim() });
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="button"
                className="w-full bg-[#0F3F0D] hover:bg-[#071f06] text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
                disabled={loading || phone.trim().length < 11}
                onClick={handleSendOtp}
              >
                {otpSent ? "পুনরায় OTP পাঠান" : "OTP কোড পাঠান"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="chk-otp" className="block text-xs font-bold text-slate-700 mb-1">
              ৬ ডিজিট OTP কোড
            </label>
            <input
              id="chk-otp"
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all font-mono font-bold tracking-widest"
            />
          </div>

          <div>
            <label htmlFor="chk-name" className="block text-xs font-bold text-slate-700 mb-1">
              আপনার পুরো নাম
            </label>
            <input
              id="chk-name"
              type="text"
              required
              placeholder="যেমন: মোহাম্মদ আব্দুল্লাহ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
            />
          </div>

          {shippingMode === "simple" ? (
            <div>
              <label htmlFor="chk-zone" className="block text-xs font-bold text-slate-700 mb-1">
                ডেলিভারি এলাকা
              </label>
              <select
                id="chk-zone"
                value={simpleZone}
                onChange={(e) => {
                  const nextZone = e.target.value as "inside" | "outside";
                  setSimpleZone(nextZone);
                  setCouponPreview(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
              >
                <option value="inside">
                  ঢাকার ভিতরে ({formatBdt(insideDhakaFee * 100)})
                </option>
                <option value="outside">
                  ঢাকার বাইরে ({formatBdt(outsideDhakaFee * 100)})
                </option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="chk-country" className="block text-xs font-bold text-slate-700 mb-1">দেশ</label>
                <select
                  id="chk-country"
                  value={country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setCountry(nextCountry);
                    const nextState =
                      Object.keys(dynamicTree[nextCountry] ?? {})[0] ?? "";
                    setDivision(nextState);
                    const nextDist =
                      Object.keys(
                        dynamicTree[nextCountry]?.[nextState] ?? {},
                      )[0] ?? "";
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[nextCountry]?.[nextState]?.[nextDist]?.[0] ??
                        "",
                    );
                    setCouponPreview(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
                >
                  {Object.keys(dynamicTree).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chk-div" className="block text-xs font-bold text-slate-700 mb-1">বিভাগ / স্টেট</label>
                <select
                  id="chk-div"
                  value={division}
                  onChange={(e) => {
                    const nextDiv = e.target.value;
                    setDivision(nextDiv);
                    const nextDist =
                      Object.keys(
                        dynamicTree[country]?.[nextDiv] ?? {},
                      )[0] ?? "";
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[country]?.[nextDiv]?.[nextDist]?.[0] ?? "",
                    );
                    setCouponPreview(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chk-dist" className="block text-xs font-bold text-slate-700 mb-1">জেলা / শহর</label>
                <select
                  id="chk-dist"
                  value={district}
                  onChange={(e) => {
                    const nextDist = e.target.value;
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[country]?.[division]?.[nextDist]?.[0] ?? "",
                    );
                    setCouponPreview(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chk-thana" className="block text-xs font-bold text-slate-700 mb-1">থানা / এরিয়া</label>
                <select
                  id="chk-thana"
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
                >
                  {thanas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="chk-line" className="block text-xs font-bold text-slate-700 mb-1">
              সম্পূর্ণ ঠিকানা (বাসা/রোড/এলাকা)
            </label>
            <input
              id="chk-line"
              type="text"
              required
              placeholder="বাড়ি নং, রোড নং, এলাকা"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="chk-note" className="block text-xs font-bold text-slate-700 mb-1">
              অর্ডার নোট (ঐচ্ছিক)
            </label>
            <input
              id="chk-note"
              type="text"
              placeholder="ডেলিভারির বিশেষ নির্দেশনা থাকলে লিখুন"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5F9118] hover:bg-[#487D12] active:scale-[0.99] text-white py-3.5 rounded-xl font-black text-base shadow-md shadow-[#5F9118]/25 transition-all disabled:opacity-50"
          >
            {loading ? "অর্ডার প্রসেস হচ্ছে..." : "অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি)"}
          </button>
        </form>
      </div>

      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-black text-slate-800 pb-3 border-b border-slate-100">
            অর্ডার সামারি
          </h2>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.variantId} className="py-2.5 flex justify-between items-center text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-slate-800">{item.productName}</p>
                  <p className="text-slate-400 text-xs">পরিমাণ: {item.qty} টি</p>
                </div>
                <span className="font-black text-[#0F3F0D]">
                  {formatBdt(item.unitPrice * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              aria-label="Coupon code"
              placeholder="কুপন কোড"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5F9118]"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponCode.trim().length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              প্রয়োগ করুন
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>সাবটোটাল</span>
              <span className="font-bold text-slate-800">
                {formatBdt(couponPreview?.subtotal ?? subtotal)}
              </span>
            </div>
            {couponPreview !== null && couponPreview.couponDiscount > 0 && (
              <div className="flex justify-between text-[#5F9118] font-bold">
                <span>কুপন ছাড় ({couponPreview.couponCode})</span>
                <span>-{formatBdt(couponPreview.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>ডেলিভারি চার্জ</span>
              <span className="font-bold text-slate-800">
                {formatBdt(couponPreview?.shippingFee ?? shippingFeePoisha)}
              </span>
            </div>
            <div className="flex justify-between items-center text-base font-black text-slate-800 pt-3 border-t border-slate-100">
              <span>সর্বমোট প্রদেয়</span>
              <span className="text-lg text-[#5F9118]">
                {formatBdt(
                  couponPreview?.total ?? subtotal + shippingFeePoisha,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
