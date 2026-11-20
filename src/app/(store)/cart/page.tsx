import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { getSession } from "@/lib/auth";
import { formatBdt } from "@/lib/money";
import { getActiveCartView } from "@/modules/sales/queries";

export const metadata: Metadata = {
  title: "Shopping Cart | BD Shop",
};

export default async function CartPage() {
  const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);

  return (
    <main className="container" style={{ paddingTop: "24px" }}>
      <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>Shopping Cart</h1>
      {cart.items.length === 0 ? (
        <div className="card-panel white">
          <p className="grey-text">Your cart is empty.</p>
          <Link href="/products" className="btn waves-effect waves-light">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="card-panel white">
          <table className="striped responsive-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.variantId}>
                  <td>
                    <Link href={`/products/${item.productSlug}`}>
                      {item.productName}
                    </Link>
                  </td>
                  <td>{item.sku}</td>
                  <td>{item.qty}</td>
                  <td>{formatBdt(item.unitPrice)}</td>
                  <td>{formatBdt(item.unitPrice * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <strong style={{ fontSize: "1.25rem" }}>
              Subtotal: {formatBdt(cart.subtotal)}
            </strong>
            <Link href="/checkout" className="btn waves-effect waves-light">
              Proceed to Checkout (COD)
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
