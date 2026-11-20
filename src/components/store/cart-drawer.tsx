"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatBdt } from "@/lib/money";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/sales/actions";
import type { CartViewItem } from "@/modules/sales/queries";

export interface CartDrawerProps {
  items: readonly CartViewItem[];
  subtotal: number;
}

export function CartDrawer({ items, subtotal }: CartDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeQty(variantId: string, qty: number) {
    setBusyId(variantId);
    await updateCartItemAction({ variantId, qty });
    setBusyId(null);
    router.refresh();
  }

  async function removeItem(variantId: string) {
    setBusyId(variantId);
    await removeCartItemAction({ variantId });
    setBusyId(null);
    router.refresh();
  }

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <>
      <button
        type="button"
        aria-label="Open cart drawer"
        className="btn-floating btn-large waves-effect waves-light teal"
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 900 }}
        onClick={() => setOpen(true)}
      >
        {totalCount}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "360px",
            maxWidth: "100vw",
            backgroundColor: "#ffffff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "12px",
            }}
          >
            <strong style={{ fontSize: "1.125rem" }}>
              Your Cart ({totalCount})
            </strong>
            <button
              type="button"
              className="btn-flat"
              aria-label="Close cart drawer"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
            {items.length === 0 ? (
              <p className="grey-text">Your cart is empty.</p>
            ) : (
              <ul className="collection">
                {items.map((item) => (
                  <li key={item.variantId} className="collection-item">
                    <div>
                      <strong>{item.productName}</strong>
                    </div>
                    <div className="grey-text" style={{ fontSize: "0.85rem" }}>
                      {item.sku} — {formatBdt(item.unitPrice)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      <button
                        type="button"
                        className="btn-small"
                        disabled={busyId === item.variantId}
                        onClick={() => changeQty(item.variantId, item.qty - 1)}
                      >
                        -
                      </button>
                      <span>{item.qty}</span>
                      <button
                        type="button"
                        className="btn-small"
                        disabled={busyId === item.variantId}
                        onClick={() => changeQty(item.variantId, item.qty + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn-flat red-text"
                        disabled={busyId === item.variantId}
                        onClick={() => removeItem(item.variantId)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <strong>Subtotal</strong>
              <strong>{formatBdt(subtotal)}</strong>
            </div>
            <Link
              href="/checkout"
              className="btn waves-effect waves-light"
              style={{ width: "100%" }}
              onClick={() => setOpen(false)}
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
