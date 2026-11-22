"use server";

import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { sendBdSms, sendResendEmail } from "@/modules/notify/adapters";
import {
  notificationPreferences,
  pushTokens,
  templates,
} from "@/modules/notify/schema";
import { renderTemplate } from "@/modules/notify/service";

const upsertTemplateSchema = z.object({
  channel: z.enum(["email", "sms", "push"]),
  key: z.string().trim().min(1).max(80),
  subject: z.string().trim().max(200).optional(),
  body: z.string().min(1).max(5000),
  vars: z.array(z.string()).default([]),
});

const testSendSchema = z.object({
  channel: z.enum(["email", "sms"]),
  recipient: z.string().trim().min(3).max(160),
  subject: z.string().trim().max(200).optional(),
  body: z.string().min(1).max(5000),
  sampleVars: z.record(z.string(), z.string()).default({}),
});

const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(500),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});

export const upsertNotificationTemplateAction = createAction({
  permission: "notification:update",
  schema: upsertTemplateSchema,
  revalidateTags: ["notifications"],
  audit: {
    action: "upsert_template",
    entity: "notification_template",
    getEntityId: (_out, input) => `${input.channel}:${input.key}`,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .insert(templates)
      .values({
        id: randomUUID(),
        channel: input.channel,
        key: input.key,
        subject: input.subject ?? null,
        body: input.body,
        vars: input.vars ?? [],
      })
      .onDuplicateKeyUpdate({
        set: {
          subject: input.subject ?? null,
          body: input.body,
          vars: input.vars ?? [],
          updatedAt: new Date(),
        },
      });
    return { channel: input.channel, key: input.key };
  },
});

export const testSendNotificationAction = createAction({
  permission: "notification:create",
  schema: testSendSchema,
  handler: async (input) => {
    const vars = input.sampleVars ?? {};
    const renderedBody = renderTemplate(input.body, vars);
    if (input.channel === "email") {
      return sendResendEmail({
        to: input.recipient,
        subject: renderTemplate(input.subject ?? "Test Notification", vars),
        html: renderedBody,
      });
    }
    return sendBdSms({
      to: input.recipient,
      message: renderedBody,
    });
  },
});

export const registerPushTokenAction = createAction({
  schema: registerPushTokenSchema,
  handler: async (input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Sign in required to register push");
    }
    const db = getDb();
    await db
      .insert(pushTokens)
      .values({
        id: randomUUID(),
        userId: ctx.userId,
        token: input.token,
        platform: input.platform ?? "web",
      })
      .onDuplicateKeyUpdate({
        set: {
          userId: ctx.userId,
          platform: input.platform ?? "web",
          updatedAt: new Date(),
        },
      });
    return { registered: true };
  },
});

export const updateNotificationPreferencesAction = createAction({
  schema: updatePreferencesSchema,
  handler: async (input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Sign in required");
    }
    const db = getDb();
    await db
      .insert(notificationPreferences)
      .values({
        id: randomUUID(),
        userId: ctx.userId,
        emailEnabled: input.emailEnabled,
        smsEnabled: input.smsEnabled,
        pushEnabled: input.pushEnabled,
      })
      .onDuplicateKeyUpdate({
        set: {
          emailEnabled: input.emailEnabled,
          smsEnabled: input.smsEnabled,
          pushEnabled: input.pushEnabled,
          updatedAt: new Date(),
        },
      });
    const saved = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.userId))
      .limit(1);
    return saved[0] ?? null;
  },
});
