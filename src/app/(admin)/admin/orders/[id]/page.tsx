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
    <section aria-labelledby="order-detail-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1
          id="order-detail-heading"
          style={{ fontSize: "1.75rem", margin: 0 }}
        >
          Order {order.number}
        </h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/admin/orders/print?id=${encodeURIComponent(order.id)}&mode=invoice`}
            className="btn-small"
          >
            Print Invoice
          </Link>
          <Link
            href={`/admin/orders/print?id=${encodeURIComponent(order.id)}&mode=packing_slip`}
            className="btn-small"
          >
            Packing Slip
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col s12 m7">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Items</span>
              <ul className="collection">
                {items.map((item) => (
                  <li key={item.id} className="collection-item">
                    {item.nameSnapshot} ({item.skuSnapshot}) × {item.qty}
                    <span className="right">
                      {formatBdt(item.priceSnapshot * item.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                Total: <strong>{formatBdt(order.total)}</strong> (Status:{" "}
                <strong>{order.status}</strong>)
              </p>
            </div>
          </div>

          <div className="card white">
            <div className="card-content">
              <span className="card-title">Timeline</span>
              <ul className="collection">
                {events.map((ev) => (
                  <li key={ev.id} className="collection-item">
                    <strong>{ev.toStatus}</strong> by {ev.actor}
                    {ev.note !== null ? ` — ${ev.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col s12 m5">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Actions</span>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const toStatus = String(formData.get("toStatus") ?? "");
                  await transitionOrderAction({
                    orderId: order.id,
                    toStatus,
                  });
                }}
              >
                <label htmlFor="ord-status-sel">Transition Status</label>
                <select
                  id="ord-status-sel"
                  name="toStatus"
                  className="browser-default"
                  defaultValue={order.status}
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn"
                  style={{ marginTop: "12px", width: "100%" }}
                >
                  Update Status
                </button>
              </form>

              <form
                style={{ marginTop: "16px" }}
                action={async () => {
                  "use server";
                  await enqueueCourierBookingAction({ orderId: order.id });
                }}
              >
                <button
                  type="submit"
                  className="btn teal"
                  style={{ width: "100%" }}
                >
                  Queue Courier Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
