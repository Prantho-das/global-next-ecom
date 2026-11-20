import { randomUUID } from "crypto";

import { logger } from "@/lib/logger";

export interface QueuedJob<T = Record<string, unknown>> {
  id: string;
  name: string;
  payload: T;
  enqueuedAt: string;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(name: string, handler: JobHandler): void {
  handlers.set(name, handler);
}

export async function enqueueJob<T extends Record<string, unknown>>(
  name: string,
  payload: T,
): Promise<QueuedJob<T>> {
  const job: QueuedJob<T> = {
    id: randomUUID(),
    name,
    payload,
    enqueuedAt: new Date().toISOString(),
  };
  logger.info("Job enqueued", { jobId: job.id, jobName: name });
  const handler = handlers.get(name);
  if (handler !== undefined) {
    queueMicrotask(() => {
      handler(payload).catch((err: unknown) => {
        logger.error("Background job failed", {
          jobId: job.id,
          jobName: name,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });
  }
  return job;
}
