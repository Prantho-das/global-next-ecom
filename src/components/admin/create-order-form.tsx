"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import type { InventoryVariantRow } from "@/modules/catalog/queries";
import { createAdminOrderAction } from "@/modules/order/actions";

export interface CreateOrderFormProps {
  variants: readonly InventoryVariantRow[];
}

interface OrderLineDraft {
  variantId: string;
  productName: string;
  sku: string;
  price: number;
  maxStock: number;
  qty: number;
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function CreateOrderForm({ variants }: CreateOrderFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("Dhanmondi");
  const [line, setLine] = useState("");

  const [selectedVariantId, setSelectedVariantId] = useState(
    variants.find((v) => v.stock > 0)?.variantId ?? variants[0]?.variantId ?? "",
  );
  const [addQty, setAddQty] = useState("1");
  const [lines, setLines] = useState<OrderLineDraft[]>([]);

  const [shippingTaka, setShippingTaka] = useState("60");
  const [discountTaka, setDiscountTaka] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "cash" | "bkash" | "nagad" | "sslcommerz"
  >("cod");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">(
    "pending",
  );
  const [status, setStatus] = useState<"pending" | "confirmed" | "processing">(
    "confirmed",
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLineItem() {
    const v = variants.find((item) => item.variantId === selectedVariantId);
    if (v === undefined) return;
    const qty = Math.max(1, Number.parseInt(addQty || "1", 10) || 1);
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === v.variantId);
      if (existing !== undefined) {
        return prev.map((l) =>
          l.variantId === v.variantId ? { ...l, qty: l.qty + qty } : l,
        );
      }
      const optLabel = Object.values(v.optionValues).join(" / ");
      return [
        ...prev,
        {
          variantId: v.variantId,
          productName: optLabel ? `${v.productName} (${optLabel})` : v.productName,
          sku: v.sku,
          price: v.price,
          maxStock: v.stock,
          qty,
        },
      ];
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const shippingPoisha = Math.round(
    (Number.parseFloat(shippingTaka || "0") || 0) * 100,
  );
  const discountPoisha = Math.round(
    (Number.parseFloat(discountTaka || "0") || 0) * 100,
  );
  const total = Math.max(0, subtotal - discountPoisha + shippingPoisha);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setError("Add at least one product to the order.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createAdminOrderAction({
      customerName,
      customerPhone,
      division,
      district,
      thana,
      line,
      items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
      shippingFee: shippingPoisha,
      discountTotal: discountPoisha,
      paymentMethod,
      paymentStatus,
      status,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/admin/orders/${res.data.orderId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error !== null && (
        <div
          role="alert"
          className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              1. Add Products
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 items-center">
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className={`${INPUT_CLS} min-w-0`}
              >
                {variants.length === 0 ? (
                  <option value="">No products available</option>
                ) : (
                  variants.map((v) => {
                    const opt = Object.values(v.optionValues).join(" / ");
                    return (
                      <option key={v.variantId} value={v.variantId}>
                        {v.productName} {opt ? `(${opt})` : ""} — {v.sku} —{" "}
                        {formatBdt(v.price)} [Stock: {v.stock}]
                      </option>
                    );
                  })
                )}
              </select>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full sm:w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-center"
              />
              <button
                type="button"
                onClick={addLineItem}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded whitespace-nowrap h-[34px]"
              >
                + Add Item
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded">
                No products added yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Line Total</th>
                      <th className="py-2 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {lines.map((l) => (
                      <tr key={l.variantId}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">
                            {l.productName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {l.sku} • {formatBdt(l.price)}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={1}
                            max={l.maxStock}
                            value={l.qty}
                            onChange={(e) => {
                              const nextQty = Math.max(
                                1,
                                Number.parseInt(e.target.value || "1", 10) || 1,
                              );
                              setLines((prev) =>
                                prev.map((item) =>
                                  item.variantId === l.variantId
                                    ? { ...item, qty: nextQty }
                                    : item,
                                ),
                              );
                            }}
                            className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {formatBdt(l.price * l.qty)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter(
                                  (item) => item.variantId !== l.variantId,
                                ),
                              )
                            }
                            className="text-rose-600 hover:underline font-semibold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              2. Customer &amp; Shipping Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="Karim Ahmed"
                  className={INPUT_CLS}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>BD Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="01712345678"
                  className={INPUT_CLS}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Division</label>
                <input
                  type="text"
                  required
                  className={INPUT_CLS}
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>District</label>
                <input
                  type="text"
                  required
                  className={INPUT_CLS}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Thana / Area</label>
                <input
                  type="text"
                  required
                  className={INPUT_CLS}
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="House 12, Road 4"
                  className={INPUT_CLS}
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              3. Payment &amp; Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Shipping Fee (৳)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={INPUT_CLS}
                  value={shippingTaka}
                  onChange={(e) => setShippingTaka(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Discount (৳)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={INPUT_CLS}
                  value={discountTaka}
                  onChange={(e) => setDiscountTaka(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Payment Method</label>
                <select
                  className={INPUT_CLS}
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as
                        | "cod"
                        | "cash"
                        | "bkash"
                        | "nagad"
                        | "sslcommerz",
                    )
                  }
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="cash">Cash (POS)</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="sslcommerz">SSLCommerz</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Payment Status</label>
                <select
                  className={INPUT_CLS}
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as "pending" | "paid")
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Initial Order Status</label>
              <select
                className={INPUT_CLS}
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "pending" | "confirmed" | "processing",
                  )
                }
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Order Note (Optional)</label>
              <input
                type="text"
                placeholder="Phone order / delivery note"
                className={INPUT_CLS}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatBdt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping</span>
                <span>{formatBdt(shippingPoisha)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{formatBdt(discountPoisha)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
                <span>Total</span>
                <span>{formatBdt(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded shadow-sm transition"
            >
              {saving ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
