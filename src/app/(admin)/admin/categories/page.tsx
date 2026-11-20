import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CategoriesManager } from "@/components/admin/categories-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { getCategoriesTreeCached } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Categories | Admin",
};

export default async function AdminCategoriesPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "category:view"))) {
    redirect("/admin");
  }

  const categories = await getCategoriesTreeCached();

  return (
    <section aria-labelledby="categories-heading">
      <h1 id="categories-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Categories
      </h1>
      <CategoriesManager initialCategories={categories} />
    </section>
  );
}
