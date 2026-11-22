"use server";

import { randomUUID } from "crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createAction } from "@/lib/action";
import {
  createCredentialsUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  invalidateRoleUsersPermissionCache,
  invalidateUserPermissionCache,
} from "@/lib/guard";
import {
  accounts,
  rolePermissions,
  roles,
  userRoles,
} from "@/modules/rbac/schema";

const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
  roleId: z.string().min(1),
});

export const createStaffUserAction = createAction({
  permission: "user:create",
  schema: createStaffSchema,
  revalidateTags: ["rbac"],
  audit: {
    action: "create_staff",
    entity: "user",
    getEntityId: (out: { userId: string }) => out.userId,
  },
  handler: async (input) => {
    const created = await createCredentialsUser({
      name: input.name,
      email: input.email,
      password: input.password,
    });
    const db = getDb();
    await db.insert(userRoles).values({
      id: randomUUID(),
      userId: created.id,
      roleId: input.roleId,
    });
    await invalidateUserPermissionCache(created.id);
    return { userId: created.id, email: created.email };
  },
});

const userRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export const assignUserRoleAction = createAction({
  permission: "role:update",
  schema: userRoleSchema,
  revalidateTags: ["rbac"],
  audit: {
    action: "assign_role",
    entity: "user_role",
    getEntityId: (_out, input) => `${input.userId}:${input.roleId}`,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .insert(userRoles)
      .ignore()
      .values({
        id: randomUUID(),
        userId: input.userId,
        roleId: input.roleId,
      });
    await invalidateUserPermissionCache(input.userId);
    return { assigned: true };
  },
});

export const removeUserRoleAction = createAction({
  permission: "role:update",
  schema: userRoleSchema,
  revalidateTags: ["rbac"],
  audit: {
    action: "remove_role",
    entity: "user_role",
    getEntityId: (_out, input) => `${input.userId}:${input.roleId}`,
  },
  handler: async (input) => {
    const db = getDb();
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, input.userId),
          eq(userRoles.roleId, input.roleId),
        ),
      );
    await invalidateUserPermissionCache(input.userId);
    return { removed: true };
  },
});


const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional(),
});

export const createRoleAction = createAction({
  permission: "role:create",
  schema: createRoleSchema,
  revalidateTags: ["rbac"],
  audit: {
    action: "create_role",
    entity: "role",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    await db.insert(roles).values({
      id,
      name: input.name,
      slug: slug || `role_${id.slice(0, 6)}`,
      description: input.description ?? null,
      isSystem: false,
    });
    return { id, slug };
  },
});

const updateRolePermsSchema = z.object({
  roleId: z.string().min(1),
  permissionIds: z.array(z.string().min(1)),
});

export const updateRolePermissionsAction = createAction({
  permission: "role:update",
  schema: updateRolePermsSchema,
  revalidateTags: ["rbac"],
  audit: {
    action: "update_role_permissions",
    entity: "role",
    getEntityId: (_out, input) => input.roleId,
  },
  handler: async (input) => {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));
      if (input.permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          input.permissionIds.map((permissionId) => ({
            id: randomUUID(),
            roleId: input.roleId,
            permissionId,
          })),
        );
      }
    });
    await invalidateRoleUsersPermissionCache(input.roleId);
    return { roleId: input.roleId, count: input.permissionIds.length };
  },
});


const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

export const changeOwnPasswordAction = createAction({
  schema: changeOwnPasswordSchema,
  audit: {
    action: "change_own_password",
    entity: "user",
    getEntityId: () => "self",
  },
  handler: async (input, ctx) => {
    if (ctx.userId === null) {
      throw new AppError("UNAUTHORIZED", "Sign in required");
    }
    const db = getDb();
    const accRows = await db
      .select({ id: accounts.id, password: accounts.password })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, ctx.userId),
          eq(accounts.providerId, "credentials"),
        ),
      )
      .limit(1);
    const acc = accRows[0];
    if (
      acc === undefined ||
      acc.password === null ||
      !verifyPassword(input.currentPassword, acc.password)
    ) {
      throw new AppError("UNAUTHORIZED", "Current password is incorrect");
    }
    await db
      .update(accounts)
      .set({
        password: hashPassword(input.newPassword),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, acc.id));
    return { updated: true };
  },
});
