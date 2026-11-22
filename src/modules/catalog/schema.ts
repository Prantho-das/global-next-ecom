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

import { users } from "@/modules/rbac/schema";

export interface SeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
}

export const brands = mysqlTable(
  "brands",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    logoUrl: text("logo_url"),
    seo: json("seo").$type<SeoMeta>(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("brands_slug_idx").on(table.slug),
    index("brands_active_idx").on(table.name),
  ],
);

export const categories = mysqlTable(
  "categories",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    parentId: varchar("parent_id", { length: 191 }),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    path: varchar("path", { length: 191 }).notNull(),
    depth: int("depth").notNull().default(0),
    position: int("position").notNull().default(0),
    seo: json("seo").$type<SeoMeta>(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_slug_idx").on(table.slug),
    index("categories_parent_idx").on(table.parentId),
    index("categories_path_idx").on(table.path),
  ],
);

export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    status: varchar("status", { length: 64 }).notNull().default("draft"),
    brandId: varchar("brand_id", { length: 191 }).references(() => brands.id, {
      onDelete: "set null",
    }),
    description: text("description")
      .notNull()
      .$defaultFn(() => ""),
    basePrice: int("base_price").notNull().default(0),
    salePrice: int("sale_price"),
    compareAtPrice: int("compare_at_price"),
    seo: json("seo").$type<SeoMeta>(),
    hasVariants: boolean("has_variants").notNull().default(false),
    vendor: varchar("vendor", { length: 191 }),
    productType: varchar("product_type", { length: 191 }),
    tags: json("tags")
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_status_idx").on(table.status),
    index("products_brand_id_idx").on(table.brandId),
    index("products_active_idx").on(table.createdAt),
  ],
);

export const productCategories = mysqlTable(
  "product_categories",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 191 })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_categories_pair_idx").on(
      table.productId,
      table.categoryId,
    ),
    index("product_categories_category_idx").on(table.categoryId),
  ],
);

export const productImages = mysqlTable(
  "product_images",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt")
      .notNull()
      .$defaultFn(() => ""),
    position: int("position").notNull().default(0),
    variantIds: json("variant_ids").$type<string[] | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

export const productOptions = mysqlTable(
  "product_options",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 191 }).notNull(),
    position: int("position").notNull().default(0),
    values: json("values")
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("product_options_product_idx").on(table.productId)],
);

export const variants = mysqlTable(
  "variants",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 191 }).notNull(),
    price: int("price").notNull().default(0),
    compareAtPrice: int("compare_at_price"),
    costPrice: int("cost_price"),
    stock: int("stock").notNull().default(0),
    weightG: int("weight_g").notNull().default(0),
    barcode: varchar("barcode", { length: 191 }),
    optionValues: json("option_values")
      .$type<Record<string, string>>()
      .notNull()
      .$defaultFn(() => ({})),
    imageId: varchar("image_id", { length: 191 }).references(
      () => productImages.id,
      { onDelete: "set null" },
    ),
    isDefault: boolean("is_default").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("variants_sku_idx").on(table.sku),
    index("variants_product_idx").on(table.productId),
  ],
);

export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    variantId: varchar("variant_id", { length: 191 })
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    delta: int("delta").notNull(),
    reason: varchar("reason", { length: 191 }).notNull(),
    refType: varchar("ref_type", { length: 191 }).notNull(),
    refId: varchar("ref_id", { length: 191 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_variant_idx").on(table.variantId, table.createdAt),
  ],
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    productId: varchar("product_id", { length: 191 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 191 }).references(() => users.id, {
      onDelete: "set null",
    }),
    customerId: varchar("customer_id", { length: 191 }),
    rating: int("rating").notNull(),
    title: text("title")
      .notNull()
      .$defaultFn(() => ""),
    body: text("body")
      .notNull()
      .$defaultFn(() => ""),
    isVerified: boolean("is_verified").notNull().default(false),
    status: varchar("status", { length: 64 }).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("reviews_product_status_idx").on(table.productId, table.status),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  categories: many(productCategories),
  images: many(productImages),
  options: many(productOptions),
  variants: many(variants),
  reviews: many(reviews),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    product: one(products, {
      fields: [productCategories.productId],
      references: [products.id],
    }),
    category: one(categories, {
      fields: [productCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
  image: one(productImages, {
    fields: [variants.imageId],
    references: [productImages.id],
  }),
  stockMovements: many(stockMovements),
}));

export const purchaseOrders = mysqlTable(
  "purchase_orders",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    poNumber: varchar("po_number", { length: 64 }).notNull(),
    supplierName: varchar("supplier_name", { length: 191 }).notNull(),
    supplierPhone: varchar("supplier_phone", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("received"),
    totalCost: int("total_cost").notNull().default(0),
    note: text("note"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("purchase_orders_number_idx").on(table.poNumber)],
);

export const purchaseOrderItems = mysqlTable(
  "purchase_order_items",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    purchaseOrderId: varchar("purchase_order_id", { length: 191 })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id", { length: 191 })
      .notNull()
      .references(() => variants.id, { onDelete: "restrict" }),
    qty: int("qty").notNull(),
    unitCost: int("unit_cost").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("purchase_order_items_po_idx").on(table.purchaseOrderId),
  ],
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  variant: one(variants, {
    fields: [stockMovements.variantId],
    references: [variants.id],
  }),
}));
