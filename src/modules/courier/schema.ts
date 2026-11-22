import {
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

export const courierProviders = mysqlTable(
  "courier_providers",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    code: varchar("code", { length: 191 }).notNull(),
    configEnc: text("config_enc").notNull(),
    status: varchar("status", { length: 64 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("courier_providers_code_idx").on(table.code)],
);

export const shipments = mysqlTable(
  "shipments",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 191 }).notNull(),
    consignmentId: varchar("consignment_id", { length: 191 }),
    trackingCode: varchar("tracking_code", { length: 191 }),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    codAmount: int("cod_amount").notNull().default(0),
    codCollected: int("cod_collected").notNull().default(0),
    fee: int("fee").notNull().default(0),
    raw: json("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("shipments_order_idx").on(table.orderId),
    index("shipments_consignment_idx").on(table.consignmentId),
  ],
);

export const shipmentEvents = mysqlTable(
  "shipment_events",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    shipmentId: varchar("shipment_id", { length: 191 })
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 64 }).notNull(),
    payload: json("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("shipment_events_shipment_idx").on(table.shipmentId)],
);

export const codSettlements = mysqlTable("cod_settlements", {
  id: varchar("id", { length: 191 }).primaryKey(),
  provider: varchar("provider", { length: 191 }).notNull(),
  batchRef: varchar("batch_ref", { length: 191 }).notNull(),
  totalCollected: int("total_collected").notNull().default(0),
  totalFee: int("total_fee").notNull().default(0),
  netAmount: int("net_amount").notNull().default(0),
  status: varchar("status", { length: 64 }).notNull().default("pending"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
