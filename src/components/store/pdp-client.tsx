"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  imageId?: string | null;
  isDefault: boolean;
}

export interface PdpImage {
  id: string;
  url: string;
  alt: string;
}

export interface PdpClientProps {
  productName: string;
  brandName?: string | null;
  description: string;
  images: readonly PdpImage[];
  variants: readonly PdpVariant[];
  salePrice: number | null;
}

export function PdpClient({
  productName,
  brandName,
  description,
  images,
  variants,
  salePrice,
}: PdpClientProps) {
  const router = useRouter();
  const defaultVariant =
    variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState<string>(
    defaultVariant?.id ?? "",
  );
  const [activeImageId, setActiveImageId] = useState<string>(
    defaultVariant?.imageId ?? images[0]?.id ?? "",
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;

  useEffect(() => {
    if (selected?.imageId) {
      setActiveImageId(selected.imageId);
    }
  }, [selected?.id, selected?.imageId]);

  const activeImage =
    images.find((im) => im.id === activeImageId) ?? images[0] ?? null;

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
    <div className="row">
      <div className="col s12 m6">
        <div className="card-panel white">
          {activeImage === null ? (
            <p className="grey-text">No product images uploaded.</p>
          ) : (
            <div>
              <div
                style={{
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                <img
                  src={activeImage.url}
                  alt={activeImage.alt || productName}
                  style={{
                    width: "100%",
                    maxHeight: "420px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
              {images.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {images.map((img) => {
                    const isActive = img.id === activeImage.id;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImageId(img.id)}
                        style={{
                          padding: 0,
                          width: "64px",
                          height: "64px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          border: isActive
                            ? "2px solid #4F46E5"
                            : "1px solid #cbd5e1",
                          background: "#fff",
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.alt || productName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="col s12 m6">
        <div className="card-panel white">
          <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>{productName}</h1>
          {brandName && <p className="grey-text">Brand: {brandName}</p>}

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
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            {outOfStock
              ? "Out of Stock"
              : `In Stock (${selected.stock} available)`}
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <input
              type="number"
              min={1}
              max={Math.max(1, selected.stock)}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Number.parseInt(e.target.value || "1", 10)))
              }
              aria-label="Quantity"
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
            <p
              role="status"
              style={{
                fontWeight: 600,
                color: feedback === "Added to cart" ? "#2e7d32" : "#c62828",
              }}
            >
              {feedback}
            </p>
          )}

          <p style={{ marginTop: "16px" }}>{description}</p>
        </div>
      </div>
    </div>
  );
}
