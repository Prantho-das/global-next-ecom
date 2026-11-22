import { eq } from "drizzle-orm";

import { SYSTEM_ROLE_SLUG } from "@/config/rbac";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getRedis } from "@/lib/redis";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@/modules/rbac/schema";

const PERMISSION_CACHE_TTL_SEC = 300;
const PERMISSION_CACHE_PREFIX = "rbac:perms:";

export interface UserPermissionSnapshot {
  roles: string[];
  permissions: string[];
}

export function getUserPermCacheKey(userId: string): string {
  return `${PERMISSION_CACHE_PREFIX}${userId}`;
}

export async function fetchUserPermissionSnapshot(
  userId: string,
): Promise<UserPermissionSnapshot> {
  const db = getDb();
  const assignedRoles = await db
    .select({
      roleId: roles.id,
      slug: roles.slug,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleSlugs = assignedRoles.map((r) => r.slug);
  if (roleSlugs.length === 0) {
    return { roles: [], permissions: [] };
  }

  const permRows = await db
    .select({
      key: permissions.key,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  const permSet = new Set(permRows.map((p) => p.key));
  return {
    roles: roleSlugs,
    permissions: Array.from(permSet),
  };
}

function shouldSkipRedis(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  return url.includes("example.upstash.io");
}

const memPermCache = new Map<
  string,
  { snapshot: UserPermissionSnapshot; expiresAt: number }
>();

export async function getUserPermissions(
  userId: string,
): Promise<UserPermissionSnapshot> {
  const cacheKey = getUserPermCacheKey(userId);
  if (shouldSkipRedis()) {
    const now = Date.now();
    const hit = memPermCache.get(cacheKey);
    if (hit !== undefined && hit.expiresAt > now) {
      return hit.snapshot;
    }
    const snapshot = await fetchUserPermissionSnapshot(userId);
    memPermCache.set(cacheKey, {
      snapshot,
      expiresAt: now + 60_000,
    });
    return snapshot;
  }
  try {
    const redis = getRedis();
    const cached = await redis.get<UserPermissionSnapshot>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const snapshot = await fetchUserPermissionSnapshot(userId);
    await redis.set(cacheKey, snapshot, { ex: PERMISSION_CACHE_TTL_SEC });
    return snapshot;
  } catch {
    return fetchUserPermissionSnapshot(userId);
  }
}

export function hasPermissionInSnapshot(
  snapshot: UserPermissionSnapshot,
  requiredPermission: string,
): boolean {
  if (snapshot.roles.includes(SYSTEM_ROLE_SLUG)) {
    return true;
  }
  return snapshot.permissions.includes(requiredPermission);
}

export async function checkPermission(
  userId: string | null,
  requiredPermission: string,
): Promise<boolean> {
  if (userId === null) {
    return false;
  }
  const snapshot = await getUserPermissions(userId);
  return hasPermissionInSnapshot(snapshot, requiredPermission);
}

export async function requirePermission(
  userId: string | null,
  requiredPermission: string,
): Promise<void> {
  if (userId === null) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  const allowed = await checkPermission(userId, requiredPermission);
  if (!allowed) {
    throw new AppError("FORBIDDEN", `Missing permission: ${requiredPermission}`);
  }
}

export async function invalidateUserPermissionCache(
  userId: string,
): Promise<void> {
  const cacheKey = getUserPermCacheKey(userId);
  memPermCache.delete(cacheKey);
  if (shouldSkipRedis()) {
    return;
  }
  try {
    await getRedis().del(cacheKey);
  } catch {
    return;
  }
}

export async function invalidateRoleUsersPermissionCache(
  roleId: string,
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId));
  if (rows.length === 0) {
    return;
  }
  for (const row of rows) {
    memPermCache.delete(getUserPermCacheKey(row.userId));
  }
  if (shouldSkipRedis()) {
    return;
  }
  try {
    const redis = getRedis();
    await Promise.all(
      rows.map((row) => redis.del(getUserPermCacheKey(row.userId))),
    );
  } catch {
    return;
  }
}
