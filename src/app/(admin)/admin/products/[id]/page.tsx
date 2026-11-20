import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import {
  getBrandsCached,
  getCategoriesTreeCached,
  getProductByIdCached,
} from "@/modules/catalog/queries";
import type { ProductStatus } from "@/modules/catalog/types";

export const metadata: Metadata = {
  title: "Edit Product | Admin",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "product:update"))) {
    redirect("/admin/products");
  }

  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    getProductByIdCached(id),
    getBrandsCached(),
    getCategoriesTreeCached(),
  ]);

  if (product === undefined) {
    notFound();
  }

  return (
    <section aria-labelledby="edit-product-heading">
      <h1
        id="edit-product-heading"
        style={{ fontSize: "1.75rem", marginTop: 0 }}
      >
        Edit Product
      </h1>
      <ProductForm
        brands={brands}
        categories={categories}
        initialProduct={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status as ProductStatus,
          brandId: product.brandId,
          categoryIds: product.categories.map((c) => c.categoryId),
          description: product.description,
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          compareAtPrice: product.compareAtPrice,
          hasVariants: product.hasVariants,
          options: product.options.map((o) => ({
            name: o.name,
            values: o.values,
          })),
          variants: product.variants,
          seoTitle: product.seo?.title ?? "",
          seoDescription: product.seo?.description ?? "",
          vendor: product.vendor ?? "",
          productType: product.productType ?? "",
          tags: product.tags,
        }}
      />
    </section>
  );
}
