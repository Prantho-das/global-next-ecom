import type { ReactNode } from "react";

export interface CanProps {
  permission: string;
  grantedPermissions: readonly string[];
  isSuperAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  permission,
  grantedPermissions,
  isSuperAdmin = false,
  fallback = null,
  children,
}: CanProps) {
  if (isSuperAdmin || grantedPermissions.includes(permission)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
