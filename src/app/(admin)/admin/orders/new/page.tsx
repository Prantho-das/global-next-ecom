import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateOrderForm } from "@/components/admin/create-order-form";
import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { listInventoryVariants } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Create Order | Admin",
};

export default async function NewAdminOrderPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "order:create"))) {
    redirect("/admin/orders");
  }

  const variants = await listInventoryVariants();

  return (
    <section aria-labelledby="new-order-heading" className="space-y-4">
      <h2 id="new-order-heading" className="text-base font-bold text-slate-900 m-0">
        Create Manual / POS Order
      </h2>
      <CreateOrderForm variants={variants} />
    </section>
  );
}
