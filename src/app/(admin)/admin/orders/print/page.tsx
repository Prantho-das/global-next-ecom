import { desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { renderInvoiceHtml } from "@/modules/order/invoice";
import { orderItems, orders } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Print Invoices | Admin",
};

export default async function AdminOrdersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; mode?: string }>;
}) {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "order:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const mode = params.mode === "packing_slip" ? "packing_slip" : "invoice";
  const db = getDb();

  const orderRows =
    params.id !== undefined
      ? await db.select().from(orders).where(eq(orders.id, params.id))
      : await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(20);

  const ids = orderRows.map((o) => o.id);
  const allItems =
    ids.length > 0
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, ids))
      : [];

  const html = renderInvoiceHtml(
    orderRows.map((o) => ({
      ...o,
      items: allItems.filter((i) => i.orderId === o.id),
    })),
    mode,
  );

  return (
    <section>
      <iframe
        title="Printable invoices"
        srcDoc={html}
        style={{ width: "100%", minHeight: "80vh", border: "1px solid #ddd" }}
      />
    </section>
  );
}
