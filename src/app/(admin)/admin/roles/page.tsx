import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RolesManager } from "@/components/admin/roles-manager";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/modules/rbac/schema";

export const metadata: Metadata = {
  title: "Staff & RBAC | Admin",
};

export default async function AdminRolesPage() {
  const session = await getSession();
  if (!(await checkPermission(session?.user?.id ?? null, "role:view"))) {
    redirect("/admin");
  }

  const db = getDb();
  const [roleRows, permRows, rolePermRows, userRows, assignmentRows] =
    await Promise.all([
      db.select().from(roles).orderBy(asc(roles.name)),
      db
        .select({
          id: permissions.id,
          resource: permissions.resource,
          action: permissions.action,
          key: permissions.key,
        })
        .from(permissions)
        .orderBy(asc(permissions.resource), asc(permissions.action)),
      db
        .select({
          roleId: rolePermissions.roleId,
          permissionId: rolePermissions.permissionId,
        })
        .from(rolePermissions),
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .orderBy(asc(users.email))
        .limit(100),
      db
        .select({
          userId: userRoles.userId,
          roleId: roles.id,
          roleName: roles.name,
          roleSlug: roles.slug,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id)),
    ]);

  const rolesByUser = new Map<
    string,
    Array<{ roleId: string; roleName: string; roleSlug: string }>
  >();
  for (const row of assignmentRows) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push({
      roleId: row.roleId,
      roleName: row.roleName,
      roleSlug: row.roleSlug,
    });
    rolesByUser.set(row.userId, list);
  }

  const permsByRole: Record<string, string[]> = {};
  for (const rp of rolePermRows) {
    const list = permsByRole[rp.roleId] ?? [];
    list.push(rp.permissionId);
    permsByRole[rp.roleId] = list;
  }

  return (
    <section aria-labelledby="roles-heading" className="space-y-4">
      <h2 id="roles-heading" className="sr-only">
        Staff &amp; RBAC Management
      </h2>
      <RolesManager
        roles={roleRows}
        permissions={permRows}
        initialRolePermissions={permsByRole}
        staffUsers={userRows.map((u) => ({
          ...u,
          roles: rolesByUser.get(u.id) ?? [],
        }))}
      />
    </section>
  );
}
