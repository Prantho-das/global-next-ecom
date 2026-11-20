import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandsManager } from "@/components/admin/brands-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { getBrandsCached } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Brands | Admin",
};

export default async function AdminBrandsPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "brand:view"))) {
    redirect("/admin");
  }

  const brands = await getBrandsCached();

  return (
    <section aria-labelledby="brands-heading">
      <h1 id="brands-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Brands
      </h1>
      <BrandsManager initialBrands={brands} />
    </section>
  );
}
