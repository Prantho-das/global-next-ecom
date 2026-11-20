import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuestConvertForm } from "@/components/store/guest-convert-form";
import { formatBdt } from "@/lib/money";
import { getOrderSuccessSummary } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "Order Confirmed | BD Shop",
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const data = await getOrderSuccessSummary(decodeURIComponent(number));
  if (data === null) {
    notFound();
  }

  const { order, items } = data;

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <div className="card-panel green lighten-5">
        <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>
          Order Confirmed: {order.number}
        </h1>
        <p>
          Payment Method: Cash on Delivery | Estimated Delivery: 2-4 business
          days
        </p>
      </div>

      <div className="row">
        <div className="col s12 m7">
          <div className="card-panel white">
            <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>Order Summary</h2>
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
              Total: <strong>{formatBdt(order.total)}</strong>
            </p>
            <Link
              href={`/track?phone=${encodeURIComponent(order.customerPhone)}&order=${encodeURIComponent(order.number)}`}
              className="btn-flat"
            >
              Track this order
            </Link>
          </div>
        </div>

        {order.isGuest && (
          <div className="col s12 m5">
            <GuestConvertForm
              orderNumber={order.number}
              phone={order.customerPhone}
            />
          </div>
        )}
      </div>
    </main>
  );
}
