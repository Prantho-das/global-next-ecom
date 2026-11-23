import Link from "next/link";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export function StoreCategorySection({
  categories,
}: {
  categories: readonly CategoryItem[];
}) {
  if (categories.length === 0) return null;

  const categoryVisuals: Record<
    string,
    { circleBg: string; borderGlow: string; icon: string }
  > = {
    honey: {
      circleBg: "from-[#FFE7A3] to-[#FFF6D8]",
      borderGlow: "border-amber-300",
      icon: "🍯",
    },
    oil: {
      circleBg: "from-[#D6F0C2] to-[#EEF9E6]",
      borderGlow: "border-[#5F9118]",
      icon: "🫒",
    },
    nuts: {
      circleBg: "from-[#FFDDB7] to-[#FFF0E0]",
      borderGlow: "border-orange-300",
      icon: "🥜",
    },
    special: {
      circleBg: "from-[#E2F5B6] to-[#F3FCE0]",
      borderGlow: "border-lime-300",
      icon: "🌿",
    },
  };

  return (
    <section
      aria-label="Shop By Category"
      className="w-full my-6 font-sans overflow-hidden"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F9118] animate-pulse" />
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
              ক্যাটাগরি অনুযায়ী কেনাকাটা করুন
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            আপনার পছন্দের প্রাকৃতিক অর্গানিক খাদ্যপণ্য বেছে নিন
          </p>
        </div>
        <Link
          href="/products"
          className="text-xs font-bold text-[#5F9118] hover:underline"
        >
          সবগুলো দেখুন →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat, idx) => {
          const visual = categoryVisuals[cat.slug] || {
            circleBg: "from-slate-100 to-slate-200",
            borderGlow: "border-slate-300",
            icon: "🌾",
          };

          return (
            <Link
              key={cat.id || idx}
              href={`/products?category=${encodeURIComponent(cat.slug)}`}
              className="group bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col items-center"
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr ${visual.circleBg} border ${visual.borderGlow} flex items-center justify-center text-2xl mb-2.5 shadow-2xs group-hover:scale-110 transition-transform`}
              >
                {visual.icon}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#5F9118] transition-colors line-clamp-1">
                {cat.name}
              </h3>
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                অর্ডার করুন
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
