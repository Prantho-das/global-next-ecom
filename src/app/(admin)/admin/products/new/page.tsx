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
    <section aria-labelledby="new-product-heading">
      <h1 id="new-product-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        New Product
      </h1>
      <ProductForm brands={brands} categories={categories} />
    </section>
  );
}
