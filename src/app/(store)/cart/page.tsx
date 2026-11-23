import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { ArrowRight, ShoppingBag } from "@/components/store/icons";
import { getSession } from "@/lib/auth";
import { formatBdt } from "@/lib/money";
import { getActiveCartView } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "শপিং ব্যাগ | BASA World",
};

export default async function CartPage() {
  const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);

  return (
    <div className="py-8 font-sans max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <ShoppingBag className="w-6 h-6 text-[#5F9118]" />
        <h1 className="text-xl sm:text-2xl font-black text-slate-800">
          আপনার শপিং ব্যাগ
        </h1>
      </div>

      {cart.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 bg-[#F4FAF6] rounded-2xl flex items-center justify-center mx-auto text-[#5F9118]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            আপনার ব্যাগ বর্তমানে খালি রয়েছে
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            আমাদের সুস্বাদু ও পুষ্টিকর অর্গানিক খাদ্যপণ্য ব্রাউজ করে ব্যাগে যোগ করুন।
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[#5F9118] hover:bg-[#487D12] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <span>পণ্য ব্রাউজ করুন</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="pb-3">পণ্য</th>
                  <th className="pb-3">এসকেইউ</th>
                  <th className="pb-3 text-center">পরিমাণ</th>
                  <th className="pb-3 text-right">একক মূল্য</th>
                  <th className="pb-3 text-right">মোট মূল্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <tr key={item.variantId} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-800">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="hover:text-[#5F9118]"
                      >
                        {item.productName}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-xs">
                      {item.sku}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.qty}
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      {formatBdt(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-black text-[#0F3F0D]">
                      {formatBdt(item.unitPrice * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-base sm:text-lg font-black text-slate-800">
              সর্বমোট সাবটোটাল:{" "}
              <span className="text-[#5F9118] text-xl sm:text-2xl ml-1">
                {formatBdt(cart.subtotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#5F9118] hover:bg-[#487D12] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-[#5F9118]/25 transition-all"
            >
              <span>চেকআউট করুন (ক্যাশ অন ডেলিভারি)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
