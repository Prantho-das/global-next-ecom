"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight } from "@/components/store/icons";
import type { HeroSlideItem } from "@/modules/settings/queries";

export interface StoreHeroBannerProps {
  slides: readonly HeroSlideItem[];
  sideTop: HeroSlideItem;
  sideBottom: HeroSlideItem;
}

export function StoreHeroBanner({
  slides,
  sideTop,
  sideBottom,
}: StoreHeroBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="w-full mb-4 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch w-full">
        <div className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-card-sm border border-slate-200/80 bg-gray-100 flex items-center h-[210px] sm:h-[300px] md:h-[360px] lg:h-[400px]">
          <div className="relative w-full h-full overflow-hidden">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  index === currentSlide
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <Link href={slide.link} className="block w-full h-full relative">
                  <Image
                    src={slide.img}
                    alt={slide.alt}
                    fill
                    className="object-cover object-center"
                    priority={index === 0}
                  />
                </Link>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={prevSlide}
            aria-label="পূর্ববর্তী স্লাইড"
            className="absolute left-3.5 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-[#5F9118] flex items-center justify-center shadow-card-md hover:scale-110 active:scale-95 transition-all backdrop-blur-xs"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="পরবর্তী স্লাইড"
            className="absolute right-3.5 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-[#5F9118] flex items-center justify-center shadow-card-md hover:scale-110 active:scale-95 transition-all backdrop-blur-xs"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="absolute bottom-3.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`স্লাইড ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentSlide
                    ? "w-7 sm:w-9 h-2 bg-[#5F9118]"
                    : "w-2 h-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4 lg:gap-5 justify-between h-auto lg:h-[400px]">
          <Link
            href={sideTop.link}
            className="flex-1 rounded-2xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-gray-100 transition-all group h-[140px] sm:h-[180px] lg:h-[190px] relative block"
          >
            <Image
              src={sideTop.img}
              alt={sideTop.alt}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </Link>

          <Link
            href={sideBottom.link}
            className="flex-1 rounded-2xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-gray-100 transition-all group h-[140px] sm:h-[180px] lg:h-[190px] relative block"
          >
            <Image
              src={sideBottom.img}
              alt={sideBottom.alt}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
