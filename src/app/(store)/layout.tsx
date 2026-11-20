import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/store/cart-drawer";
import { getSession } from "@/lib/auth";
import { getActiveCartView } from "@/modules/sales/queries";

export default async function StoreLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
  const sessionId = cookieStore.get("ecom_cart_sid")?.value ?? null;
  const userId = session?.user?.id ?? null;
  const cart = await getActiveCartView(sessionId, userId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header>
        <nav className="blue-grey darken-4" aria-label="Storefront navigation">
          <div className="nav-wrapper container">
            <Link href="/" className="brand-logo" style={{ fontSize: "1.35rem" }}>
              BD Shop
            </Link>
            <ul className="right">
              <li>
                <Link href="/products">Shop</Link>
              </li>
              <li>
                <Link href="/track">Track Order</Link>
              </li>
              <li>
                <Link href="/cart">
                  Cart ({cart.items.reduce((sum, i) => sum + i.qty, 0)})
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <CartDrawer items={cart.items} subtotal={cart.subtotal} />

      <footer className="page-footer blue-grey darken-4" style={{ marginTop: "48px" }}>
        <div className="container">
          <p className="white-text">
            All-in-One E-Commerce Bangladesh — Cash on Delivery Available
          </p>
        </div>
      </footer>
    </div>
  );
}
