import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";

import { and, eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { accounts, users } from "@/modules/rbac/schema";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [salt, key] = parts;
  if (salt === undefined || key === undefined) {
    return false;
  }
  const keyBuf = Buffer.from(key, "hex");
  const derived = scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(keyBuf, derived);
}

const nextAuth = NextAuth(() => {
  const env = getEnv();
  return {
    secret: env.BETTER_AUTH_SECRET,
    trustHost: true,
    session: {
      strategy: "jwt",
    },
    cookies: {
      sessionToken: {
        name: "ecom.session-token",
      },
    },
    pages: {
      signIn: "/admin/login",
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          const email =
            typeof credentials?.email === "string"
              ? credentials.email.trim().toLowerCase()
              : "";
          const password =
            typeof credentials?.password === "string"
              ? credentials.password
              : "";
          if (email === "" || password === "") {
            return null;
          }

          const db = getDb();
          const userRows = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          const user = userRows[0];
          if (user === undefined) {
            return null;
          }

          const accountRows = await db
            .select({ password: accounts.password })
            .from(accounts)
            .where(
              and(
                eq(accounts.userId, user.id),
                eq(accounts.providerId, "credentials"),
              ),
            )
            .limit(1);

          const storedHash = accountRows[0]?.password;
          if (
            storedHash === null ||
            storedHash === undefined ||
            !verifyPassword(password, storedHash)
          ) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user?.id !== undefined) {
          token.sub = user.id;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user !== undefined && token.sub !== undefined) {
          session.user.id = token.sub;
        }
        return session;
      },
    },
  };
});

export const { handlers, auth, signIn, signOut } = nextAuth;

export interface AppSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export async function getSession(): Promise<AppSession | null> {
  try {
    const session = await auth();
    const user = session?.user;
    if (user === undefined || user.id === undefined) {
      return null;
    }
    return {
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? null,
      },
    };
  } catch {
    return null;
  }
}

export async function createCredentialsUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; email: string }> {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing[0] !== undefined) {
    throw new AppError("CONFLICT", "Email is already registered");
  }

  const userId = randomUUID();
  const passwordHash = hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name,
      email: normalizedEmail,
      emailVerified: false,
    });
    await tx.insert(accounts).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credentials",
      password: passwordHash,
    });
  });

  return { id: userId, email: normalizedEmail };
}
