import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { orders } from "@/modules/sales/schema";

export const courierProviders = pgTable(
  "courier_providers",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    configEnc: text("config_enc").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("courier_providers_code_idx").on(table.code)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    consignmentId: text("consignment_id"),
    trackingCode: text("tracking_code"),
    status: text("status").notNull().default("pending"),
    codAmount: integer("cod_amount").notNull().default(0),
    codCollected: integer("cod_collected").notNull().default(0),
    fee: integer("fee").notNull().default(0),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shipments_order_idx").on(table.orderId),
    index("shipments_consignment_idx").on(table.consignmentId),
  ],
);

export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shipment_events_shipment_idx").on(table.shipmentId)],
);

export const codSettlements = pgTable("cod_settlements", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  batchRef: text("batch_ref").notNull(),
  totalCollected: integer("total_collected").notNull().default(0),
  totalFee: integer("total_fee").notNull().default(0),
  netAmount: integer("net_amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
