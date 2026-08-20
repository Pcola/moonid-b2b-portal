import type { Role } from "@prisma/client";

/** Centralized RBAC decisions used by both server-rendered UI and tests. */
export function canManagePriceTiers(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageCommerceSettings(role: Role): boolean {
  return role === "ADMIN";
}

export function canViewAuditLog(role: Role): boolean {
  return role === "ADMIN";
}
