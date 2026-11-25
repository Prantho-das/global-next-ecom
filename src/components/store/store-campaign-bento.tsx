import Image from "next/image";
import Link from "next/link";

import { ArrowUpRight, Phone, Truck } from "@/components/store/icons";
import type { CampaignBentoConfig } from "@/modules/settings/queries";

export function StoreCampaignBento({
  config,
  supportPhone,
}: {
  config: CampaignBentoConfig;
  supportPhone: string;
}) {
  return (
    <section
      aria-label="Promotional Campaigns and Delivery"
      className="w-full my-8 font-sans"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col gap-4">
          <Link
            href={config.mainLink}
            className="group relative rounded-xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-slate-900 flex-1 min-h-[190px] relative"
          >
            <Image
              src={config.mainImg}
              alt={config.mainTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent flex flex-col justify-center p-5 sm:p-6 text-white">
              <span className="bg-[#5F9118] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit uppercase tracking-wider mb-1.5 shadow-xs">
                {config.mainBadge}
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                {config.mainTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xs drop-shadow">
                {config.mainSubtitle}
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
              href={config.leftLink}
              className="group relative rounded-xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-slate-100 aspect-square relative"
            >
              <Image
                src={config.leftImg}
                alt="অর্গানিক ফুড ও খাঁটি উপাদান"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5">
                <span className="text-xs font-bold text-white bg-[#5F9118] px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  অর্ডার করুন <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            <Link
              href={config.rightLink}
              className="group relative rounded-xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-slate-100 aspect-square relative"
            >
              <Image
                src={config.rightImg}
                alt="প্রাকৃতিক চাষাবাদ ও তাজা খাদ্য"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3.5">
                <span className="text-xs font-bold text-white bg-[#5F9118] px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  অর্ডার করুন <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="group relative rounded-xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-white flex-1 min-h-[380px] flex flex-col justify-between relative">
            <Image
              src={config.deliveryImg}
              alt={config.deliveryTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            <a
              href={`tel:${supportPhone}`}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-[#0F2920] hover:bg-[#5F9118] text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-all"
            >
              <Phone className="w-4 h-4 text-[#E8B65D] animate-bounce" />
              <span>কল করুন: {supportPhone}</span>
            </a>

            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/80 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-[#0F2920] leading-tight">
                    {config.deliveryTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {config.deliverySubtitle}
                  </p>
                </div>
              </div>

              <a
                href={`tel:${supportPhone}`}
                className="bg-[#5F9118] hover:bg-[#487D12] text-white text-xs font-bold px-3.5 py-2 rounded-lg shrink-0 transition-colors shadow-sm"
              >
                কল দিন
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
