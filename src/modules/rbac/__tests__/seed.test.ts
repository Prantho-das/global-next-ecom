import { describe, expect, it } from "vitest";

import { DEFAULT_ROLE_SEEDS, getAllPermissionKeys } from "@/config/rbac";
import { seedRbac } from "@/modules/rbac/seed";

function createInMemoryRbacDb() {
  const permsTable = new Map<string, { id: string; key: string }>();
  const rolesTable = new Map<string, { id: string; slug: string }>();
  const mappingsTable = new Set<string>();

  return {
    permsTable,
    rolesTable,
    mappingsTable,
    db: {
      insert: (table: unknown) => ({
        values: (rows: Array<Record<string, unknown>>) => ({
          onConflictDoNothing: async () => {
            for (const row of rows) {
              if (typeof row["key"] === "string") {
                if (!permsTable.has(row["key"])) {
                  permsTable.set(row["key"], {
                    id: String(row["id"]),
                    key: row["key"],
                  });
                }
              } else if (typeof row["slug"] === "string") {
                if (!rolesTable.has(row["slug"])) {
                  rolesTable.set(row["slug"], {
                    id: String(row["id"]),
                    slug: row["slug"],
                  });
                }
              } else if (
                typeof row["roleId"] === "string" &&
                typeof row["permissionId"] === "string"
              ) {
                mappingsTable.add(`${row["roleId"]}:${row["permissionId"]}`);
              }
            }
            void table;
          },
        }),
      }),
      select: () => ({
        from: async (table: unknown) => {
          const tableObj = table as { key?: unknown; slug?: unknown };
          if (tableObj.key !== undefined) {
            return Array.from(permsTable.values());
          }
          if (tableObj.slug !== undefined) {
            return Array.from(rolesTable.values());
          }
          return [];
        },
      }),
    },
  };
}

describe("seedRbac idempotency", () => {
  it("produces identical counts and no duplicates when run multiple times", async () => {
    const store = createInMemoryRbacDb();
    const db = store.db as unknown as Parameters<typeof seedRbac>[0];

    const first = await seedRbac(db);
    const second = await seedRbac(db);

    const expectedPerms = getAllPermissionKeys().length;
    const expectedRoles = DEFAULT_ROLE_SEEDS.length;

    expect(first.permissionsCount).toBe(expectedPerms);
    expect(first.rolesCount).toBe(expectedRoles);
    expect(second.permissionsCount).toBe(expectedPerms);
    expect(second.rolesCount).toBe(expectedRoles);
    expect(store.permsTable.size).toBe(expectedPerms);
    expect(store.rolesTable.size).toBe(expectedRoles);
    expect(store.mappingsTable.size).toBe(first.mappingsCount);
  });
});
