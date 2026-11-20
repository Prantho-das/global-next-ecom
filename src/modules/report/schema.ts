import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { products } from "@/modules/catalog/schema";
import { coupons } from "@/modules/pricing/schema";

export const aggSalesDaily = pgTable(
  "agg_sales_daily",
  {
    id: text("id").primaryKey(),
    day: date("day").notNull(),
    ordersCount: integer("orders_count").notNull().default(0),
    revenue: integer("revenue").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    refundTotal: integer("refund_total").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("agg_sales_daily_day_idx").on(table.day)],
);

export const aggProductDaily = pgTable(
  "agg_product_daily",
  {
    id: text("id").primaryKey(),
    day: date("day").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    unitsSold: integer("units_sold").notNull().default(0),
    revenue: integer("revenue").notNull().default(0),
    costTotal: integer("cost_total").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_product_daily_pair_idx").on(table.day, table.productId),
  ],
);

export const aggCouponDaily = pgTable(
  "agg_coupon_daily",
  {
    id: text("id").primaryKey(),
    day: date("day").notNull(),
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    redemptions: integer("redemptions").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    revenueAttributed: integer("revenue_attributed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_coupon_daily_pair_idx").on(table.day, table.couponId),
  ],
);

export const aggCourierDaily = pgTable(
  "agg_courier_daily",
  {
    id: text("id").primaryKey(),
    day: date("day").notNull(),
    provider: text("provider").notNull(),
    shipped: integer("shipped").notNull().default(0),
    delivered: integer("delivered").notNull().default(0),
    returned: integer("returned").notNull().default(0),
    codCollected: integer("cod_collected").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agg_courier_daily_pair_idx").on(table.day, table.provider),
  ],
);

export const cronJobRuns = pgTable(
  "cron_job_runs",
  {
    id: text("id").primaryKey(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(),
    summary: jsonb("summary").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("cron_job_runs_name_idx").on(table.jobName, table.startedAt)],
);
