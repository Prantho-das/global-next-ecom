"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { convertGuestToAccountAction } from "@/modules/sales/actions";

export interface GuestConvertFormProps {
  orderNumber: string;
  phone: string;
}

export function GuestConvertForm({ orderNumber, phone }: GuestConvertFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await convertGuestToAccountAction({
      orderNumber,
      phone,
      email,
      password,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold">
        অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে! এখন আপনি {email} দিয়ে লগইন করতে পারবেন।
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-black text-slate-800">
        অ্যাকাউন্ট তৈরি করে অর্ডার সংরক্ষণ করুন
      </h2>
      {error !== null && (
        <div role="alert" className="p-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="conv-email" className="block text-xs font-bold text-slate-700 mb-1">
            ইমেইল
          </label>
          <input
            id="conv-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5F9118]"
          />
        </div>
        <div>
          <label htmlFor="conv-pass" className="block text-xs font-bold text-slate-700 mb-1">
            পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)
          </label>
          <input
            id="conv-pass"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5F9118]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0F3F0D] hover:bg-[#071f06] text-white py-2 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50"
        >
          {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
        </button>
      </form>
    </div>
  );
}
