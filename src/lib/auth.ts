import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import * as rbacSchema from "@/modules/rbac/schema";

function createAuth() {
  const env = getEnv();
  const isProd = env.NODE_ENV === "production";
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: rbacSchema.users,
        session: rbacSchema.sessions,
        account: rbacSchema.accounts,
        verification: rbacSchema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      useSecureCookies: isProd,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (authInstance === null) {
    authInstance = createAuth();
  }
  return authInstance;
}

export async function getSession() {
  const auth = getAuth();
  return auth.api.getSession({
    headers: await headers(),
  });
}
