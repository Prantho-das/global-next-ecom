import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StockManager } from "@/components/admin/stock-manager";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import {
  listInventoryVariants,
  listPurchaseOrders,
  listStockMovementsCursor,
} from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Purchase & Stock | Admin",
};

export default async function AdminStockPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "stock:view"))) {
    redirect("/admin");
  }

  const [inventory, movementsPage, purchases] = await Promise.all([
    listInventoryVariants(),
    listStockMovementsCursor({}),
    listPurchaseOrders(),
  ]);

  return (
    <section aria-labelledby="stock-heading" className="space-y-4">
      <h2 id="stock-heading" className="sr-only">
        Purchase &amp; Stock Management
      </h2>
      <StockManager
        initialInventory={inventory}
        initialMovements={movementsPage.items}
        initialPurchases={purchases.map((p) => ({
          ...p,
          receivedAt: p.receivedAt.toISOString(),
        }))}
      />
    </section>
  );
}
