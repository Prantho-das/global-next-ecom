import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (redisInstance === null) {
    const env = getEnv();
    redisInstance = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisInstance;
}

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowSec: number;
}

export async function enforceRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<void> {
  const ratelimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
    prefix: `rl:${config.key}`,
  });
  const result = await ratelimit.limit(identifier);
  if (!result.success) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
    );
  }
}
