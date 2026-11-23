import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestConvertForm } from "@/components/store/guest-convert-form";
import { Check, Truck } from "@/components/store/icons";
import { formatBdt } from "@/lib/money";
import { getOrderSuccessSummary } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "অর্ডার নিশ্চিত হয়েছে | BASA World",
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const data = await getOrderSuccessSummary(decodeURIComponent(number));
  if (data === null) {
    notFound();
  }

  const { order, items } = data;

  return (
    <div className="py-8 font-sans max-w-4xl mx-auto space-y-6">
      <div className="bg-[#EBF7EF] border border-[#5F9118]/30 rounded-2xl p-6 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#5F9118] text-white flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0F2920] mb-1">
          আপনার অর্ডার সফলভাবে গৃহীত হয়েছে!
        </h1>
        <p className="text-xs sm:text-sm font-bold text-[#5F9118]">
          অর্ডার নম্বর: {order.number}
        </p>
        <p className="text-xs text-slate-600 mt-2">
          পেমেন্ট মেথড: ক্যাশ অন ডেলিভারি (COD) • আনুমানিক ডেলিভারি সময়: ২-৩ কার্যদিবস
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-800 pb-3 border-b border-slate-100">
            অর্ডারের বিবরণ
          </h2>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between items-center text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-slate-800">{item.nameSnapshot}</p>
                  <p className="text-slate-400 text-xs font-mono">{item.skuSnapshot} × {item.qty}</p>
                </div>
                <span className="font-black text-[#0F3F0D]">
                  {formatBdt(item.priceSnapshot * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base font-black text-slate-800">
            <span>সর্বমোট প্রদেয়:</span>
            <span className="text-[#5F9118] text-lg">{formatBdt(order.total)}</span>
          </div>

          <div className="pt-2">
            <Link
              href={`/track?phone=${encodeURIComponent(order.customerPhone)}&order=${encodeURIComponent(order.number)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5F9118] hover:underline"
            >
              <Truck className="w-4 h-4" />
              <span>এই অর্ডারটি লাইভ ট্র্যাক করুন →</span>
            </Link>
          </div>
        </div>

        {order.isGuest && (
          <div className="md:col-span-5">
            <GuestConvertForm
              orderNumber={order.number}
              phone={order.customerPhone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
