"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { deleteBrandAction, upsertBrandAction } from "@/modules/catalog/actions";
import type { BrandItem } from "@/modules/catalog/types";

export interface BrandsManagerProps {
  initialBrands: readonly BrandItem[];
}

export function BrandsManager({ initialBrands }: BrandsManagerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file === undefined) {
      return;
    }
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!res.ok || data.url === undefined) {
      setError(data.error ?? "Failed to upload logo");
      return;
    }
    setLogoUrl(data.url);
  }

  const filtered = initialBrands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await upsertBrandAction({
      name,
      slug: slug.trim() || undefined,
      status,
      logoUrl: logoUrl.trim() || null,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setName("");
    setSlug("");
    setStatus("active");
    setLogoUrl("");
    router.refresh();
  }

  async function handleToggleStatus(brand: BrandItem) {
    const nextStatus = brand.status === "active" ? "inactive" : "active";
    const res = await upsertBrandAction({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      status: nextStatus,
      logoUrl: brand.logoUrl,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteBrandAction({ id });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5">
        <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 m-0">Add Brand</h3>
          {error !== null && (
            <div
              role="alert"
              className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="brand-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Brand Name
              </label>
              <input
                id="brand-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="brand-slug"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Slug (optional)
              </label>
              <input
                id="brand-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="brand-status"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Status
              </label>
              <select
                id="brand-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "inactive")
                }
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="brand-logo"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Brand Logo (Upload or URL)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  {uploading ? "Uploading..." : "Upload Logo"}
                </button>
                <input
                  id="brand-logo"
                  type="text"
                  placeholder="or paste URL"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              {logoUrl.trim() !== "" && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={logoUrl}
                    alt="Brand logo preview"
                    className="h-10 w-10 object-contain rounded border border-slate-200 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded shadow-sm transition"
            >
              {loading ? "Saving..." : "Create Brand"}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Brands ({initialBrands.length})
              </h3>
              <p className="text-xs text-slate-500 m-0">
                Manage product brand directory &amp; status
              </p>
            </div>
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-52"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No brands found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Slug</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filtered.map((brand) => (
                    <tr key={brand.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {brand.logoUrl !== null && brand.logoUrl !== "" && (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="h-7 w-7 object-contain rounded border border-slate-200 bg-white"
                            />
                          )}
                          <span>{brand.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs font-mono">
                        {brand.slug}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(brand)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer ${
                            brand.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {brand.status}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(brand.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
