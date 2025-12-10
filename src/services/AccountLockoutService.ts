// @ts-nocheck
import { logger } from "../utils/logger";
import { prisma } from "../utils/database";

/**
 * Account Lockout Service
 * Handles account lockout logic for all user types (Admin, Seller, Buyer, Staff)
 * 
 * Rules:
 * - Maximum 3 failed login attempts per account
 * - Account locked for 15 minutes after 3 failed attempts
 * - Failed attempts reset on successful login
 * - Lockout automatically expires after 15 minutes
 * - Tracks all login attempts (including non-existent emails) by email and IP
 * - Rate limits by device/IP address (5 attempts per 15 minutes)
 */
export class AccountLockoutService {
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
  private static readonly MAX_IP_ATTEMPTS = 5; // Maximum attempts from same IP in 15 minutes (across ALL user types combined - prevents bypass)
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if account is currently locked
   */
  static isAccountLocked(accountLockedUntil: Date | null): boolean {
    if (!accountLockedUntil) {
      return false;
    }

    // Check if lockout period has expired
    const now = new Date();
    if (now >= accountLockedUntil) {
      return false; // Lockout expired
    }

    return true; // Account is still locked
  }

  /**
   * Get remaining lockout time in minutes
   */
  static getRemainingLockoutTime(accountLockedUntil: Date | null): number {
    if (!accountLockedUntil) {
      return 0;
    }

    const now = new Date();
    if (now >= accountLockedUntil) {
      return 0; // Lockout expired
    }

    const remainingMs = accountLockedUntil.getTime() - now.getTime();
    return Math.ceil(remainingMs / (60 * 1000)); // Convert to minutes
  }

  /**
   * Handle failed login attempt
   * Returns the new failedLoginAttempts count and accountLockedUntil date
   */
  static handleFailedLogin(
    currentFailedAttempts: number,
    currentLockedUntil: Date | null
  ): { failedAttempts: number; lockedUntil: Date | null; isLocked: boolean; remainingAttempts: number; message: string } {
    // If account is locked, check if lockout has expired
    if (currentLockedUntil && this.isAccountLocked(currentLockedUntil)) {
      const remainingMinutes = this.getRemainingLockoutTime(currentLockedUntil);
      return {
        failedAttempts: currentFailedAttempts,
        lockedUntil: currentLockedUntil,
        isLocked: true,
        remainingAttempts: 0,
        message: `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`,
      };
    }

    // If lockout expired (currentLockedUntil exists but isAccountLocked returned false),
    // OR if currentFailedAttempts is still high from previous lockout,
    // start fresh at 1 attempt (lockout period served its purpose)
    // Otherwise, increment the failed attempts normally
    let newFailedAttempts: number;
    if (currentLockedUntil || currentFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      // Lockout expired OR we're recovering from a lockout - start fresh at 1 attempt
      // This ensures that after lockout expires, we don't immediately lock again
      newFailedAttempts = 1;
      logger.info("Starting fresh after lockout expiration", {
        previousAttempts: currentFailedAttempts,
        previousLockedUntil: currentLockedUntil,
        newAttempts: newFailedAttempts,
      });
    } else {
      // No previous lockout - increment normally
      newFailedAttempts = currentFailedAttempts + 1;
    }
    let newLockedUntil: Date | null = null;
    const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - newFailedAttempts);

    // Lock account after MAX_FAILED_ATTEMPTS
    if (newFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      newLockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      logger.warn("Account locked due to multiple failed login attempts", {
        failedAttempts: newFailedAttempts,
        lockedUntil: newLockedUntil,
      });
    }

    let message: string;
    if (newFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const remainingMinutes = this.getRemainingLockoutTime(newLockedUntil);
      message = `Account locked due to ${newFailedAttempts} failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
    } else if (newFailedAttempts === 2) {
      message = `Invalid credentials. You have 1 attempt remaining before your account is locked for 15 minutes.`;
    } else {
      message = `Invalid credentials. You have ${remainingAttempts} attempts remaining before your account is locked for 15 minutes.`;
    }

    return {
      failedAttempts: newFailedAttempts,
      lockedUntil: newLockedUntil,
      isLocked: newFailedAttempts >= this.MAX_FAILED_ATTEMPTS,
      remainingAttempts,
      message,
    };
  }

  /**
   * Reset failed login attempts (called on successful login)
   */
  static resetFailedAttempts(): { failedAttempts: number; lockedUntil: null } {
    return {
      failedAttempts: 0,
      lockedUntil: null,
    };
  }

  /**
   * Get lockout error message
   */
  static getLockoutErrorMessage(accountLockedUntil: Date | null): string {
    if (!accountLockedUntil) {
      return "Account is locked. Please try again later.";
    }

    const remainingMinutes = this.getRemainingLockoutTime(accountLockedUntil);
    if (remainingMinutes <= 0) {
      return "Account lockout has expired. Please try again.";
    }

    return `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
  }

  /**
   * Record a failed login attempt (for tracking purposes)
   * This tracks attempts even for non-existent emails
   */
  static async recordFailedAttempt(
    email: string | null,
    ipAddress: string,
    userType: "admin" | "seller" | "buyer" | "staff",
    accountExists: boolean = false
  ): Promise<void> {
    try {
      // Check if failedLoginAttempt model exists (Prisma client may not be regenerated)
      if (!prisma.failedLoginAttempt) {
        logger.warn("FailedLoginAttempt model not available - Prisma client needs regeneration");
        return;
      }

      await prisma.failedLoginAttempt.create({
        data: {
          email: email || null,
          ipAddress,
          userType,
          accountExists,
        },
      });
    } catch (error: any) {
      // Log but don't throw - tracking shouldn't break login flow
      logger.error("Error recording failed login attempt", {
        error: error.message,
        email,
        ipAddress,
      });
    }
  }

