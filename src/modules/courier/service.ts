import { AppError } from "@/lib/errors";
import type {
  BookingInput,
  BookingResult,
  CourierAdapter,
  CourierCode,
} from "@/modules/courier/adapter";
import type { FraudDecision } from "@/modules/fraud/service";

export interface CourierCandidate {
  adapter: CourierAdapter;
  config: Record<string, string>;
  successRate: number;
  isDefault: boolean;
}

export function assertFraudAllowsCourierBooking(
  decision: FraudDecision | string,
): void {
  if (decision === "hold") {
    throw new AppError(
      "CONFLICT",
      "Courier booking blocked: order is on fraud review hold",
    );
  }
}

export function sortCourierCandidates(
  candidates: readonly CourierCandidate[],
): CourierCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }
    return b.successRate - a.successRate;
  });
}

export async function bookWithRetryAndFallback(input: {
  booking: Omit<BookingInput, "config">;
  candidates: readonly CourierCandidate[];
  maxRetriesPerProvider?: number;
  backoffMs?: number;
}): Promise<{ provider: CourierCode; result: BookingResult }> {
  const ordered = sortCourierCandidates(input.candidates);
  const maxRetries = input.maxRetriesPerProvider ?? 3;
  const backoffMs = input.backoffMs ?? 0;

  let lastError: unknown = null;

  for (const candidate of ordered) {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await candidate.adapter.book({
          ...input.booking,
          config: candidate.config,
        });
        return { provider: candidate.adapter.code, result };
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries && backoffMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, backoffMs * attempt),
          );
        }
      }
    }
  }

  throw new AppError(
    "INTERNAL",
    lastError instanceof Error
      ? `All courier providers failed: ${lastError.message}`
      : "All courier providers failed",
  );
}
