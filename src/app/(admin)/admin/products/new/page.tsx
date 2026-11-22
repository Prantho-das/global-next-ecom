import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import {
  getBrandsCached,
  getCategoriesTreeCached,
} from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "New Product | Admin",
};

export default async function NewProductPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "product:create"))) {
    redirect("/admin/products");
  }

  const [brands, categories] = await Promise.all([
    getBrandsCached(),
    getCategoriesTreeCached(),
  ]);

  return (
    <section aria-labelledby="new-product-heading" className="space-y-4">
      <h2
        id="new-product-heading"
        className="text-lg font-bold text-slate-900 m-0"
      >
        Create New Product
      </h2>
      <ProductForm brands={brands} categories={categories} />
    </section>
  );
}
