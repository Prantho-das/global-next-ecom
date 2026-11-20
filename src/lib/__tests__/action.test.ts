import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createAction } from "@/lib/action";
import { AppError } from "@/lib/errors";

const mockGetSession = vi.fn();
const mockRequirePermission = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockRecordAuditLog = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/guard", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

vi.mock("@/lib/redis", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/modules/rbac/audit", () => ({
  recordAuditLog: (...args: unknown[]) => mockRecordAuditLog(...args),
}));

const sampleSchema = z.object({
  name: z.string().min(2),
});

describe("createAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockRequirePermission.mockResolvedValue(undefined);
    mockEnforceRateLimit.mockResolvedValue(undefined);
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  it("returns UNAUTHORIZED when guard rejects unauthenticated user", async () => {
    mockGetSession.mockResolvedValue(null);
    mockRequirePermission.mockRejectedValue(
      new AppError("UNAUTHORIZED", "Authentication required"),
    );
    const handler = vi.fn();
    const action = createAction({
      permission: "role:create",
      schema: sampleSchema,
      handler,
    });

    const result = await action({ name: "Manager" });

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN when guard rejects missing permission", async () => {
    mockRequirePermission.mockRejectedValue(
      new AppError("FORBIDDEN", "Missing permission: role:create"),
    );
    const handler = vi.fn();
    const action = createAction({
      permission: "role:create",
      schema: sampleSchema,
      handler,
    });

    const result = await action({ name: "Manager" });

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "Missing permission: role:create",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED when rate limit is exceeded", async () => {
    mockEnforceRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Too many requests."),
    );
    const handler = vi.fn();
    const action = createAction({
      permission: "role:create",
      schema: sampleSchema,
      rateLimit: { key: "role:create", limit: 5, windowSec: 60 },
      handler,
    });

    const result = await action({ name: "Manager" });

    expect(result).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests.",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns VALIDATION with fieldErrors when Zod parse fails", async () => {
    const handler = vi.fn();
    const action = createAction({
      permission: "role:create",
      schema: sampleSchema,
      handler,
    });

    const result = await action({ name: "A" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION");
      expect(result.fieldErrors?.["name"]).toBeDefined();
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs handler, writes audit log, revalidates tags, and returns okResult", async () => {
    const action = createAction({
      permission: "role:create",
      schema: sampleSchema,
      audit: {
        action: "create",
        entity: "role",
        getEntityId: (out: { id: string }) => out.id,
      },
      revalidateTags: ["roles"],
      handler: async (input) => ({ id: "role-1", name: input.name }),
    });

    const result = await action({ name: "Catalog Editor" });

    expect(result).toEqual({
      ok: true,
      data: { id: "role-1", name: "Catalog Editor" },
    });
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      actorId: "user-1",
      action: "create",
      entity: "role",
      entityId: "role-1",
      diff: { input: { name: "Catalog Editor" } },
      ip: "127.0.0.1",
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith("roles");
  });
});
