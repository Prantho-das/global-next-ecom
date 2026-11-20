import { randomUUID } from "crypto";

import { getDb } from "@/lib/db";
import { redactSensitiveData } from "@/lib/logger";
import { auditLogs } from "@/modules/rbac/schema";

export interface AuditLogInput {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown>;
  ip?: string | null;
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  const db = getDb();
  const safeDiff =
    input.diff !== undefined
      ? (redactSensitiveData(input.diff) as Record<string, unknown>)
      : null;
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    diff: safeDiff,
    ip: input.ip ?? null,
  });
}
