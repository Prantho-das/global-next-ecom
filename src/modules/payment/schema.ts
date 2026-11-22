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

import { orders, payments } from "@/modules/sales/schema";

export const paymentProviders = mysqlTable(
  "payment_providers",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    configEnc: text("config_enc").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    position: int("position").notNull().default(0),
    sandboxMode: boolean("sandbox_mode").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_providers_code_idx").on(table.code)],
);

export const refunds = mysqlTable(
  "refunds",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    paymentId: varchar("payment_id", { length: 191 })
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amount: int("amount").notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    gatewayRefundId: varchar("gateway_refund_id", { length: 191 }),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("refunds_payment_idx").on(table.paymentId),
    index("refunds_order_idx").on(table.orderId),
  ],
);
