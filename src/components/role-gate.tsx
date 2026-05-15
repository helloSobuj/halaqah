import * as React from "react";
import { useUserRole, type AppRole } from "@/hooks/use-user-role";

export function RoleGate({
  role,
  any,
  children,
  fallback = null,
}: {
  role?: AppRole;
  any?: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { has, isAdmin, isLoading } = useUserRole();
  if (isLoading) return null;
  if (isAdmin) return <>{children}</>;
  if (role && has(role)) return <>{children}</>;
  if (any && any.some((r) => has(r))) return <>{children}</>;
  return <>{fallback}</>;
}
