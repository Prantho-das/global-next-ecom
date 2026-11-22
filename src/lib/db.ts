import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";

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
import * as settingsSchema from "@/modules/settings/schema";
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
  ...settingsSchema,
};

function createDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}

type DbInstance = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  __ecomPool?: Pool;
  __ecomDb?: DbInstance;
};

export function getPool(): Pool {
  if (globalForDb.__ecomPool === undefined) {
    globalForDb.__ecomPool = mysql.createPool({
      uri: getEnv().DATABASE_URL,
      connectionLimit: process.env.NODE_ENV === "production" ? 10 : 5,
      waitForConnections: true,
      enableKeepAlive: true,
    });
  }
  return globalForDb.__ecomPool;
}

export function getDb(): DbInstance {
  if (globalForDb.__ecomDb === undefined) {
    globalForDb.__ecomDb = createDb();
  }
  return globalForDb.__ecomDb;
}
