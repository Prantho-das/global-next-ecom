"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import {
  adjustStockAction,
  createPurchaseOrderAction,
} from "@/modules/catalog/actions";
import type { InventoryVariantRow } from "@/modules/catalog/queries";
import type { StockMovementRow } from "@/modules/catalog/types";

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierPhone: string | null;
  status: string;
  totalCost: number;
  receivedAt: string;
}

export interface StockManagerProps {
  initialInventory: readonly InventoryVariantRow[];
  initialMovements: readonly StockMovementRow[];
  initialPurchases: readonly PurchaseOrderSummary[];
}

interface PoLineDraft {
  variantId: string;
  label: string;
  sku: string;
  qty: number;
  unitCostPoisha: number;
}

const LOW_STOCK_LIMIT = 5;
const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function StockManager({
  initialInventory,
  initialMovements,
  initialPurchases,
}: StockManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"purchase" | "inventory" | "logs">("purchase");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">(
    "all",
  );

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [poNote, setPoNote] = useState("");
  const [pickVariantId, setPickVariantId] = useState(
    initialInventory[0]?.variantId ?? "",
  );
  const [pickQty, setPickQty] = useState("10");
  const [pickCostTaka, setPickCostTaka] = useState("0");
  const [poLines, setPoLines] = useState<PoLineDraft[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPo, setSavingPo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const totalSkus = initialInventory.length;
  const totalUnits = initialInventory.reduce((s, r) => s + r.stock, 0);
  const lowStockCount = initialInventory.filter(
    (r) => r.stock > 0 && r.stock <= LOW_STOCK_LIMIT,
  ).length;
  const outOfStockCount = initialInventory.filter((r) => r.stock === 0).length;

  const filtered = initialInventory.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      row.productName.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (stockFilter === "out") return row.stock === 0;
    if (stockFilter === "low")
      return row.stock > 0 && row.stock <= LOW_STOCK_LIMIT;
    if (stockFilter === "in") return row.stock > LOW_STOCK_LIMIT;
    return true;
  });

  function addPoLine() {
    const v = initialInventory.find((i) => i.variantId === pickVariantId);
    if (v === undefined) return;
    const qty = Math.max(1, Number.parseInt(pickQty || "1", 10) || 1);
    const unitCostPoisha = Math.round(
      (Number.parseFloat(pickCostTaka || "0") || 0) * 100,
    );
    const optLabel = Object.values(v.optionValues).join(" / ");
    const label = optLabel ? `${v.productName} (${optLabel})` : v.productName;

    setPoLines((prev) => {
      const existing = prev.find((l) => l.variantId === v.variantId);
      if (existing !== undefined) {
        return prev.map((l) =>
          l.variantId === v.variantId
            ? { ...l, qty: l.qty + qty, unitCostPoisha }
            : l,
        );
      }
      return [
        ...prev,
        { variantId: v.variantId, label, sku: v.sku, qty, unitCostPoisha },
      ];
    });
  }

  const poTotalCost = poLines.reduce(
    (s, l) => s + l.qty * l.unitCostPoisha,
    0,
  );

  async function handleSubmitPo(e: FormEvent) {
    e.preventDefault();
    if (poLines.length === 0) {
      setError("Add at least one item to the purchase order.");
      return;
    }
    setSavingPo(true);
    setError(null);
    setSuccessMsg(null);
    const res = await createPurchaseOrderAction({
      supplierName,
      supplierPhone: supplierPhone.trim() || undefined,
      note: poNote.trim() || undefined,
      items: poLines.map((l) => ({
        variantId: l.variantId,
        qty: l.qty,
        unitCost: l.unitCostPoisha,
      })),
    });
    setSavingPo(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const savedTotal = poTotalCost;
    setSupplierName("");
    setSupplierPhone("");
    setPoNote("");
    setPoLines([]);
    setSuccessMsg(
      `Purchase received (${formatBdt(savedTotal)}). Stock updated!`,
    );
    router.refresh();
  }

  async function applyAdjustment(
    variantId: string,
    deltaVal: number,
    reason: string,
    refType: "manual" | "restock" | "return",
  ) {
    setBusyId(variantId);
    setError(null);
    setSuccessMsg(null);
    const res = await adjustStockAction({
      variantId,
      delta: deltaVal,
      reason,
      refType,
      refId: "admin",
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSuccessMsg(
      `Stock updated (${deltaVal > 0 ? `+${deltaVal}` : deltaVal}).`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total SKUs
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {totalSkus}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            <i className="ti ti-box" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Units
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {totalUnits}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <i className="ti ti-package" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Low Stock (≤{LOW_STOCK_LIMIT})
            </div>
            <div className="text-2xl font-extrabold text-amber-500 mt-0.5">
              {lowStockCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i className="ti ti-alert-triangle" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Out of Stock
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {outOfStockCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
            <i className="ti ti-circle-x" />
          </div>
        </div>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          {error}
        </div>
      )}
      {successMsg !== null && (
        <div
          role="status"
          className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
        >
          {successMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="px-4 flex items-center gap-6 border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setTab("purchase")}
            className={`py-3 border-b-2 text-xs font-semibold transition ${
              tab === "purchase"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Purchase Order (Stock-In)
          </button>
          <button
            type="button"
            onClick={() => setTab("inventory")}
            className={`py-3 border-b-2 text-xs font-semibold transition ${
              tab === "inventory"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Live Inventory ({initialInventory.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("logs")}
            className={`py-3 border-b-2 text-xs font-semibold transition ${
              tab === "logs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Movement Log ({initialMovements.length})
          </button>
        </div>

        {tab === "purchase" && (
          <div className="p-4 space-y-4">
            <form onSubmit={handleSubmitPo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL_CLS}>Supplier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhaka Textile Ltd."
                    className={INPUT_CLS}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Supplier Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="017..."
                    className={INPUT_CLS}
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Reference / Note</label>
                  <input
                    type="text"
                    placeholder="Invoice # / Batch"
                    className={INPUT_CLS}
                    value={poNote}
                    onChange={(e) => setPoNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Add Items to Purchase Order
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className={LABEL_CLS}>Product &amp; SKU</label>
                    <select
                      value={pickVariantId}
                      onChange={(e) => setPickVariantId(e.target.value)}
                      className={INPUT_CLS}
                    >
                      {initialInventory.map((v) => {
                        const opt = Object.values(v.optionValues).join(" / ");
                        return (
                          <option key={v.variantId} value={v.variantId}>
                            {v.productName} {opt ? `(${opt})` : ""} — {v.sku}{" "}
                            [Stock: {v.stock}]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Qty</label>
                    <input
                      type="number"
                      min={1}
                      className={INPUT_CLS}
                      value={pickQty}
                      onChange={(e) => setPickQty(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Unit Cost (৳)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={INPUT_CLS}
                      value={pickCostTaka}
                      onChange={(e) => setPickCostTaka(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={addPoLine}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                {poLines.length > 0 && (
                  <div className="overflow-x-auto bg-white border border-slate-200 rounded">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3">Unit Cost</th>
                          <th className="py-2 px-3">Line Total</th>
                          <th className="py-2 px-3 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {poLines.map((l) => (
                          <tr key={l.variantId}>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {l.label}{" "}
                              <span className="text-slate-400 font-mono">
                                ({l.sku})
                              </span>
                            </td>
                            <td className="py-2 px-3">{l.qty}</td>
                            <td className="py-2 px-3">
                              {formatBdt(l.unitCostPoisha)}
                            </td>
                            <td className="py-2 px-3 font-semibold">
                              {formatBdt(l.qty * l.unitCostPoisha)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setPoLines((p) =>
                                    p.filter(
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

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-900">
                  Purchase Total:{" "}
                  <span className="text-indigo-600">
                    {formatBdt(poTotalCost)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={savingPo}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {savingPo
                    ? "Receiving Stock..."
                    : "Receive Purchase & Add Stock"}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 mt-0">
                Recent Purchase Orders ({initialPurchases.length})
              </h4>
              {initialPurchases.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No purchase orders recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">PO #</th>
                        <th className="py-2 px-3">Supplier</th>
                        <th className="py-2 px-3">Total Cost</th>
                        <th className="py-2 px-3 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {initialPurchases.map((po) => (
                        <tr key={po.id}>
                          <td className="py-2 px-3 font-bold text-indigo-600">
                            {po.poNumber}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {po.supplierName}
                          </td>
                          <td className="py-2 px-3 font-semibold">
                            {formatBdt(po.totalCost)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {po.receivedAt.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "inventory" && (
          <div>
            <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Search product or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm w-60"
              />
              <select
                value={stockFilter}
                onChange={(e) =>
                  setStockFilter(
                    e.target.value as "all" | "in" | "low" | "out",
                  )
                }
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm"
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock (≤{LOW_STOCK_LIMIT})</option>
                <option value="out">Out of Stock</option>
                <option value="in">Healthy (&gt;{LOW_STOCK_LIMIT})</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Cost</th>
                    <th className="py-2.5 px-4">Available</th>
                    <th className="py-2.5 px-4 text-right">Quick Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filtered.map((row) => (
                    <tr key={row.variantId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {row.productName}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                        {row.sku}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">
                        {row.costPrice !== null
                          ? formatBdt(row.costPrice)
                          : "—"}
                      </td>
                      <td className="py-2.5 px-4 font-bold">{row.stock}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={busyId === row.variantId || row.stock === 0}
                            onClick={() =>
                              void applyAdjustment(
                                row.variantId,
                                -1,
                                "Manual adjustment",
                                "manual",
                              )
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.variantId}
                            onClick={() =>
                              void applyAdjustment(
                                row.variantId,
                                1,
                                "Restock",
                                "restock",
                              )
                            }
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold"
                          >
                            +1
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Delta</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {initialMovements.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {row.productName}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                      {row.sku}
                    </td>
                    <td className="py-2.5 px-4 font-bold">
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                    <td className="py-2.5 px-4">{row.reason}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-400">
                      {row.refType}:{row.refId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
