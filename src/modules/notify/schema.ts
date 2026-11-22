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

export const templates = mysqlTable(
  "templates",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    channel: varchar("channel", { length: 64 }).notNull(),
    key: varchar("key", { length: 191 }).notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    vars: json("vars")
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("templates_channel_key_idx").on(table.channel, table.key)],
);

export const notificationEvents = mysqlTable(
  "notification_events",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    type: varchar("type", { length: 191 }).notNull(),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("notification_events_type_idx").on(table.type)],
);

export const notificationLogs = mysqlTable(
  "notification_logs",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    eventId: varchar("event_id", { length: 191 }).references(
      () => notificationEvents.id,
      { onDelete: "set null" },
    ),
    channel: varchar("channel", { length: 64 }).notNull(),
    recipient: varchar("recipient", { length: 191 }).notNull(),
    template: varchar("template", { length: 191 }).notNull(),
    status: varchar("status", { length: 64 }).notNull().default("queued"),
    providerId: varchar("provider_id", { length: 191 }),
    error: text("error"),
    attempts: int("attempts").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("notification_logs_status_idx").on(table.status, table.nextRetryAt),
  ],
);

export const pushTokens = mysqlTable(
  "push_tokens",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("user_id", { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 191 }).notNull(),
    platform: varchar("platform", { length: 64 }).notNull().default("web"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("push_tokens_token_idx").on(table.token),
    index("push_tokens_user_idx").on(table.userId),
  ],
);

export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("user_id", { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("notification_preferences_user_idx").on(table.userId)],
);
