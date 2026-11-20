import { randomUUID } from "crypto";
import { pathToFileURL } from "url";
import "dotenv/config";

import {
  DEFAULT_ROLE_SEEDS,
  getAllPermissionKeys,
} from "@/config/rbac";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { permissions, rolePermissions, roles } from "@/modules/rbac/schema";

type DbClient = ReturnType<typeof getDb>;

export async function seedRbac(db: DbClient = getDb()): Promise<{
  permissionsCount: number;
  rolesCount: number;
  mappingsCount: number;
}> {
  const allKeys = getAllPermissionKeys();
  const permissionValues = allKeys.map((key) => {
    const [resource = "unknown", action = "view"] = key.split(":");
    return {
      id: randomUUID(),
      resource,
      action,
      key,
      description: `${resource} ${action}`,
    };
  });

  await db
    .insert(permissions)
    .values(permissionValues)
    .onConflictDoNothing({ target: permissions.key });

  const existingPerms = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions);
  const permByKey = new Map(existingPerms.map((p) => [p.key, p.id]));

  const roleValues = DEFAULT_ROLE_SEEDS.map((role) => ({
    id: randomUUID(),
    name: role.name,
    slug: role.slug,
    description: role.description,
    isSystem: role.isSystem,
  }));

  await db
    .insert(roles)
    .values(roleValues)
    .onConflictDoNothing({ target: roles.slug });

  const existingRoles = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles);
  const roleBySlug = new Map(existingRoles.map((r) => [r.slug, r.id]));

  const mappingValues: Array<{
    id: string;
    roleId: string;
    permissionId: string;
  }> = [];

  for (const roleDef of DEFAULT_ROLE_SEEDS) {
    const roleId = roleBySlug.get(roleDef.slug);
    if (roleId === undefined) {
      continue;
    }
    for (const permKey of roleDef.permissions) {
      const permissionId = permByKey.get(permKey);
      if (permissionId === undefined) {
        continue;
      }
      mappingValues.push({
        id: randomUUID(),
        roleId,
        permissionId,
      });
    }
  }

  if (mappingValues.length > 0) {
    await db
      .insert(rolePermissions)
      .values(mappingValues)
      .onConflictDoNothing({
        target: [rolePermissions.roleId, rolePermissions.permissionId],
      });
  }

  return {
    permissionsCount: existingPerms.length,
    rolesCount: existingRoles.length,
    mappingsCount: mappingValues.length,
  };
}

const isCliEntry =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  seedRbac()
    .then((summary) => {
      logger.info("RBAC seed completed", summary);
      process.exit(0);
    })
    .catch((err: unknown) => {
      logger.error("RBAC seed failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    });
}
