// @ts-nocheck
import { UserRole } from "@prisma/client";

/** Roles allowed for admin portal users (create/update). */
export const ADMIN_PORTAL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FINOPS_ANALYST,
  UserRole.COMPLIANCE_MANAGER,
  UserRole.LOGISTICS_COORDINATOR,
  UserRole.TECH_SUPPORT,
];

export function isAdminPortalRole(role: string): role is UserRole {
  return ADMIN_PORTAL_ROLES.includes(role as UserRole);
}
