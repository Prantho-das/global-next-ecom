"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ChevronRight, Play, X } from "@/components/store/icons";
import type { StoreVideoItem } from "@/modules/settings/queries";

export function StoreVideoGallery({
  videos,
}: {
  videos: readonly StoreVideoItem[];
}) {
  const [activeVideo, setActiveVideo] = useState<StoreVideoItem | null>(null);

  if (videos.length === 0) return null;

  return (
    <section aria-label="Video Gallery" className="w-full my-8 font-sans">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
          <span className="text-xs font-bold text-[#5F9118] tracking-widest uppercase">
            ভিডিও গ্যালারি
          </span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
          ভিডিওতে দেখুন আমাদের পণ্যের প্রস্তুত প্রণালী ও গুণমান
        </h2>
        <div className="w-16 h-1 bg-[#5F9118] mx-auto mt-2 rounded-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => setActiveVideo(video)}
            className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 cursor-pointer bg-slate-900 aspect-video transition-all duration-300"
          >
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-xs font-bold line-clamp-1 drop-shadow">
                {video.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-[#5F9118] text-[#5F9118] hover:bg-[#5F9118] hover:text-white font-bold text-xs tracking-wide transition-all shadow-xs"
        >
          <span>সব পণ্য ও ভিডিও দেখুন</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="flex items-center justify-between p-3.5 bg-neutral-900 text-white">
              <h3 className="text-xs sm:text-sm font-semibold truncate pr-4 text-neutral-200">
                {activeVideo.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