  /**
   * Check if device/IP address is rate limited
   * Returns true if IP has exceeded maximum attempts in the time window
   * Checks across ALL user types to prevent bypass by switching user types
   */
  static async isIPRateLimited(
    ipAddress: string,
    userType: "admin" | "seller" | "buyer" | "staff"
  ): Promise<{ isLimited: boolean; remainingAttempts: number; resetAt: Date | null }> {
    try {
      // Check if failedLoginAttempt model exists (Prisma client may not be regenerated)
      if (!prisma.failedLoginAttempt) {
        logger.warn("FailedLoginAttempt model not available - skipping IP rate limit check");
        return {
          isLimited: false,
          remainingAttempts: this.MAX_IP_ATTEMPTS,
          resetAt: null,
        };
      }

      const windowStart = new Date(Date.now() - this.RATE_LIMIT_WINDOW_MS);

      // Check across ALL user types - prevents bypass by switching between admin/seller/buyer/staff
      const recentAttempts = await prisma.failedLoginAttempt.count({
        where: {
          ipAddress,
          // Don't filter by userType - check all attempts from this IP
          createdAt: {
            gte: windowStart,
          },
        },
      });

      const isLimited = recentAttempts >= this.MAX_IP_ATTEMPTS;
      const remainingAttempts = Math.max(0, this.MAX_IP_ATTEMPTS - recentAttempts);

      // Calculate when the rate limit resets (when the 5th attempt was made + 15 minutes)
      let resetAt: Date | null = null;
      if (isLimited) {
        // Find the attempt that triggered the lockout (the 5th attempt = MAX_IP_ATTEMPTS)
        // Get attempts ordered by time, and find the one at position MAX_IP_ATTEMPTS
        const allAttempts = await prisma.failedLoginAttempt.findMany({
          where: {
            ipAddress,
            // Don't filter by userType - check all attempts from this IP
            createdAt: {
              gte: windowStart,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        });

        // The lockout was triggered when the MAX_IP_ATTEMPTS-th attempt was made
        if (allAttempts.length >= this.MAX_IP_ATTEMPTS) {
          const lockoutTriggerAttempt = allAttempts[this.MAX_IP_ATTEMPTS - 1];
          resetAt = new Date(
            lockoutTriggerAttempt.createdAt.getTime() + this.RATE_LIMIT_WINDOW_MS
          );
        }
      }

      return {
        isLimited,
        remainingAttempts,
        resetAt,
      };
    } catch (error: any) {
      logger.error("Error checking IP rate limit", {
        error: error.message,
        ipAddress,
      });
      // On error, don't block - allow the attempt
      return {
        isLimited: false,
        remainingAttempts: this.MAX_IP_ATTEMPTS,
        resetAt: null,
      };
    }
  }

  /**
   * Check if email has too many failed attempts (even if account doesn't exist)
   */
  static async isEmailRateLimited(
    email: string,
    userType: "admin" | "seller" | "buyer" | "staff"
  ): Promise<{ isLimited: boolean; attemptCount: number }> {
    try {
      // Check if failedLoginAttempt model exists (Prisma client may not be regenerated)
      if (!prisma.failedLoginAttempt) {
        logger.warn("FailedLoginAttempt model not available - skipping email rate limit check");
        return {
          isLimited: false,
          attemptCount: 0,
        };
      }

      const windowStart = new Date(Date.now() - this.RATE_LIMIT_WINDOW_MS);

      const recentAttempts = await prisma.failedLoginAttempt.count({
        where: {
          email,
          userType,
          createdAt: {
            gte: windowStart,
          },
        },
      });

      // Use same limit as account lockout (3 attempts)
      return {
        isLimited: recentAttempts >= this.MAX_FAILED_ATTEMPTS,
        attemptCount: recentAttempts,
      };
    } catch (error: any) {
      logger.error("Error checking email rate limit", {
        error: error.message,
        email,
      });
      return {
        isLimited: false,
        attemptCount: 0,
      };
    }
  }

  /**
   * Get IP rate limit error message
   * Shows the actual remaining time from when the lockout started
   */
  static getIPRateLimitErrorMessage(resetAt: Date | null, attemptCount?: number): string {
    if (!resetAt) {
      return `Too many login attempts from this device. Please try again in 15 minutes.`;
    }

    const now = new Date();
    const remainingMs = resetAt.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    if (remainingMinutes <= 0) {
      return "Rate limit has expired. Please try again.";
    }

    // Show the actual remaining time from when lockout started
    return `Too many login attempts from this device. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
  }

  /**
   * Get email rate limit error message
   */
  static getEmailRateLimitErrorMessage(attemptCount: number): string {
    return `Too many failed login attempts for this email address (${attemptCount} attempts). Please try again in 15 minutes.`;
  }

  /**
   * Clean up old failed login attempt records (older than 24 hours)
   * This should be called periodically via a cron job
   */
  static async cleanupOldAttempts(): Promise<number> {
    try {
      // Check if failedLoginAttempt model exists
      if (!prisma.failedLoginAttempt) {
        return 0;
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.failedLoginAttempt.deleteMany({
        where: {
          createdAt: {
            lt: oneDayAgo,
          },
        },
      });

      logger.info("Cleaned up old failed login attempts", {
        deletedCount: result.count,
      });

      return result.count;
    } catch (error: any) {
      logger.error("Error cleaning up old failed login attempts", {
        error: error.message,
      });
      return 0;
    }
  }
}

