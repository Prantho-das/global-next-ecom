import { formatBdt } from "@/lib/money";
import type { ShippingAddressSnapshot } from "@/modules/sales/schema";

export interface PrintableOrder {
  number: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: ShippingAddressSnapshot;
  createdAt: Date;
  items: ReadonlyArray<{
    nameSnapshot: string;
    skuSnapshot: string;
    qty: number;
    priceSnapshot: number;
  }>;
}

export function renderInvoiceHtml(
  ordersList: readonly PrintableOrder[],
  mode: "invoice" | "packing_slip",
): string {
  const blocks = ordersList
    .map((order) => {
      const rows = order.items
        .map(
          (item) =>
            `<tr>
              <td>${item.nameSnapshot}</td>
              <td>${item.skuSnapshot}</td>
              <td>${item.qty}</td>
              ${mode === "invoice" ? `<td>${formatBdt(item.priceSnapshot)}</td><td>${formatBdt(item.priceSnapshot * item.qty)}</td>` : ""}
            </tr>`,
        )
        .join("");

      const totalsBlock =
        mode === "invoice"
          ? `<div class="totals">
              <p>Subtotal: ${formatBdt(order.subtotal)}</p>
              <p>Discount: -${formatBdt(order.discountTotal)}</p>
              <p>Shipping: ${formatBdt(order.shippingFee)}</p>
              <p><strong>Total: ${formatBdt(order.total)}</strong></p>
            </div>`
          : "";

      return `<section class="sheet">
        <h1>${mode === "invoice" ? "INVOICE" : "PACKING SLIP"} — ${order.number}</h1>
        <p><strong>Customer:</strong> ${order.shippingAddress.name} (${order.shippingAddress.phone})</p>
        <p><strong>Address:</strong> ${order.shippingAddress.line}, ${order.shippingAddress.thana}, ${order.shippingAddress.district}, ${order.shippingAddress.division}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Qty</th>
              ${mode === "invoice" ? "<th>Price</th><th>Total</th>" : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${totalsBlock}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${mode === "invoice" ? "Invoices" : "Packing Slips"}</title>
  <style>
    body { font-family: sans-serif; color: #111; margin: 24px; }
    .sheet { page-break-after: always; border: 1px solid #ddd; padding: 20px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .totals { margin-top: 16px; text-align: right; }
  </style>
</head>
<body>${blocks}</body>
</html>`;
}
