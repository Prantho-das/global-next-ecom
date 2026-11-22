import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { enqueueCourierBookingAction } from "@/modules/courier/actions";
import { transitionOrderAction } from "@/modules/order/actions";
import { ORDER_STATUSES } from "@/modules/order/service";
import { orderEvents, orderItems, orders } from "@/modules/sales/schema";

export const metadata: Metadata = {
  title: "Order Detail | Admin",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "order:view"))) {
    redirect("/admin");
  }

  const { id } = await params;
  const db = getDb();
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  const order = orderRows[0];
  if (order === undefined) {
    notFound();
  }

  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(asc(orderEvents.createdAt)),
  ]);

  return (
    <section aria-labelledby="order-detail-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2
          id="order-detail-heading"
          className="text-lg font-bold text-slate-900 m-0"
        >
          Order {order.number}
        </h2>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/admin/orders/print?id=${encodeURIComponent(order.id)}&mode=invoice`}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-sm font-semibold inline-flex items-center gap-1.5 transition"
          >
            <i className="ti ti-printer" />
            <span>Print Invoice</span>
          </Link>
          <Link
            href={`/admin/orders/print?id=${encodeURIComponent(order.id)}&mode=packing_slip`}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-sm font-semibold inline-flex items-center gap-1.5 transition"
          >
            <i className="ti ti-package" />
            <span>Packing Slip</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Items</h3>
            <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      {item.nameSnapshot}
                    </span>{" "}
                    <span className="text-slate-400">
                      ({item.skuSnapshot}) × {item.qty}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {formatBdt(item.priceSnapshot * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Status: <strong className="text-slate-900">{order.status}</strong>
              </span>
              <span className="text-base font-extrabold text-slate-900">
                Total: {formatBdt(order.total)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">
              Timeline
            </h3>
            <ul className="divide-y divide-slate-100 m-0 p-0 list-none text-sm">
              {events.map((ev) => (
                <li key={ev.id} className="py-3 text-slate-700">
                  <strong className="text-indigo-600">{ev.toStatus}</strong> by{" "}
                  {ev.actor}
                  {ev.note !== null ? ` — ${ev.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Actions</h3>
            <form
              action={async (formData: FormData) => {
                "use server";
                const toStatus = String(formData.get("toStatus") ?? "");
                await transitionOrderAction({
                  orderId: order.id,
                  toStatus,
                });
              }}
              className="space-y-3"
            >
              <label
                htmlFor="ord-status-sel"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Transition Status
              </label>
              <select
                id="ord-status-sel"
                name="toStatus"
                defaultValue={order.status}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded shadow-md shadow-indigo-600/25 transition"
              >
                Update Status
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await enqueueCourierBookingAction({ orderId: order.id });
              }}
            >
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded shadow-md shadow-emerald-600/25 transition"
              >
                Queue Courier Booking
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
