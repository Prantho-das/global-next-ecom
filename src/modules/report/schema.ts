import {
  date,
  index,
  int,
  json,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { products } from "@/modules/catalog/schema";
import { coupons } from "@/modules/pricing/schema";

export const aggSalesDaily = mysqlTable(
  "agg_sales_daily",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    day: date("day", { mode: "string" }).notNull(),
    ordersCount: int("orders_count").notNull().default(0),
    revenue: int("revenue").notNull().default(0),
    discountTotal: int("discount_total").notNull().default(0),
    shippingTotal: int("shipping_total").notNull().default(0),
    refundTotal: int("refund_total").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("agg_sales_daily_day_idx").on(table.day)],
);

export const aggProductDaily = mysqlTable(
  "agg_product_daily",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    day: date("day", { mode: "string" }).notNull(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    unitsSold: int("units_sold").notNull().default(0),
    revenue: int("revenue").notNull().default(0),
    costTotal: int("cost_total").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_product_daily_pair_idx").on(table.day, table.productId),
  ],
);

export const aggCouponDaily = mysqlTable(
  "agg_coupon_daily",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    day: date("day", { mode: "string" }).notNull(),
    couponId: varchar("coupon_id", { length: 191 })
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    redemptions: int("redemptions").notNull().default(0),
    discountAmount: int("discount_amount").notNull().default(0),
    revenueAttributed: int("revenue_attributed").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_coupon_daily_pair_idx").on(table.day, table.couponId),
  ],
);

export const aggCourierDaily = mysqlTable(
  "agg_courier_daily",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    day: date("day", { mode: "string" }).notNull(),
    provider: varchar("provider", { length: 191 }).notNull(),
    shipped: int("shipped").notNull().default(0),
    delivered: int("delivered").notNull().default(0),
    returned: int("returned").notNull().default(0),
    codCollected: int("cod_collected").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_courier_daily_pair_idx").on(table.day, table.provider),
  ],
);

export const cronJobRuns = mysqlTable(
  "cron_job_runs",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    jobName: varchar("job_name", { length: 191 }).notNull(),
    status: varchar("status", { length: 64 }).notNull(),
    summary: json("summary").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("cron_job_runs_name_idx").on(table.jobName, table.startedAt)],
);
