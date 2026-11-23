import Image from "next/image";
import Link from "next/link";

import { Mail, MapPin, Phone } from "@/components/store/icons";

export function StoreFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#0F3F0D] via-[#0b2f0a] to-[#071f06] text-white pt-10 sm:pt-14 pb-24 md:pb-10 border-t-2 border-[#5F9118] w-full relative overflow-hidden mt-12">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-[#5F9118]/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt="BASA World Logo"
                width={44}
                height={44}
                className="h-10 sm:h-11 w-auto object-contain bg-white rounded-xl p-1.5 group-hover:scale-105 transition-transform"
              />
              <span className="text-xl sm:text-2xl font-black font-serif text-white tracking-tight">
                BASA <span className="text-[#AECA92]">World</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pr-2">
              বাংলাদেশের প্রতিটি ঘরে শতভাগ বিশুদ্ধ, প্রাকৃতিক ও স্বাস্থ্যসম্মত
              খাদ্য উপাদান পৌঁছে দিতে BASA World দৃঢ় প্রতিশ্রুতিবদ্ধ।
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm sm:text-base text-[#AECA92] uppercase tracking-wider border-b border-[#5F9118]/40 pb-1.5 inline-block">
              জরুরি লিংক
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              <li>
                <Link
                  href="/products"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  সকল পণ্যসমূহ
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="hover:text-[#AECA92] transition-colors font-medium text-emerald-300 block py-0.5"
                >
                  অর্ডার ট্র্যাক করুন
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  শপিং ব্যাগ
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  ক্যাশ অন ডেলিভারি
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm sm:text-base text-[#AECA92] uppercase tracking-wider border-b border-[#5F9118]/40 pb-1.5 inline-block">
              জনপ্রিয় কালেকশন
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              <li>
                <Link
                  href="/products?category=honey"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  খাঁটি মধু কালেকশন
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=oil"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  ঘানি ভাঙা তেল ও ঘি
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=nuts"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  হানি নাটস ও সিড
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=special"
                  className="hover:text-[#AECA92] transition-colors block py-0.5"
                >
                  ভেষজ স্বাস্থ্য প্যাক
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 space-y-3">
            <h4 className="font-bold text-sm sm:text-base text-[#AECA92] uppercase tracking-wider border-b border-[#5F9118]/40 pb-1.5 inline-block">
              যোগাযোগ ও সেবা
            </h4>
            <div className="space-y-2 text-xs sm:text-sm text-slate-200">
              <p className="flex items-start gap-2 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-[#AECA92] shrink-0 mt-0.5" />
                <span>বাড়ি-১২, রোড-০৪, ধানমন্ডি, ঢাকা</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#AECA92] shrink-0" />
                <span>
                  হটলাইন:{" "}
                  <a
                    href="tel:01711000000"
                    className="text-white hover:text-[#AECA92] font-semibold"
                  >
                    ০১৭১১-০০০০০০
                  </a>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#AECA92] shrink-0" />
                <span>
                  ইমেইল:{" "}
                  <a
                    href="mailto:support@basaworld.com"
                    className="text-white hover:text-[#AECA92]"
                  >
                    support@basaworld.com
                  </a>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 text-center text-xs text-slate-300">
          <p>
            © ২০২৬ BASA World. সর্বস্বত্ব সংরক্ষিত। ১০০% প্রাকৃতিক ও খাঁটি খাদ্য সেবা।
          </p>
        </div>
      </div>
    </footer>
  );
}
