export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly fieldErrors?: Record<string, string[]>;

  public constructor(
    code: ErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function okResult<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function errResult(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return fieldErrors !== undefined
    ? { ok: false, code, message, fieldErrors }
    : { ok: false, code, message };
}
