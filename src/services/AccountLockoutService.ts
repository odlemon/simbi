// @ts-nocheck
import { logger } from "../utils/logger";
import { prisma } from "../utils/database";

/**
 * Account Lockout Service — IP / email rate limits + failed-attempt rows + account lockout.
 *
 * PERF: Logic below is disabled (commented) to cut DB round-trips on login.
 * Search "RE-ENABLE LOCKOUT" and restore the commented bodies + callers in auth services.
 */
export class AccountLockoutService {
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000;
  private static readonly MAX_IP_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

  static isAccountLocked(_accountLockedUntil: Date | null): boolean {
    /* RE-ENABLE LOCKOUT
    if (!accountLockedUntil) return false;
    const now = new Date();
    if (now >= accountLockedUntil) return false;
    return true;
    */
    return false;
  }

  static getRemainingLockoutTime(accountLockedUntil: Date | null): number {
    if (!accountLockedUntil) return 0;
    const now = new Date();
    if (now >= accountLockedUntil) return 0;
    return Math.ceil((accountLockedUntil.getTime() - now.getTime()) / (60 * 1000));
  }

  static handleFailedLogin(
    currentFailedAttempts: number,
    _currentLockedUntil: Date | null
  ): {
    failedAttempts: number;
    lockedUntil: Date | null;
    isLocked: boolean;
    remainingAttempts: number;
    message: string;
  } {
    /* RE-ENABLE LOCKOUT — full increment + lock window logic was here
    if (currentLockedUntil && this.isAccountLocked(currentLockedUntil)) { ... }
    let newFailedAttempts = ...
    ...
    return { failedAttempts, lockedUntil, isLocked, remainingAttempts, message };
    */
    return {
      failedAttempts: currentFailedAttempts,
      lockedUntil: null,
      isLocked: false,
      remainingAttempts: 99,
      message: "Invalid credentials.",
    };
  }

  static resetFailedAttempts(): { failedAttempts: number; lockedUntil: null } {
    return { failedAttempts: 0, lockedUntil: null };
  }

  static getLockoutErrorMessage(accountLockedUntil: Date | null): string {
    if (!accountLockedUntil) return "Account is locked. Please try again later.";
    const remainingMinutes = this.getRemainingLockoutTime(accountLockedUntil);
    if (remainingMinutes <= 0) return "Account lockout has expired. Please try again.";
    return `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
  }

  static async recordFailedAttempt(
    _email: string | null,
    _ipAddress: string,
    _userType: "admin" | "seller" | "buyer" | "staff",
    _accountExists: boolean = false
  ): Promise<void> {
    /* RE-ENABLE LOCKOUT — wrote to failedLoginAttempt table
    try {
      if (!prisma.failedLoginAttempt) { ... return; }
      await prisma.failedLoginAttempt.create({ data: { ... } });
    } catch (error: any) {
      logger.error("Error recording failed login attempt", { ... });
    }
    */
    return;
  }

  static async isIPRateLimited(
    _ipAddress: string,
    _userType: "admin" | "seller" | "buyer" | "staff"
  ): Promise<{ isLimited: boolean; remainingAttempts: number; resetAt: Date | null }> {
    /* RE-ENABLE LOCKOUT — counted rows on failedLoginAttempt (1–2 queries)
    try {
      if (!prisma.failedLoginAttempt) return { isLimited: false, ... };
      const recentAttempts = await prisma.failedLoginAttempt.count({ ... });
      const allAttempts = await prisma.failedLoginAttempt.findMany({ ... });
      ...
    } catch ...
    */
    return {
      isLimited: false,
      remainingAttempts: this.MAX_IP_ATTEMPTS,
      resetAt: null,
    };
  }

  static async isEmailRateLimited(
    _email: string,
    _userType: "admin" | "seller" | "buyer" | "staff"
  ): Promise<{ isLimited: boolean; attemptCount: number }> {
    /* RE-ENABLE LOCKOUT
    try {
      const recentAttempts = await prisma.failedLoginAttempt.count({ ... });
      return { isLimited: recentAttempts >= MAX, attemptCount: recentAttempts };
    } ...
    */
    return { isLimited: false, attemptCount: 0 };
  }

  static getIPRateLimitErrorMessage(resetAt: Date | null, attemptCount?: number): string {
    if (!resetAt) {
      return `Too many login attempts from this device. Please try again in 15 minutes.`;
    }
    const now = new Date();
    const remainingMs = resetAt.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    if (remainingMinutes <= 0) return "Rate limit has expired. Please try again.";
    return `Too many login attempts from this device. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
  }

  static getEmailRateLimitErrorMessage(attemptCount: number): string {
    return `Too many failed login attempts for this email address (${attemptCount} attempts). Please try again in 15 minutes.`;
  }

  static async cleanupOldAttempts(): Promise<number> {
    try {
      if (!prisma.failedLoginAttempt) return 0;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await prisma.failedLoginAttempt.deleteMany({
        where: { createdAt: { lt: oneDayAgo } },
      });
      logger.info("Cleaned up old failed login attempts", { deletedCount: result.count });
      return result.count;
    } catch (error: any) {
      logger.error("Error cleaning up old failed login attempts", { error: error.message });
      return 0;
    }
  }
}
