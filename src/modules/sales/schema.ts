import { relations, sql } from "drizzle-orm";
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

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    phone: text("phone").notNull(),
    email: text("email"),
    name: text("name").notNull(),
    isGuest: boolean("is_guest").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("customers_phone_idx").on(table.phone),
    index("customers_user_id_idx").on(table.userId),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    division: text("division").notNull(),
    district: text("district").notNull(),
    thana: text("thana").notNull(),
    line: text("line").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("addresses_customer_id_idx").on(table.customerId)],
);

export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id"),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("carts_session_status_idx").on(table.sessionId, table.status),
    index("carts_user_status_idx").on(table.userId, table.status),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_pair_idx").on(table.cartId, table.variantId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingFee: integer("shipping_fee").notNull().default(0),
    total: integer("total").notNull(),
    shippingAddress: jsonb("shipping_address")
      .$type<ShippingAddressSnapshot>()
      .notNull(),
    note: text("note"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    idempotencyKey: text("idempotency_key").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_number_idx").on(table.number),
    uniqueIndex("orders_idempotency_idx").on(table.idempotencyKey),
    index("orders_customer_idx").on(table.customerId),
    index("orders_status_created_idx")
      .on(table.status, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    qty: integer("qty").notNull(),
    priceSnapshot: integer("price_snapshot").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: text("method").notNull().default("cod"),
    status: text("status").notNull().default("pending"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("BDT"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
