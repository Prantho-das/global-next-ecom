import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { listProductsCursor } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Products | Admin",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; q?: string; status?: string }>;
}) {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "product:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const page = await listProductsCursor({
    cursor: params.cursor ?? null,
    search: params.q,
    status: params.status,
  });

  const activeCount = page.items.filter((i) => i.status === "active").length;
  const draftCount = page.items.filter((i) => i.status === "draft").length;
  const totalStock = page.items.reduce((acc, i) => acc + i.totalStock, 0);

  return (
    <section aria-labelledby="products-heading" className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Showing
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {page.items.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i className="ti ti-package" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {activeCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i className="ti ti-circle-check" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Draft
            </div>
            <div className="text-2xl font-extrabold text-amber-500 mt-1">
              {draftCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i className="ti ti-clock" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Stock
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalStock}
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <i className="ti ti-box" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2
              id="products-heading"
              className="text-lg font-bold text-slate-900 m-0"
            >
              Product Catalog
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Search, filter by status, and manage SKUs
            </p>
          </div>

          <form method="GET" className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <i className="ti ti-search absolute left-3.5 top-2.5 text-slate-400 text-base" />
              <input
                type="text"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search product..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>

            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-semibold transition"
            >
              Filter
            </button>

            <Link
              href="/admin/products/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition"
            >
              <i className="ti ti-plus" />
              <span>New Product</span>
            </Link>
          </form>
        </div>

        <div className="overflow-x-auto">
          {page.items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No products found.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Brand</th>
                  <th className="py-2.5 px-4">Base Price</th>
                  <th className="py-2.5 px-4">Variants</th>
                  <th className="py-2.5 px-4">Total Stock</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {page.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          STATUS_BADGE[item.status] ?? STATUS_BADGE["archived"]
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {item.brandName ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {formatBdt(item.basePrice)}
                    </td>
                    <td className="py-2.5 px-4">{item.variantCount}</td>
                    <td className="py-2.5 px-4 font-medium">{item.totalStock}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/admin/products/${item.id}`}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <i className="ti ti-edit" />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {page.nextCursor !== null && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex justify-end">
            <Link
              href={`/admin/products?cursor=${encodeURIComponent(page.nextCursor)}`}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-sm font-semibold inline-flex items-center gap-1.5 transition"
            >
              <span>Next Page</span>
              <i className="ti ti-chevron-right" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
