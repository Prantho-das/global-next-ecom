"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight } from "@/components/store/icons";

const SLIDES = [
  {
    id: 1,
    img: "/banners/organic-food-1.jpg",
    alt: "অর্গানিক ফুড ও প্রাকৃতিক পুষ্টিকর পণ্য",
    link: "/products",
  },
  {
    id: 2,
    img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a16d91-89b6-7561-bfa9-987946b2c69a.webp",
    alt: "প্রাইমাল গোল্ড - আপনার শক্তি, এনার্জি ও স্ট্যামিনা থাকুক দীর্ঘস্থায়ী",
    link: "/products?category=special",
  },
  {
    id: 3,
    img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a16d92-2d04-7f66-b64a-2c82e031a4a3.webp",
    alt: "রসুনজিরা - কালোজিরা, রসুন ও মধুর ভেষজ কম্বিনেশন",
    link: "/products?category=special",
  },
  {
    id: 4,
    img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a16d94-c459-71d2-8ce9-b7d2acd9b719.webp",
    alt: "ফ্লেভার বক্স হানি কম্বো কালেকশন",
    link: "/products?category=honey",
  },
];

const SIDE_TOP = {
  id: "side-top",
  img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a16d94-172f-7ab1-bbaa-7d735410ab7f.webp",
  alt: "সবসময় সব আয়োজনে পরিবারের সাথে - শাহী মশলা",
  link: "/products?category=spices",
};

const SIDE_BOTTOM = {
  id: "side-bottom",
  img: "https://cdn.falaqfood.com/uploads/media/2026/10/01a16d94-6cca-7577-8c34-581babd4da4f.webp",
  alt: "আয়োজনে প্রতিদিন ঘি - প্রিমিয়াম গাওয়া ঘি",
  link: "/products?category=oil",
};

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
    <section className="w-full mb-4 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch w-full">
        <div className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-card-sm border border-slate-200/80 bg-gray-100 flex items-center h-[210px] sm:h-[300px] md:h-[360px] lg:h-[400px]">
          <div className="relative w-full h-full overflow-hidden">
            {SLIDES.map((slide, index) => (
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
            {SLIDES.map((_, idx) => (
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
            href={SIDE_TOP.link}
            className="flex-1 rounded-2xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-gray-100 transition-all group h-[140px] sm:h-[180px] lg:h-[190px] relative block"
          >
            <Image
              src={SIDE_TOP.img}
              alt={SIDE_TOP.alt}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </Link>

          <Link
            href={SIDE_BOTTOM.link}
            className="flex-1 rounded-2xl overflow-hidden shadow-card-sm hover:shadow-card-md border border-slate-200/80 bg-gray-100 transition-all group h-[140px] sm:h-[180px] lg:h-[190px] relative block"
          >
            <Image
              src={SIDE_BOTTOM.img}
              alt={SIDE_BOTTOM.alt}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
