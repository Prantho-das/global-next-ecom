import type { Metadata } from "next";
import Link from "next/link";

import { Search } from "@/components/store/icons";
import { StoreProductCard } from "@/components/store/store-product-card";
import {
  getBrandsCached,
  getCategoriesTreeCached,
} from "@/modules/catalog/queries";
import { listStoreProductsCursor } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "সকল পণ্যসমূহ | BASA World",
  description: "প্রাকৃতিক খাঁটি মধু, তেল, ঘি ও ভেষজ খাদ্যপণ্যের সম্পূর্ণ ক্যাটালগ।",
};

export default async function StoreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    sort?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const sort =
    params.sort === "price_asc" || params.sort === "price_desc"
      ? params.sort
      : "newest";

  const [page, categories, brands] = await Promise.all([
    listStoreProductsCursor({
      cursor: params.cursor ?? null,
      categorySlug: params.category,
      brandSlug: params.brand,
      search: params.q,
      sort,
    }),
    getCategoriesTreeCached(),
    getBrandsCached(),
  ]);

  return (
    <div className="py-6 font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            সকল অর্গানিক ও প্রাকৃতিক পণ্যসমূহ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট {page.items.length} টি পণ্য প্রদর্শিত হচ্ছে
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <Link
            href="/products"
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
              !params.category
                ? "bg-[#5F9118] text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            সবগুলো
          </Link>
          {categories.map((c) => {
            const active = params.category === c.slug;
            return (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  active
                    ? "bg-[#5F9118] text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      </div>

      <form
        method="GET"
        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center"
      >
        <div className="relative">
          <input
            id="store-q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="পণ্য সার্চ করুন..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5F9118]"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        <div>
          <select
            id="store-cat"
            name="category"
            defaultValue={params.category ?? ""}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
          >
            <option value="">সকল ক্যাটাগরি</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="store-brand"
            name="brand"
            defaultValue={params.brand ?? ""}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
          >
            <option value="">সকল ব্র্যান্ড</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            id="store-sort"
            name="sort"
            defaultValue={sort}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#5F9118] bg-slate-50/50"
          >
            <option value="newest">নতুন পণ্য আগে</option>
            <option value="price_asc">মূল্য: কম থেকে বেশি</option>
            <option value="price_desc">মূল্য: বেশি থেকে কম</option>
          </select>
          <button
            type="submit"
            className="bg-[#5F9118] hover:bg-[#487D12] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
          >
            ফিল্টার
          </button>
        </div>
      </form>

      {page.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="font-bold text-base mb-1">কোন পণ্য খুঁজে পাওয়া যায়নি</p>
          <p className="text-xs text-slate-400">
            অনুগ্রহ করে অন্য শব্দ বা ক্যাটাগরি দিয়ে চেষ্টা করুন
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block bg-[#5F9118] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            সকল পণ্য দেখুন
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {page.items.map((prod) => (
            <StoreProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

      {page.nextCursor !== null && (
        <div className="text-center pt-6">
          <Link
            href={`/products?${new URLSearchParams({
              ...(params.q ? { q: params.q } : {}),
              ...(params.category ? { category: params.category } : {}),
              ...(params.brand ? { brand: params.brand } : {}),
              ...(params.sort ? { sort: params.sort } : {}),
              cursor: page.nextCursor,
            }).toString()}`}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-xs shadow-xs transition-all"
          >
            আরো পণ্য লোড করুন
          </Link>
        </div>
      )}
    </div>
  );
}
