import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "@/modules/rbac/schema";
import { orders } from "@/modules/sales/schema";

export const campaigns = mysqlTable(
  "campaigns",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    priority: int("priority").notNull().default(0),
    status: varchar("status", { length: 64 }).notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("campaigns_status_window_idx").on(
      table.status,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export const campaignTargets = mysqlTable(
  "campaign_targets",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 191 })
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 64 }).notNull(),
    targetId: varchar("target_id", { length: 191 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("campaign_targets_campaign_idx").on(table.campaignId)],
);

export const campaignRules = mysqlTable(
  "campaign_rules",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    campaignId: varchar("campaign_id", { length: 191 }).references(
      () => campaigns.id,
      { onDelete: "cascade" },
    ),
    discountType: varchar("discount_type", { length: 64 }).notNull(),
    value: int("value").notNull(),
    maxDiscount: int("max_discount"),
    stockCap: int("stock_cap"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("campaign_rules_campaign_idx").on(table.campaignId)],
);

export const specialDays = mysqlTable(
  "special_days",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    banner: text("banner"),
    ruleId: varchar("rule_id", { length: 191 })
      .notNull()
      .references(() => campaignRules.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("special_days_window_idx").on(table.startsAt, table.endsAt)],
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    code: varchar("code", { length: 191 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    value: int("value").notNull(),
    minCart: int("min_cart").notNull().default(0),
    maxDiscount: int("max_discount"),
    usageLimit: int("usage_limit"),
    perUserLimit: int("per_user_limit"),
    startsAt: timestamp("starts_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    scope: varchar("scope", { length: 64 }).notNull().default("all"),
    stackable: boolean("stackable").notNull().default(true),
    status: varchar("status", { length: 64 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("coupons_code_idx").on(table.code)],
);

export const couponTargets = mysqlTable(
  "coupon_targets",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    couponId: varchar("coupon_id", { length: 191 })
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 64 }).notNull(),
    targetId: varchar("target_id", { length: 191 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("coupon_targets_coupon_idx").on(table.couponId)],
);

export const couponRedemptions = mysqlTable(
  "coupon_redemptions",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    couponId: varchar("coupon_id", { length: 191 })
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 191 }).references(() => users.id, {
      onDelete: "set null",
    }),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amount: int("amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_order_unique_idx").on(
      table.couponId,
      table.orderId,
    ),
    index("coupon_redemptions_user_idx").on(table.couponId, table.userId),
  ],
);
