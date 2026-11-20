import { and, asc, desc, gte, isNull, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";
import { variants } from "@/modules/catalog/schema";
import { shipments } from "@/modules/courier/schema";
import { fraudChecks } from "@/modules/fraud/schema";
import { abandonCartLogs } from "@/modules/marketing/schema";
import { couponRedemptions } from "@/modules/pricing/schema";
import { auditLogs } from "@/modules/rbac/schema";
import { aggSalesDaily } from "@/modules/report/schema";
import { computePeriodDelta } from "@/modules/report/service";
import { customers, orderItems, orders } from "@/modules/sales/schema";

export const getDashboardKpisCached = unstable_cache(
  async () => {
    const db = getDb();
    const [salesRows, aggRows, shipmentStats] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
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
          total: sql<number>`count(*)::int`,
          delivered: sql<number>`count(*) filter (where ${shipments.status} = 'delivered')::int`,
        })
        .from(shipments),
    ]);

    const totalOrders = salesRows[0]?.count ?? 0;
    const totalRevenue = salesRows[0]?.revenue ?? 0;
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const shipTotal = shipmentStats[0]?.total ?? 0;
    const shipDelivered = shipmentStats[0]?.delivered ?? 0;
    const deliveryRatePct =
      shipTotal > 0 ? Math.round((shipDelivered / shipTotal) * 100) : 0;

    return {
      totalOrders,
      totalRevenue,
      aov,
      deliveryRatePct,
      sparkline: aggRows,
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
        ordersCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
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
        ordersCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
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
        units: sql<number>`coalesce(sum(${variants.stock}), 0)::int`,
        retailValue: sql<number>`coalesce(sum(${variants.stock} * ${variants.price}), 0)::int`,
      })
      .from(variants)
      .where(isNull(variants.deletedAt)),
    db
      .select({
        revenue: sql<number>`coalesce(sum(${orderItems.priceSnapshot} * ${orderItems.qty}), 0)::int`,
        cost: sql<number>`coalesce(sum(coalesce(${variants.costPrice}, 0) * ${orderItems.qty}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(variants, sql`${orderItems.variantId} = ${variants.id}`),
    db
      .select({
        redemptions: sql<number>`count(*)::int`,
        discountTotal: sql<number>`coalesce(sum(${couponRedemptions.amount}), 0)::int`,
      })
      .from(couponRedemptions),
    db
      .select({
        total: sql<number>`count(*)::int`,
        held: sql<number>`count(*) filter (where ${fraudChecks.decision} = 'hold')::int`,
      })
      .from(fraudChecks),
    db
      .select({
        sent: sql<number>`count(*)::int`,
        recovered: sql<number>`count(${abandonCartLogs.recoveredAt})::int`,
      })
      .from(abandonCartLogs),
    db.select({ total: sql<number>`count(*)::int` }).from(customers),
    db
      .select({
        actorId: auditLogs.actorId,
        actions: sql<number>`count(*)::int`,
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
