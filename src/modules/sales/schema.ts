import { relations } from "drizzle-orm";
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

import { variants } from "@/modules/catalog/schema";
import { users } from "@/modules/rbac/schema";

export interface ShippingAddressSnapshot {
  name: string;
  phone: string;
  division: string;
  district: string;
  thana: string;
  line: string;
}

export const customers = mysqlTable(
  "customers",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("user_id", { length: 191 }).references(() => users.id, {
      onDelete: "set null",
    }),
    phone: varchar("phone", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }),
    name: varchar("name", { length: 191 }).notNull(),
    isGuest: boolean("is_guest").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customers_phone_idx").on(table.phone),
    index("customers_user_id_idx").on(table.userId),
  ],
);

export const addresses = mysqlTable(
  "addresses",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    customerId: varchar("customer_id", { length: 191 })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    division: varchar("division", { length: 191 }).notNull(),
    district: varchar("district", { length: 191 }).notNull(),
    thana: varchar("thana", { length: 191 }).notNull(),
    line: text("line").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("addresses_customer_id_idx").on(table.customerId)],
);

export const carts = mysqlTable(
  "carts",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    sessionId: varchar("session_id", { length: 191 }),
    userId: varchar("user_id", { length: 191 }).references(() => users.id, {
      onDelete: "set null",
    }),
    customerId: varchar("customer_id", { length: 191 }).references(
      () => customers.id,
      { onDelete: "set null" },
    ),
    status: varchar("status", { length: 64 }).notNull().default("active"),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("carts_session_status_idx").on(table.sessionId, table.status),
    index("carts_user_status_idx").on(table.userId, table.status),
  ],
);

export const cartItems = mysqlTable(
  "cart_items",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    cartId: varchar("cart_id", { length: 191 })
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id", { length: 191 })
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    qty: int("qty").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_pair_idx").on(table.cartId, table.variantId),
  ],
);

export const orders = mysqlTable(
  "orders",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    number: varchar("number", { length: 191 }).notNull(),
    customerId: varchar("customer_id", { length: 191 })
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    paymentStatus: varchar("payment_status", { length: 64 })
      .notNull()
      .default("pending"),
    subtotal: int("subtotal").notNull(),
    discountTotal: int("discount_total").notNull().default(0),
    shippingFee: int("shipping_fee").notNull().default(0),
    total: int("total").notNull(),
    shippingAddress: json("shipping_address")
      .$type<ShippingAddressSnapshot>()
      .notNull(),
    note: text("note"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_number_idx").on(table.number),
    uniqueIndex("orders_idempotency_idx").on(table.idempotencyKey),
    index("orders_customer_idx").on(table.customerId),
    index("orders_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id", { length: 191 })
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    qty: int("qty").notNull(),
    priceSnapshot: int("price_snapshot").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 191 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const orderEvents = mysqlTable(
  "order_events",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 64 }),
    toStatus: varchar("to_status", { length: 64 }).notNull(),
    actor: varchar("actor", { length: 191 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

export const payments = mysqlTable(
  "payments",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    orderId: varchar("order_id", { length: 191 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 64 }).notNull().default("cod"),
    gatewayProvider: varchar("gateway_provider", { length: 64 }),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    txnId: varchar("txn_id", { length: 191 }),
    gatewayTxnId: varchar("gateway_txn_id", { length: 191 }),
    amount: int("amount").notNull(),
    refundedAmount: int("refunded_amount").notNull().default(0),
    currency: varchar("currency", { length: 16 }).notNull().default("BDT"),
    rawResponse: json("raw_response").$type<Record<string, unknown>>(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("payments_order_idx").on(table.orderId),
    uniqueIndex("payments_idempotency_idx").on(table.idempotencyKey),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(variants, {
    fields: [cartItems.variantId],
    references: [variants.id],
  }),
}));
