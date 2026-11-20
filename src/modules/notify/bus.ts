import { randomUUID } from "crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { enqueueJob, registerJobHandler } from "@/lib/queue";
import { sendBdSms, sendFcmPush, sendResendEmail } from "@/modules/notify/adapters";
import {
  notificationEvents,
  notificationLogs,
  notificationPreferences,
  pushTokens,
  templates,
} from "@/modules/notify/schema";
import {
  computeNextRetryDelayMs,
  renderTemplate,
  resolveChannelsForEvent,
  resolveDeliveryFailureStatus,
} from "@/modules/notify/service";
import type {
  NotificationChannel,
  NotificationEventType,
} from "@/modules/notify/service";

export interface EmitNotificationPayload {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  vars?: Record<string, string | number | boolean | null | undefined>;
}

async function deliverSingleLog(logId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.id, logId))
    .limit(1);
  const log = rows[0];
  if (log === undefined || log.status === "sent" || log.status === "dead_letter") {
    return;
  }

  const nextAttempts = log.attempts + 1;
  try {
    const tmplRows = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.channel, log.channel),
          eq(templates.key, log.template),
        ),
      )
      .limit(1);
    const evRows =
      log.eventId !== null
        ? await db
            .select({ payload: notificationEvents.payload })
            .from(notificationEvents)
            .where(eq(notificationEvents.id, log.eventId))
            .limit(1)
        : [];
    const vars =
      (evRows[0]?.payload["vars"] as Record<string, string | number> | undefined) ??
      {};
    const subject = renderTemplate(
      tmplRows[0]?.subject ?? `Notification: ${log.template}`,
      vars,
    );
    const body = renderTemplate(
      tmplRows[0]?.body ?? `Update for ${log.template}`,
      vars,
    );

    let providerId = "";
    if (log.channel === "email") {
      providerId = (await sendResendEmail({ to: log.recipient, subject, html: body }))
        .providerId;
    } else if (log.channel === "sms") {
      providerId = (await sendBdSms({ to: log.recipient, message: body }))
        .providerId;
    } else {
      providerId = (
        await sendFcmPush({ token: log.recipient, title: subject, body })
      ).providerId;
    }

    await db
      .update(notificationLogs)
      .set({
        status: "sent",
        providerId,
        attempts: nextAttempts,
        updatedAt: new Date(),
      })
      .where(eq(notificationLogs.id, log.id));
  } catch (err) {
    const status = resolveDeliveryFailureStatus(nextAttempts);
    const nextRetryAt =
      status === "failed"
        ? new Date(Date.now() + computeNextRetryDelayMs(nextAttempts))
        : null;
    await db
      .update(notificationLogs)
      .set({
        status,
        attempts: nextAttempts,
        error: err instanceof Error ? err.message : String(err),
        nextRetryAt,
        updatedAt: new Date(),
      })
      .where(eq(notificationLogs.id, log.id));
  }
}

registerJobHandler("notify.deliver", async (payload) => {
  const logId = String(payload["logId"] ?? "");
  if (logId !== "") {
    await deliverSingleLog(logId);
  }
});

export async function emitNotification(
  type: NotificationEventType,
  payload: EmitNotificationPayload,
): Promise<{ eventId: string; queuedCount: number }> {
  const db = getDb();
  const eventId = randomUUID();
  await db.insert(notificationEvents).values({
    id: eventId,
    type,
    payload: payload as Record<string, unknown>,
  });

  const pref =
    payload.userId !== undefined && payload.userId !== null
      ? (
          await db
            .select()
            .from(notificationPreferences)
            .where(eq(notificationPreferences.userId, payload.userId))
            .limit(1)
        )[0]
      : undefined;

  const channels = resolveChannelsForEvent(type);
  let queuedCount = 0;

  for (const channel of channels) {
    const recipient = await resolveRecipient(channel, payload, pref);
    if (recipient === null) {
      continue;
    }
    const logId = randomUUID();
    await db.insert(notificationLogs).values({
      id: logId,
      eventId,
      channel,
      recipient,
      template: type,
      status: "queued",
      attempts: 0,
    });
    await enqueueJob("notify.deliver", { logId });
    queuedCount += 1;
  }

  return { eventId, queuedCount };
}

async function resolveRecipient(
  channel: NotificationChannel,
  payload: EmitNotificationPayload,
  pref?: { emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean },
): Promise<string | null> {
  if (channel === "email") {
    if (pref !== undefined && !pref.emailEnabled) return null;
    return payload.email ?? null;
  }
  if (channel === "sms") {
    if (pref !== undefined && !pref.smsEnabled) return null;
    return payload.phone ?? null;
  }
  if (pref !== undefined && !pref.pushEnabled) return null;
  if (payload.userId === undefined || payload.userId === null) {
    return null;
  }
  const db = getDb();
  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, payload.userId))
    .limit(1);
  return tokens[0]?.token ?? null;
}
