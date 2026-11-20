import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const shippingZones = pgTable("shipping_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("flat"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shippingZoneAreas = pgTable(
  "shipping_zone_areas",
  {
    id: text("id").primaryKey(),
    zoneId: text("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    division: text("division").notNull(),
    district: text("district").notNull(),
    thana: text("thana"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shipping_zone_areas_zone_idx").on(table.zoneId)],
);

export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: text("id").primaryKey(),
    zoneId: text("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minWeightG: integer("min_weight_g").notNull().default(0),
    maxWeightG: integer("max_weight_g"),
    minCartAmount: integer("min_cart_amount").notNull().default(0),
    maxCartAmount: integer("max_cart_amount"),
    price: integer("price").notNull(),
    estimatedDaysMin: integer("estimated_days_min").notNull().default(1),
    estimatedDaysMax: integer("estimated_days_max").notNull().default(3),
    isFreeAbove: integer("is_free_above"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shipping_rates_zone_idx").on(table.zoneId)],
);

export const shippingSettings = pgTable("shipping_settings", {
  id: text("id").primaryKey(),
  freeShippingGlobalThreshold: integer("free_shipping_global_threshold"),
  defaultWeightG: integer("default_weight_g").notNull().default(500),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
