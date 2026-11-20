"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { adjustStockAction } from "@/modules/catalog/actions";
import type { StockMovementRow } from "@/modules/catalog/types";

export interface StockManagerProps {
  initialMovements: readonly StockMovementRow[];
}

export function StockManager({ initialMovements }: StockManagerProps) {
  const router = useRouter();
  const [variantId, setVariantId] = useState("");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("Manual adjustment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await adjustStockAction({
      variantId: variantId.trim(),
      delta: Number.parseInt(delta, 10),
      reason,
      refType: "manual",
      refId: "admin",
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setVariantId("");
    setDelta("1");
    router.refresh();
  }

  return (
    <div className="row">
      <div className="col s12 m4">
        <div className="card white">
          <div className="card-content">
            <span className="card-title">Adjust Stock</span>
            {error !== null && (
              <div role="alert" className="red-text">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="input-field">
                <label htmlFor="stock-variant-id" className="active">
                  Variant ID
                </label>
                <input
                  id="stock-variant-id"
                  type="text"
                  required
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="stock-delta" className="active">
                  Delta (+/-)
                </label>
                <input
                  id="stock-delta"
                  type="number"
                  required
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
              </div>
              <div className="input-field">
                <label htmlFor="stock-reason" className="active">
                  Reason
                </label>
                <input
                  id="stock-reason"
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn waves-effect waves-light"
                disabled={loading}
              >
                {loading ? "Applying..." : "Update Stock"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col s12 m8">
        <div className="card white">
          <div className="card-content">
            <span className="card-title">Stock Movement Log</span>
            {initialMovements.length === 0 ? (
              <p className="grey-text">No stock movements recorded yet.</p>
            ) : (
              <table className="striped responsive-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Delta</th>
                    <th>Reason</th>
                    <th>Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {initialMovements.map((row) => (
                    <tr key={row.id}>
                      <td>{row.productName}</td>
                      <td>{row.sku}</td>
                      <td>{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                      <td>{row.reason}</td>
                      <td>
                        {row.refType}:{row.refId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
