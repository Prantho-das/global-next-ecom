import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { verifyRecoveryToken } from "@/modules/marketing/service";
import { carts } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "কার্ট পুনরুদ্ধার | BASA World",
};

export default async function RecoverCartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyRecoveryToken(token, getEnv().BETTER_AUTH_SECRET);

  if (verified === null) {
    return (
      <div className="py-12 max-w-md mx-auto text-center font-sans">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-3">
          <h1 className="text-base font-black text-red-700">
            পুনরুদ্ধার লিঙ্কটি মেয়াদোত্তীর্ণ অথবা অবৈধ
          </h1>
          <Link
            href="/products"
            className="inline-block bg-[#5F9118] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            পণ্য ব্রাউজ করুন
          </Link>
        </div>
      </div>
    );
  }

  const db = getDb();
  await db
    .update(carts)
    .set({ status: "recovered", updatedAt: new Date() })
    .where(eq(carts.id, verified.cartId));

  return (
    <div className="py-12 max-w-md mx-auto text-center font-sans">
      <div className="bg-[#EBF7EF] border border-[#5F9118]/30 rounded-2xl p-8 space-y-3">
        <h1 className="text-lg font-black text-[#0F2920]">
          স্বাগতম! আপনার শপিং ব্যাগ প্রস্তুত রয়েছে।
        </h1>
        <p className="text-xs text-slate-500">
          আপনার পূর্বে নির্বাচিত পণ্যগুলো স্বয়ংক্রিয়ভাবে কার্টে যুক্ত হয়েছে।
        </p>
        <Link
          href="/checkout"
          className="inline-block bg-[#5F9118] hover:bg-[#487D12] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs"
        >
          চেকআউট সম্পন্ন করুন
        </Link>
      </div>
    </div>
  );
}
