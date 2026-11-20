import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import * as authSchema from "@/modules/auth/schema";
import * as catalogSchema from "@/modules/catalog/schema";
import * as rbacSchema from "@/modules/rbac/schema";
import * as salesSchema from "@/modules/sales/schema";

const schema = {
  ...rbacSchema,
  ...catalogSchema,
  ...authSchema,
  ...salesSchema,
};

let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): Pool {
  if (poolInstance === null) {
    poolInstance = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
    });
  }
  return poolInstance;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (dbInstance === null) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}
