import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import * as authSchema from "@/modules/auth/schema";
import * as catalogSchema from "@/modules/catalog/schema";
import * as courierSchema from "@/modules/courier/schema";
import * as fraudSchema from "@/modules/fraud/schema";
import * as marketingSchema from "@/modules/marketing/schema";
import * as notifySchema from "@/modules/notify/schema";
import * as paymentSchema from "@/modules/payment/schema";
import * as pricingSchema from "@/modules/pricing/schema";
import * as rbacSchema from "@/modules/rbac/schema";
import * as reportSchema from "@/modules/report/schema";
import * as salesSchema from "@/modules/sales/schema";
import * as shippingSchema from "@/modules/shipping/schema";

const schema = {
  ...rbacSchema,
  ...catalogSchema,
  ...authSchema,
  ...salesSchema,
  ...pricingSchema,
  ...shippingSchema,
  ...fraudSchema,
  ...paymentSchema,
  ...courierSchema,
  ...notifySchema,
  ...marketingSchema,
  ...reportSchema,
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
