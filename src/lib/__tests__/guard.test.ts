import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";
import {
  checkPermission,
  getUserPermCacheKey,
  getUserPermissions,
  hasPermissionInSnapshot,
  invalidateUserPermissionCache,
  requirePermission,
} from "@/lib/guard";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();

vi.mock("@/lib/redis", () => ({
  getRedis: () => ({
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  }),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => [{ roleId: "r1", slug: "order_staff" }],
          innerJoin: () => ({
            where: async () => [{ key: "order:view" }],
          }),
        }),
      }),
    }),
  }),
}));

describe("guard permission checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants any permission to super_admin", () => {
    const allowed = hasPermissionInSnapshot(
      { roles: ["super_admin"], permissions: [] },
      "role:delete",
    );
    expect(allowed).toBe(true);
  });

  it("checks explicit permission for non-super_admin roles", () => {
    const snapshot = {
      roles: ["order_staff"],
      permissions: ["order:view", "order:update"],
    };
    expect(hasPermissionInSnapshot(snapshot, "order:view")).toBe(true);
    expect(hasPermissionInSnapshot(snapshot, "role:delete")).toBe(false);
  });

  it("uses Redis cache hit without hitting DB", async () => {
    mockRedisGet.mockResolvedValue({
      roles: ["manager"],
      permissions: ["product:view"],
    });

    const snapshot = await getUserPermissions("user-99");

    expect(snapshot).toEqual({
      roles: ["manager"],
      permissions: ["product:view"],
    });
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("populates Redis cache on cache miss", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");

    const snapshot = await getUserPermissions("user-42");

    expect(snapshot.roles).toEqual(["order_staff"]);
    expect(snapshot.permissions).toEqual(["order:view"]);
    expect(mockRedisSet).toHaveBeenCalledWith(
      getUserPermCacheKey("user-42"),
      snapshot,
      { ex: 300 },
    );
  });

  it("returns false for null userId in checkPermission", async () => {
    const allowed = await checkPermission(null, "order:view");
    expect(allowed).toBe(false);
  });

  it("throws UNAUTHORIZED or FORBIDDEN in requirePermission", async () => {
    await expect(requirePermission(null, "order:view")).rejects.toThrow(
      AppError,
    );

    mockRedisGet.mockResolvedValue({
      roles: ["support"],
      permissions: ["order:view"],
    });
    await expect(
      requirePermission("user-1", "role:delete"),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deletes user cache key on invalidateUserPermissionCache", async () => {
    mockRedisDel.mockResolvedValue(1);
    await invalidateUserPermissionCache("user-1");
    expect(mockRedisDel).toHaveBeenCalledWith("rbac:perms:user-1");
  });
});
