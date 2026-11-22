import {
  boolean,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { products, variants } from "@/modules/catalog/schema";
import { users } from "@/modules/rbac/schema";
import { carts, orders } from "@/modules/sales/schema";

export interface SegmentRule {
  field: "spent" | "orders" | "last_order_days" | "category" | "city" | "tag";
  op: "gte" | "lte" | "eq" | "includes";
  value: string | number;
}

export const segments = mysqlTable("segments", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  rules: json("rules")
    .$type<SegmentRule[]>()
    .notNull()
    .$defaultFn(() => []),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignsMarketing = mysqlTable("campaigns_marketing", {
  id: varchar("id", { length: 191 }).primaryKey(),
  channel: varchar("channel", { length: 64 }).notNull(),
  templateId: varchar("template_id", { length: 191 }),
  segmentId: varchar("segment_id", { length: 191 }).references(
    () => segments.id,
    { onDelete: "set null" },
  ),
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 64 }).notNull().default("draft"),
  stats: json("stats")
    .$type<Record<string, number>>()
    .$defaultFn(() => ({})),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referrals = mysqlTable(
  "referrals",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    referrerUserId: varchar("referrer_user_id", { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredUserId: varchar("referred_user_id", { length: 191 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    code: varchar("code", { length: 191 }).notNull(),
    status: varchar("status", { length: 64 }).notNull().default("active"),
    rewardAmount: int("reward_amount").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("referrals_code_idx").on(table.code)],
);

export const trackingEvents = mysqlTable(
  "tracking_events",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 }).references(() => orders.id, {
      onDelete: "cascade",
    }),
    platform: varchar("platform", { length: 64 }).notNull(),
    eventId: varchar("event_id", { length: 191 }).notNull(),
    sentAt: timestamp("sent_at"),
    status: varchar("status", { length: 64 }).notNull().default("sent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tracking_events_event_id_idx").on(table.eventId)],
);

export const productFeeds = mysqlTable("product_feeds", {
  id: varchar("id", { length: 191 }).primaryKey(),
  channel: varchar("channel", { length: 64 }).notNull(),
  url: text("url").notNull(),
  status: varchar("status", { length: 64 }).notNull().default("active"),
  lastGeneratedAt: timestamp("last_generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const abandonCartLogs = mysqlTable(
  "abandon_cart_logs",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    cartId: varchar("cart_id", { length: 191 })
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    stage: varchar("stage", { length: 64 }).notNull(),
    couponCode: varchar("coupon_code", { length: 191 }),
    contact: varchar("contact", { length: 191 }).notNull(),
    optedOut: boolean("opted_out").notNull().default(false),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    recoveredAt: timestamp("recovered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("abandon_cart_logs_cart_idx").on(table.cartId)],
);

export const wishlists = mysqlTable(
  "wishlists",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("user_id", { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlists_pair_idx").on(table.userId, table.productId),
  ],
);

export const backInStockAlerts = mysqlTable(
  "back_in_stock_alerts",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    variantId: varchar("variant_id", { length: 191 })
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    contact: varchar("contact", { length: 191 }).notNull(),
    notifiedAt: timestamp("notified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("back_in_stock_variant_idx").on(table.variantId)],
);
