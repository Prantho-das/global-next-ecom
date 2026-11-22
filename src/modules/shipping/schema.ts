import {
  boolean,
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const shippingZones = mysqlTable("shipping_zones", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  type: varchar("type", { length: 64 }).notNull().default("flat"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shippingZoneAreas = mysqlTable(
  "shipping_zone_areas",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    zoneId: varchar("zone_id", { length: 191 })
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    division: varchar("division", { length: 191 }).notNull(),
    district: varchar("district", { length: 191 }).notNull(),
    thana: varchar("thana", { length: 191 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("shipping_zone_areas_zone_idx").on(table.zoneId)],
);

export const shippingRates = mysqlTable(
  "shipping_rates",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    zoneId: varchar("zone_id", { length: 191 })
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 191 }).notNull(),
    minWeightG: int("min_weight_g").notNull().default(0),
    maxWeightG: int("max_weight_g"),
    minCartAmount: int("min_cart_amount").notNull().default(0),
    maxCartAmount: int("max_cart_amount"),
    price: int("price").notNull(),
    estimatedDaysMin: int("estimated_days_min").notNull().default(1),
    estimatedDaysMax: int("estimated_days_max").notNull().default(3),
    isFreeAbove: int("is_free_above"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("shipping_rates_zone_idx").on(table.zoneId)],
);

export const shippingSettings = mysqlTable("shipping_settings", {
  id: varchar("id", { length: 191 }).primaryKey(),
  freeShippingGlobalThreshold: int("free_shipping_global_threshold"),
  defaultWeightG: int("default_weight_g").notNull().default(500),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
