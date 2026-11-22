import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";
import { products, purchaseOrders, variants } from "@/modules/catalog/schema";
import { shipments } from "@/modules/courier/schema";
import { fraudChecks } from "@/modules/fraud/schema";
import { abandonCartLogs } from "@/modules/marketing/schema";
import { couponRedemptions, coupons } from "@/modules/pricing/schema";
import { auditLogs } from "@/modules/rbac/schema";
import { aggSalesDaily } from "@/modules/report/schema";
import { computePeriodDelta } from "@/modules/report/service";
import {
  customers,
  orderItems,
  orders,
  payments,
} from "@/modules/sales/schema";

export const getDashboardKpisCached = unstable_cache(
  async () => {
    const db = getDb();
    const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    const [
      salesRows,
      aggRows,
      liveDailyRows,
      shipmentStats,
      statusRows,
      recentOrders,
      topProducts,
      lowStockRows,
      customerCountRows,
      productCountRows,
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
          revenue: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
        })
        .from(orders)
        .where(
          and(isNull(orders.deletedAt), sql`${orders.status} <> 'cancelled'`),
        ),
      db
        .select({
          day: aggSalesDaily.day,
          revenue: aggSalesDaily.revenue,
          ordersCount: aggSalesDaily.ordersCount,
        })
        .from(aggSalesDaily)
        .orderBy(asc(aggSalesDaily.day))
        .limit(14),
      db
        .select({
          day: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`,
          revenue: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
          ordersCount: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        })
        .from(orders)
        .where(
          and(
            isNull(orders.deletedAt),
            sql`${orders.status} <> 'cancelled'`,
            gte(orders.createdAt, fourteenDaysAgo),
          ),
        )
        .groupBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`)
        .orderBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`),
      db
        .select({
          total: sql<number>`CAST(COUNT(*) AS SIGNED)`,
          delivered: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${shipments.status} = 'delivered' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
        })
        .from(shipments),
      db
        .select({
          status: orders.status,
          count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        })
        .from(orders)
        .where(isNull(orders.deletedAt))
        .groupBy(orders.status),
      db
        .select({
          id: orders.id,
          number: orders.number,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(isNull(orders.deletedAt))
        .orderBy(desc(orders.createdAt))
        .limit(6),
      db
        .select({
          name: orderItems.nameSnapshot,
          units: sql<number>`CAST(COALESCE(SUM(${orderItems.qty}), 0) AS SIGNED)`,
          revenue: sql<number>`CAST(COALESCE(SUM(${orderItems.qty} * ${orderItems.priceSnapshot}), 0) AS SIGNED)`,
        })
        .from(orderItems)
        .groupBy(orderItems.nameSnapshot)
        .orderBy(desc(sql`SUM(${orderItems.qty} * ${orderItems.priceSnapshot})`))
        .limit(5),
      db
        .select({
          count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        })
        .from(variants)
        .where(and(isNull(variants.deletedAt), lte(variants.stock, 5))),
      db
        .select({
          count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        })
        .from(customers),
      db
        .select({
          count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        })
        .from(products)
        .where(and(isNull(products.deletedAt), eq(products.status, "active"))),
    ]);

    const totalOrders = salesRows[0]?.count ?? 0;
    const totalRevenue = salesRows[0]?.revenue ?? 0;
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const shipTotal = shipmentStats[0]?.total ?? 0;
    const shipDelivered = shipmentStats[0]?.delivered ?? 0;
    const deliveryRatePct =
      shipTotal > 0 ? Math.round((shipDelivered / shipTotal) * 100) : 0;

    const sparkline = aggRows.length > 0 ? aggRows : liveDailyRows;

    return {
      totalOrders,
      totalRevenue,
      aov,
      deliveryRatePct,
      sparkline,
      statusBreakdown: statusRows,
      recentOrders: recentOrders.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      topProducts,
      lowStockCount: lowStockRows[0]?.count ?? 0,
      customersCount: customerCountRows[0]?.count ?? 0,
      activeProductsCount: productCountRows[0]?.count ?? 0,
    };
  },
  ["admin-dashboard-kpis"],
  { revalidate: 60, tags: ["orders", "reports"] },
);

export async function getReportsSnapshot(opts: {
  from: Date;
  to: Date;
  compareFrom: Date;
  compareTo: Date;
}) {
  const db = getDb();
  const [
    currentSales,
    prevSales,
    inventoryVal,
    profitRows,
    couponStats,
    fraudStats,
    abandonStats,
    customerCounts,
    staffAudit,
  ] = await Promise.all([
    db
      .select({
        ordersCount: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        revenue: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          gte(orders.createdAt, opts.from),
          lte(orders.createdAt, opts.to),
        ),
      ),
    db
      .select({
        ordersCount: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        revenue: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          gte(orders.createdAt, opts.compareFrom),
          lte(orders.createdAt, opts.compareTo),
        ),
      ),
    db
      .select({
        units: sql<number>`CAST(COALESCE(SUM(${variants.stock}), 0) AS SIGNED)`,
        retailValue: sql<number>`CAST(COALESCE(SUM(${variants.stock} * ${variants.price}), 0) AS SIGNED)`,
      })
      .from(variants)
      .where(isNull(variants.deletedAt)),
    db
      .select({
        revenue: sql<number>`CAST(COALESCE(SUM(${orderItems.priceSnapshot} * ${orderItems.qty}), 0) AS SIGNED)`,
        cost: sql<number>`CAST(COALESCE(SUM(COALESCE(${variants.costPrice}, 0) * ${orderItems.qty}), 0) AS SIGNED)`,
      })
      .from(orderItems)
      .innerJoin(variants, sql`${orderItems.variantId} = ${variants.id}`),
    db
      .select({
        redemptions: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        discountTotal: sql<number>`CAST(COALESCE(SUM(${couponRedemptions.amount}), 0) AS SIGNED)`,
      })
      .from(couponRedemptions),
    db
      .select({
        total: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        held: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${fraudChecks.decision} = 'hold' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      })
      .from(fraudChecks),
    db
      .select({
        sent: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        recovered: sql<number>`CAST(COUNT(${abandonCartLogs.recoveredAt}) AS SIGNED)`,
      })
      .from(abandonCartLogs),
    db.select({ total: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(customers),
    db
      .select({
        actorId: auditLogs.actorId,
        actions: sql<number>`CAST(COUNT(*) AS SIGNED)`,
      })
      .from(auditLogs)
      .groupBy(auditLogs.actorId)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
  ]);

  const curRev = currentSales[0]?.revenue ?? 0;
  const prevRev = prevSales[0]?.revenue ?? 0;
  const profitRev = profitRows[0]?.revenue ?? 0;
  const profitCost = profitRows[0]?.cost ?? 0;

  return {
    salesComparison: computePeriodDelta(curRev, prevRev),
    ordersComparison: computePeriodDelta(
      currentSales[0]?.ordersCount ?? 0,
      prevSales[0]?.ordersCount ?? 0,
    ),
    inventoryValuation: inventoryVal[0] ?? { units: 0, retailValue: 0 },
    grossProfit: profitRev - profitCost,
    couponStats: couponStats[0] ?? { redemptions: 0, discountTotal: 0 },
    fraudStats: fraudStats[0] ?? { total: 0, held: 0 },
    abandonStats: abandonStats[0] ?? { sent: 0, recovered: 0 },
    totalCustomers: customerCounts[0]?.total ?? 0,
    staffActivity: staffAudit,
  };
}


export async function getDetailedReports(from: Date, to: Date) {
  const db = getDb();
  const [
    ordersByStatus,
    paymentsByMethod,
    topProducts,
    lowStockItems,
    purchaseRows,
    couponBreakdown,
    shipmentsByProvider,
  ] = await Promise.all([
    db
      .select({
        status: orders.status,
        count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        total: sql<number>`CAST(COALESCE(SUM(${orders.total}), 0) AS SIGNED)`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
        ),
      )
      .groupBy(orders.status),
    db
      .select({
        method: payments.method,
        count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        amount: sql<number>`CAST(COALESCE(SUM(${payments.amount}), 0) AS SIGNED)`,
      })
      .from(payments)
      .where(and(gte(payments.createdAt, from), lte(payments.createdAt, to)))
      .groupBy(payments.method),
    db
      .select({
        sku: orderItems.skuSnapshot,
        name: orderItems.nameSnapshot,
        units: sql<number>`CAST(COALESCE(SUM(${orderItems.qty}), 0) AS SIGNED)`,
        revenue: sql<number>`CAST(COALESCE(SUM(${orderItems.priceSnapshot} * ${orderItems.qty}), 0) AS SIGNED)`,
      })
      .from(orderItems)
      .where(and(gte(orderItems.createdAt, from), lte(orderItems.createdAt, to)))
      .groupBy(orderItems.skuSnapshot, orderItems.nameSnapshot)
      .orderBy(desc(sql`SUM(${orderItems.priceSnapshot} * ${orderItems.qty})`))
      .limit(20),
    db
      .select({
        sku: variants.sku,
        name: products.name,
        stock: variants.stock,
        price: variants.price,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(isNull(variants.deletedAt), lte(variants.stock, 5)))
      .orderBy(asc(variants.stock))
      .limit(20),
    db
      .select({
        poNumber: purchaseOrders.poNumber,
        supplierName: purchaseOrders.supplierName,
        totalCost: purchaseOrders.totalCost,
        receivedAt: purchaseOrders.receivedAt,
      })
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.receivedAt))
      .limit(30),
    db
      .select({
        code: coupons.code,
        uses: sql<number>`CAST(COUNT(${couponRedemptions.id}) AS SIGNED)`,
        discount: sql<number>`CAST(COALESCE(SUM(${couponRedemptions.amount}), 0) AS SIGNED)`,
      })
      .from(coupons)
      .leftJoin(couponRedemptions, eq(coupons.id, couponRedemptions.couponId))
      .groupBy(coupons.id, coupons.code)
      .limit(20),
    db
      .select({
        provider: shipments.provider,
        total: sql<number>`CAST(COUNT(*) AS SIGNED)`,
        codTotal: sql<number>`CAST(COALESCE(SUM(${shipments.codAmount}), 0) AS SIGNED)`,
        collected: sql<number>`CAST(COALESCE(SUM(${shipments.codCollected}), 0) AS SIGNED)`,
      })
      .from(shipments)
      .groupBy(shipments.provider),
  ]);

  return {
    ordersByStatus,
    paymentsByMethod,
    topProducts,
    lowStockItems,
    purchaseRows,
    couponBreakdown,
    shipmentsByProvider,
  };
}
