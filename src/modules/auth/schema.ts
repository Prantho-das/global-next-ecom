import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    code: text("code").notNull(),
    purpose: text("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("otp_codes_phone_purpose_idx").on(table.phone, table.purpose)],
);
