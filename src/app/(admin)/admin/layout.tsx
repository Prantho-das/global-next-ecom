import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SYSTEM_ROLE_SLUG } from "@/config/rbac";
import { getSession } from "@/lib/auth";
import { getUserPermissions } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getSession();
  if (session === null || session.user === undefined) {
    redirect("/admin/login");
  }

  const snapshot = await getUserPermissions(session.user.id);
  const isSuperAdmin = snapshot.roles.includes(SYSTEM_ROLE_SLUG);
  if (snapshot.roles.length === 0 && !isSuperAdmin) {
    redirect("/");
  }

  return (
    <AdminShell
      userName={session.user.name}
      userEmail={session.user.email}
      grantedPermissions={snapshot.permissions}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </AdminShell>
  );
}
