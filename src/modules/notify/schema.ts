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

import { users } from "@/modules/rbac/schema";

export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    channel: text("channel").notNull(),
    key: text("key").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    vars: jsonb("vars").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("templates_channel_key_idx").on(table.channel, table.key)],
);

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notification_events_type_idx").on(table.type)],
);

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").references(() => notificationEvents.id, {
      onDelete: "set null",
    }),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    status: text("status").notNull().default("queued"),
    providerId: text("provider_id"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_logs_status_idx").on(table.status, table.nextRetryAt),
  ],
);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("push_tokens_token_idx").on(table.token),
    index("push_tokens_user_idx").on(table.userId),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("notification_preferences_user_idx").on(table.userId)],
);
