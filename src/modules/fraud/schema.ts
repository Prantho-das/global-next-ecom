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

import { orders } from "@/modules/sales/schema";

export interface FraudSignalResult {
  key: string;
  matched: boolean;
  weight: number;
  reason: string;
}

export const fraudRules = pgTable(
  "fraud_rules",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    weight: integer("weight").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("fraud_rules_key_idx").on(table.key)],
);

export const fraudChecks = pgTable(
  "fraud_checks",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    signals: jsonb("signals").$type<FraudSignalResult[]>().notNull().default([]),
    decision: text("decision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("fraud_checks_order_idx").on(table.orderId)],
);

export const blacklist = pgTable(
  "blacklist",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("blacklist_type_value_idx").on(table.type, table.value)],
);

export const customerCourierStats = pgTable(
  "customer_courier_stats",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    delivered: integer("delivered").notNull().default(0),
    returned: integer("returned").notNull().default(0),
    cancelled: integer("cancelled").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("customer_courier_stats_phone_idx").on(table.phone)],
);
