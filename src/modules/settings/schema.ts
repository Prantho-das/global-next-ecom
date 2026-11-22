import {
  json,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const siteSettings = mysqlTable(
  "site_settings",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    group: varchar("group", { length: 64 }).notNull(),
    key: varchar("key", { length: 191 }).notNull(),
    value: json("value").$type<unknown>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_settings_key_idx").on(table.key)],
);
