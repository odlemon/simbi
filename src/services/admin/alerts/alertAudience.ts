import { UserRole } from "@prisma/client";

/**
 * Which non–Super Admin roles may list/ack/resolve alerts for a given alertCode.
 * Super Admin always has access (checked separately).
 * Unknown codes: Super Admin only.
 */
const EXACT_ALERT_AUDIENCE: Record<string, UserRole[]> = {
  SRI_VIOLATION: [UserRole.COMPLIANCE_MANAGER, UserRole.TECH_SUPPORT],
  CHARGEBACK: [UserRole.FINOPS_ANALYST],
  DISPUTE_SLO_BREACH: [
    UserRole.LOGISTICS_COORDINATOR,
    UserRole.COMPLIANCE_MANAGER,
    UserRole.TECH_SUPPORT,
  ],
  DOCUMENT_EXPIRY: [UserRole.COMPLIANCE_MANAGER],
  DOCUMENT_EXPIRED: [UserRole.COMPLIANCE_MANAGER],
  ANTI_SNIPING_VIOLATION: [UserRole.COMPLIANCE_MANAGER, UserRole.TECH_SUPPORT],
  STOCK_VARIANCE: [UserRole.FINOPS_ANALYST, UserRole.LOGISTICS_COORDINATOR],
  SELLER_SUSPENDED: [UserRole.COMPLIANCE_MANAGER],
  SELLER_BANNED: [UserRole.COMPLIANCE_MANAGER],
  FRAUD_INVESTIGATION: [UserRole.COMPLIANCE_MANAGER, UserRole.FINOPS_ANALYST],
  RECONCILIATION_VARIANCE: [UserRole.FINOPS_ANALYST],
};

export function getAudienceRolesForAlertCode(alertCode: string): UserRole[] {
  if (alertCode.startsWith("SECURITY_")) {
    return [UserRole.COMPLIANCE_MANAGER, UserRole.FINOPS_ANALYST];
  }
  return EXACT_ALERT_AUDIENCE[alertCode] ?? [];
}

export function adminCanAccessAlert(alertCode: string, role: UserRole): boolean {
  if (role === UserRole.SUPER_ADMIN) {
    return true;
  }
  const audience = getAudienceRolesForAlertCode(alertCode);
  if (audience.length === 0) {
    return false;
  }
  return audience.includes(role);
}
