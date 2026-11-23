"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight } from "@/components/store/icons";

const SLIDES = [
  {
    id: 1,
    img: "/banners/organic-food-1.jpg",
    title: "অর্গানিক ফুড ও প্রাকৃতিক পুষ্টিকর পণ্য",
    link: "/products",
  },
  {
    id: 2,
    img: "/banners/behance-header-wide.jpg",
    title: "শতভাগ খাঁটি ও পুষ্টিকর খাদ্যপণ্যের সমাহার",
    link: "/products",
  },
  {
    id: 3,
    img: "/banners/trust-showcase.jpg",
    title: "সুন্দরবনের খাঁটি মধু ও কাঠের ঘানির খাঁটি তেল",
    link: "/products",
  },
];

export function StoreHeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  return (
    <section className="w-full my-4 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch w-full">
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-900 h-[220px] sm:h-[300px] md:h-[360px] lg:h-[400px]">
          <div className="relative w-full h-full overflow-hidden">
            {SLIDES.map((slide, index) => (
              <Link
                key={slide.id}
                href={slide.link}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  index === currentSlide
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <Image
                  src={slide.img}
                  alt={slide.title}
                  fill
                  className="object-cover object-center"
                  priority={index === 0}
                />
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={prevSlide}
            aria-label="পূর্ববর্তী স্লাইড"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-[#5F9118] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="পরবর্তী স্লাইড"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-[#5F9118] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`স্লাইড ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentSlide
                    ? "w-7 h-2 bg-[#5F9118]"
                    : "w-2 h-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 h-[400px]">
          <Link
            href="/products"
            className="group relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 flex-1 relative bg-slate-100"
          >
            <Image
              src="/banners/behance-grid-3.jpg"
              alt="প্রাকৃতিক চাষাবাদ ও তাজা খাদ্য"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
              <span className="text-[10px] font-bold bg-[#5F9118] px-2 py-0.5 rounded-full w-fit mb-1">
                সেরা কালেকশন
              </span>
              <p className="font-bold text-sm leading-snug">
                খাঁটি সুন্দরবন ও লিচু ফুলের মধু
              </p>
            </div>
          </Link>

          <Link
            href="/products"
            className="group relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 flex-1 relative bg-slate-100"
          >
            <Image
              src="/banners/behance-grid-5.jpg"
              alt="ঘানি সরিষার তেল ও গাওয়া ঘি"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
              <span className="text-[10px] font-bold bg-[#E8B65D] text-[#0F2920] px-2 py-0.5 rounded-full w-fit mb-1">
                ১০০% খাঁটি
              </span>
              <p className="font-bold text-sm leading-snug">
                ঘানি ভাঙা সরিষার তেল ও সুস্বাদু গাওয়া ঘি
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
