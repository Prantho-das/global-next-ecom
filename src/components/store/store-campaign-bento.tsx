import Image from "next/image";
import Link from "next/link";

import { ArrowUpRight, Phone, Truck } from "@/components/store/icons";

export function StoreCampaignBento() {
  return (
    <section
      aria-label="Promotional Campaigns and Delivery"
      className="w-full my-8 font-sans"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col gap-4">
          <Link
            href="/products"
            className="group relative rounded-xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 bg-slate-900 flex-1 min-h-[190px] relative"
          >
            <Image
              src="/banners/behance-header-wide.jpg"
              alt="শতভাগ খাঁটি ও পুষ্টিকর খাদ্যপণ্য"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent flex flex-col justify-center p-5 sm:p-6 text-white">
              <span className="bg-[#5F9118] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit uppercase tracking-wider mb-1.5 shadow-xs">
                ১০০% ন্যাচারাল
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                খাঁটি ও পুষ্টিকর খাদ্যপণ্যের সমাহার
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xs drop-shadow">
                প্রকৃতির শ্রেষ্ঠ উপহার সরাসরি আপনার ঘরে
              </p>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-[#5F9118] group-hover:bg-[#487D12] px-3.5 py-1.5 rounded-full shadow-md transition-colors">
                  <span>পণ্য দেখুন</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/products"
              className="group relative rounded-xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 bg-slate-100 aspect-square relative"
            >
              <Image
                src="/banners/behance-grid-3.jpg"
                alt="অর্গানিক ফুড ও খাঁটি উপাদান"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5">
                <span className="text-xs font-bold text-white bg-[#5F9118] px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  অর্ডার করুন <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>

            <Link
              href="/products"
              className="group relative rounded-xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 bg-slate-100 aspect-square relative"
            >
              <Image
                src="/banners/behance-grid-5.jpg"
                alt="প্রাকৃতিক চাষাবাদ ও তাজা খাদ্য"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5">
                <span className="text-xs font-bold text-white bg-[#5F9118] px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  অর্ডার করুন <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="group relative rounded-xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 bg-white flex-1 min-h-[380px] relative">
            <Image
              src="/banners/steadfast-delivery.jpg"
              alt="দেশজুড়ে ক্যাশ অন হোম ডেলিভারি"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 right-4 z-10">
              <a
                href="tel:01711000000"
                className="inline-flex items-center gap-1.5 bg-[#0F3F0D] hover:bg-[#5F9118] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-[#AECA92]" />
                <span>কল করুন</span>
              </a>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-5 h-5 text-[#AECA92]" />
                <span className="text-xs font-bold text-[#AECA92] uppercase tracking-wider">
                  দেশব্যাপী হোম ডেলিভারি
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                দ্রুত ও নিরাপদ ক্যাশ অন ডেলিভারি
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধের নিশ্চয়তা।
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
