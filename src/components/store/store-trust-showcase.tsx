import Image from "next/image";

import {
  Globe,
  HeartHandshake,
  Leaf,
  Package,
  ShieldCheck,
  Truck,
} from "@/components/store/icons";
import type { TrustSectionConfig } from "@/modules/settings/queries";

const LEFT_ICONS = [Leaf, Package, HeartHandshake];
const RIGHT_ICONS = [ShieldCheck, Truck, Globe];

export function StoreTrustShowcase({
  config,
}: {
  config: TrustSectionConfig;
}) {
  return (
    <section
      aria-labelledby="trust-showcase-title"
      className="w-full bg-gradient-to-b from-[#EBF7EF] via-[#F4FAF6] to-[#E2F5E9] rounded-2xl border border-[#5F9118]/20 p-4 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden my-6 sm:my-8 font-sans"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-white/50 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 text-center max-w-3xl mx-auto mb-6 sm:mb-10">
        <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#5F9118] uppercase inline-block mb-1.5">
          {config.badge}
        </span>
        <h2
          id="trust-showcase-title"
          className="text-lg sm:text-3xl lg:text-4xl font-extrabold text-[#0F2920] tracking-tight leading-snug sm:leading-tight"
        >
          {config.title}
        </h2>
        <p className="text-xs sm:text-sm text-[#475569] mt-2 sm:mt-3 leading-relaxed">
          {config.subtitle}
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
        <div className="lg:col-span-4 space-y-4 sm:space-y-8 order-2 lg:order-1">
          {config.leftFeatures.map((item, idx) => {
            const Icon = LEFT_ICONS[idx % LEFT_ICONS.length] ?? Leaf;
            return (
              <div
                key={idx}
                className="flex items-start gap-3 sm:gap-4 lg:flex-row-reverse lg:text-right group"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5F9118]/25 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-base font-bold text-[#0F2920] leading-snug group-hover:text-[#5F9118] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#637381] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-4 flex items-center justify-center py-2 sm:py-4 order-1 lg:order-2">
          <div className="relative group max-w-[220px] sm:max-w-[340px] w-full flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/60 blur-2xl scale-95 group-hover:scale-105 transition-transform" />
            <Image
              src={config.image || "/trust-showcase.jpg"}
              alt={config.title}
              width={340}
              height={340}
              className="relative z-10 w-full h-auto object-contain rounded-2xl drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 sm:space-y-8 order-3">
          {config.rightFeatures.map((item, idx) => {
            const Icon = RIGHT_ICONS[idx % RIGHT_ICONS.length] ?? ShieldCheck;
            return (
              <div key={idx} className="flex items-start gap-3 sm:gap-4 text-left group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5F9118]/25 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-base font-bold text-[#0F2920] leading-snug group-hover:text-[#5F9118] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#637381] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
