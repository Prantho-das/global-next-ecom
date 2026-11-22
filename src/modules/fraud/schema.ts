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

import { orders } from "@/modules/sales/schema";

export interface FraudSignalResult {
  key: string;
  matched: boolean;
  weight: number;
  reason: string;
}

export const fraudRules = mysqlTable(
  "fraud_rules",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    key: varchar("key", { length: 191 }).notNull(),
    weight: int("weight").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: json("config").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("fraud_rules_key_idx").on(table.key)],
);

export const fraudChecks = mysqlTable(
  "fraud_checks",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    score: int("score").notNull(),
    signals: json("signals")
      .$type<FraudSignalResult[]>()
      .notNull()
      .$defaultFn(() => []),
    decision: varchar("decision", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("fraud_checks_order_idx").on(table.orderId)],
);

export const blacklist = mysqlTable(
  "blacklist",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    type: varchar("type", { length: 64 }).notNull(),
    value: varchar("value", { length: 191 }).notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("blacklist_type_value_idx").on(table.type, table.value)],
);

export const customerCourierStats = mysqlTable(
  "customer_courier_stats",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    phone: varchar("phone", { length: 191 }).notNull(),
    delivered: int("delivered").notNull().default(0),
    returned: int("returned").notNull().default(0),
    cancelled: int("cancelled").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("customer_courier_stats_phone_idx").on(table.phone)],
);
