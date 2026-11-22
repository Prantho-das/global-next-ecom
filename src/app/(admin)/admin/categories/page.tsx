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
    <section aria-labelledby="categories-heading" className="space-y-4">
      <h2 id="categories-heading" className="sr-only">
        Categories
      </h2>
      <CategoriesManager initialCategories={categories} />
    </section>
  );
}
