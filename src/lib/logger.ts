import { getEnv } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
  "cookie",
  "card",
  "cardnumber",
  "cvv",
  "otp",
  "phone",
  "email",
  "configenc",
  "config_enc",
  "rawresponse",
  "raw_response",
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSensitiveKey(k)
        ? "[REDACTED]"
        : redactSensitiveData(v, depth + 1);
    }
    return out;
  }
  return value;
}

function writeLog(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const configured = getEnv().LOG_LEVEL;
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configured]) {
    return;
  }
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta !== undefined ? { meta: redactSensitiveData(meta) } : {}),
  };
  const line = `${JSON.stringify(entry)}\n`;
  if (level === "error" || level === "warn") {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    writeLog("debug", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>): void {
    writeLog("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    writeLog("error", message, meta);
  },
};
