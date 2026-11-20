"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatBdt } from "@/lib/money";
import { addToCartAction } from "@/modules/sales/actions";
import { computeFlatUnitPrice } from "@/modules/sales/service";

export interface PdpVariant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  optionValues: Record<string, string>;
  isDefault: boolean;
}

export interface PdpClientProps {
  variants: readonly PdpVariant[];
  salePrice: number | null;
}

export function PdpClient({ variants, salePrice }: PdpClientProps) {
  const router = useRouter();
  const defaultVariant =
    variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState<string>(
    defaultVariant?.id ?? "",
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;
  if (selected === null) {
    return <p className="red-text">Currently unavailable.</p>;
  }

  const effectivePrice = computeFlatUnitPrice(selected.price, salePrice);
  const outOfStock = selected.stock <= 0;

  async function handleAdd() {
    if (selected === null) {
      return;
    }
    setLoading(true);
    setFeedback(null);
    const res = await addToCartAction({ variantId: selected.id, qty });
    setLoading(false);
    if (!res.ok) {
      setFeedback(res.message);
      return;
    }
    setFeedback("Added to cart");
    router.refresh();
  }

  return (
    <div>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "12px 0" }}>
        {formatBdt(effectivePrice)}
        {selected.compareAtPrice !== null &&
          selected.compareAtPrice > effectivePrice && (
            <span
              className="grey-text"
              style={{
                textDecoration: "line-through",
                fontSize: "1rem",
                marginLeft: "8px",
              }}
            >
              {formatBdt(selected.compareAtPrice)}
            </span>
          )}
      </p>

      {variants.length > 1 && (
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="pdp-variant">Select Variant</label>
          <select
            id="pdp-variant"
            className="browser-default"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {Object.values(v.optionValues).join(" / ") || v.sku} —{" "}
                {formatBdt(computeFlatUnitPrice(v.price, salePrice))}
              </option>
            ))}
          </select>
        </div>
      )}

      <p
        style={{
          color: outOfStock ? "#c62828" : "#2e7d32",
          fontWeight: 500,
        }}
      >
        {outOfStock
          ? "Out of stock"
          : selected.stock <= 5
            ? `Only ${selected.stock} left in stock`
            : `In stock (${selected.stock} available)`}
      </p>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <input
          type="number"
          aria-label="Quantity"
          min={1}
          max={Math.max(1, selected.stock)}
          value={qty}
          onChange={(e) =>
            setQty(Math.max(1, Number.parseInt(e.target.value || "1", 10)))
          }
          style={{ width: "80px" }}
        />
        <button
          type="button"
          className="btn waves-effect waves-light"
          disabled={outOfStock || loading}
          onClick={handleAdd}
        >
          {loading ? "Adding..." : "Add to Cart"}
        </button>
      </div>

      {feedback !== null && (
        <p role="status" style={{ marginTop: "8px" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
