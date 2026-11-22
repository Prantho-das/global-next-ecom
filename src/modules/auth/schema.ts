import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    phone: varchar("phone", { length: 191 }).notNull(),
    code: text("code").notNull(),
    purpose: varchar("purpose", { length: 191 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    attempts: int("attempts").notNull().default(0),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("otp_codes_phone_purpose_idx").on(table.phone, table.purpose)],
);
