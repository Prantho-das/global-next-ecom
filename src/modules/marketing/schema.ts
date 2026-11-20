import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { products, variants } from "@/modules/catalog/schema";
import { users } from "@/modules/rbac/schema";
import { carts, orders } from "@/modules/sales/schema";

export interface SegmentRule {
  field: "spent" | "orders" | "last_order_days" | "category" | "city" | "tag";
  op: "gte" | "lte" | "eq" | "includes";
  value: string | number;
}

export const segments = pgTable("segments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rules: jsonb("rules").$type<SegmentRule[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campaignsMarketing = pgTable("campaigns_marketing", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  templateId: text("template_id"),
  segmentId: text("segment_id").references(() => segments.id, {
    onDelete: "set null",
  }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  stats: jsonb("stats").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const referrals = pgTable(
  "referrals",
  {
    id: text("id").primaryKey(),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredUserId: text("referred_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    status: text("status").notNull().default("active"),
    rewardAmount: integer("reward_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("referrals_code_idx").on(table.code)],
);

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    platform: text("platform").notNull(),
    eventId: text("event_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: text("status").notNull().default("sent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tracking_events_event_id_idx").on(table.eventId)],
);

export const productFeeds = pgTable("product_feeds", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("active"),
  lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const abandonCartLogs = pgTable(
  "abandon_cart_logs",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    couponCode: text("coupon_code"),
    contact: text("contact").notNull(),
    optedOut: boolean("opted_out").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("abandon_cart_logs_cart_idx").on(table.cartId)],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlists_pair_idx").on(table.userId, table.productId),
  ],
);

export const backInStockAlerts = pgTable(
  "back_in_stock_alerts",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    contact: text("contact").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("back_in_stock_variant_idx").on(table.variantId)],
);
