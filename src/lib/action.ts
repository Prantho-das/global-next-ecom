import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import type { z } from "zod";

import { getSession } from "@/lib/auth";
import { AppError, errResult, okResult } from "@/lib/errors";
import type { ActionResult } from "@/lib/errors";
import { requirePermission } from "@/lib/guard";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/redis";
import type { RateLimitConfig } from "@/lib/redis";
import { recordAuditLog } from "@/modules/rbac/audit";

export interface ActionContext {
  userId: string | null;
  ip: string | null;
}

export interface AuditConfig<I, O> {
  action: string;
  entity: string;
  getEntityId?: (output: O, input: I) => string;
}

export interface CreateActionOptions<I, O> {
  permission?: string;
  schema: z.ZodType<I>;
  rateLimit?: RateLimitConfig;
  audit?: AuditConfig<I, O>;
  revalidateTags?: string[];
  handler: (input: I, ctx: ActionContext) => Promise<O>;
}

async function resolveClientIp(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded !== null) {
      const first = forwarded.split(",")[0];
      return first !== undefined ? first.trim() : null;
    }
    return hdrs.get("x-real-ip");
  } catch {
    return null;
  }
}

function mapErrorToResult(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return errResult(error.code, error.message, error.fieldErrors);
  }
  logger.error("Unhandled action error", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  return errResult("INTERNAL", "An unexpected error occurred");
}

export function createAction<I, O>(
  opts: CreateActionOptions<I, O>,
): (raw: unknown) => Promise<ActionResult<O>> {
  return async (raw: unknown): Promise<ActionResult<O>> => {
    try {
      const session = await getSession();
      const userId = session?.user?.id ?? null;
      const ip = await resolveClientIp();

      if (opts.permission !== undefined) {
        await requirePermission(userId, opts.permission);
      }

      if (opts.rateLimit !== undefined) {
        const identifier = userId ?? ip ?? "anonymous";
        await enforceRateLimit(identifier, opts.rateLimit);
      }

      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >;
        return errResult("VALIDATION", "Invalid input", fieldErrors);
      }

      const output = await opts.handler(parsed.data, { userId, ip });

      if (opts.audit !== undefined) {
        const entityId =
          opts.audit.getEntityId !== undefined
            ? opts.audit.getEntityId(output, parsed.data)
            : "unknown";
        await recordAuditLog({
          actorId: userId,
          action: opts.audit.action,
          entity: opts.audit.entity,
          entityId,
          diff: { input: parsed.data },
          ip,
        });
      }

      if (opts.revalidateTags !== undefined) {
        for (const tag of opts.revalidateTags) {
          revalidateTag(tag);
        }
      }

      return okResult(output);
    } catch (error) {
      return mapErrorToResult(error);
    }
  };
}
