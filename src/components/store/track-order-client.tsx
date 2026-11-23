"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Check, ShieldCheck, Truck } from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import {
  requestTrackOtpAction,
  verifyTrackOrderAction,
} from "@/modules/sales/actions";

export interface TrackOrderClientProps {
  initialPhone: string;
  initialOrder: string;
}

interface TrackResult {
  order: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
  };
  events: Array<{
    id: string;
    toStatus: string;
    note: string | null;
    createdAt: Date;
  }>;
}

export function TrackOrderClient({
  initialPhone,
  initialOrder,
}: TrackOrderClientProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [otpCode, setOtpCode] = useState("");
  const [genericMsg, setGenericMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestTrackOtpAction({ phone, orderNumber });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setGenericMsg(res.data.message);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await verifyTrackOrderAction({ phone, orderNumber, otpCode });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult(res.data);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 font-sans">
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-[#5F9118]" />
            <h2 className="text-lg font-black text-slate-800">
              ১. ভেরিফিকেশন কোড (OTP) পাঠান
            </h2>
          </div>

          {error !== null && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200"
            >
              {error}
            </div>
          )}
          {genericMsg !== null && (
            <div
              role="status"
              className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200"
            >
              {genericMsg}
            </div>
          )}

          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                htmlFor="trk-phone"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                ফোন নম্বর
              </label>
              <input
                id="trk-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="trk-order"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                অর্ডার নম্বর
              </label>
              <input
                id="trk-order"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5F9118] hover:bg-[#487D12] text-white py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "অপেক্ষা করুন..." : "OTP কোড পাঠান"}
            </button>
          </form>

          <form onSubmit={handleVerify} className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <h2 className="text-base font-black text-slate-800">
              ২. OTP কোড যাচাই করুন
            </h2>
            <div>
              <label
                htmlFor="trk-otp"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                ৬ ডিজিটের OTP কোড
              </label>
              <input
                id="trk-otp"
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5F9118] focus:ring-2 focus:ring-[#5F9118]/20 transition-all tracking-widest text-center font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F3F0D] hover:bg-[#071f06] text-white py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "যাচাই হচ্ছে..." : "অর্ডার স্ট্যাটাস দেখুন"}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-6">
        {result !== null ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-semibold">অর্ডার আইডি</span>
                <h3 className="text-lg font-black text-slate-800">
                  {result.order.number}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF7EF] text-[#5F9118] border border-[#5F9118]/30">
                {result.order.status}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm py-2">
              <span className="text-slate-500">পেমেন্ট মেথড:</span>
              <span className="font-bold text-slate-700">ক্যাশ অন ডেলিভারি (COD)</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-t border-slate-100">
              <span className="text-slate-500">সর্বমোট মূল্য:</span>
              <span className="font-black text-[#5F9118] text-base">
                {formatBdt(result.order.total)}
              </span>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 mb-3">
                ডেলিভারি টাইমলাইন
              </h4>
              <div className="space-y-3">
                {result.events.map((ev, idx) => (
                  <div key={ev.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{ev.toStatus}</p>
                      {ev.note !== null && (
                        <p className="text-slate-500 mt-0.5">{ev.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#F4FAF6] rounded-2xl border border-[#5F9118]/20 p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
            <ShieldCheck className="w-12 h-12 text-[#5F9118] mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              নিরাপদ অর্ডার ট্র্যাকিং
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              আপনার অর্ডারের সঠিক ডেলিভারি অগ্রগতি জানতে আপনার ফোন নম্বর ও অর্ডার আইডি দিন।
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
