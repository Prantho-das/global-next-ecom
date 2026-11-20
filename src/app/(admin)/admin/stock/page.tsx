import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StockManager } from "@/components/admin/stock-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { listStockMovementsCursor } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Stock | Admin",
};

export default async function AdminStockPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "stock:view"))) {
    redirect("/admin");
  }

  const page = await listStockMovementsCursor({});

  return (
    <section aria-labelledby="stock-heading">
      <h1 id="stock-heading" style={{ fontSize: "1.75rem", marginTop: 0 }}>
        Stock Management
      </h1>
      <StockManager initialMovements={page.items} />
    </section>
  );
}
