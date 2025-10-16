// @ts-nocheck
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details?: any;
}

export class SecurityAnomalyService {
  private prisma = dbConnection.getPrismaClient();

  /**
   * Check for multiple login attempts from different IPs
   */
  async checkMultipleIPLogins(
    userId: string,
    userType: "seller" | "buyer" | "admin",
    ipAddress: string
  ): Promise<AnomalyDetectionResult> {
    try {
      // Get recent login attempts (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentLogins = await this.prisma.activityLog.findMany({
        where: {
          entityType: userType.charAt(0).toUpperCase() + userType.slice(1),
          entityId: userId,
          action: "LOGIN_SUCCESS",
          createdAt: { gte: oneDayAgo },
        },
        select: {
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Extract unique IPs
      const ipSet = new Set<string>();
      recentLogins.forEach((log: any) => {
        if (log.metadata && typeof log.metadata === "object" && "ipAddress" in log.metadata) {
          ipSet.add(log.metadata.ipAddress as string);
        }
      });

      const uniqueIPs = Array.from(ipSet);

      // Flag if more than 5 different IPs in 24 hours
      if (uniqueIPs.length > 5) {
        await this.createSecurityAlert({
          userId,
          userType,
          anomalyType: "MULTIPLE_IP_LOGINS",
          severity: "HIGH",
          details: {
            uniqueIPCount: uniqueIPs.length,
            ips: uniqueIPs,
            timeWindow: "24 hours",
            currentIP: ipAddress,
          },
        });

        return {
          isAnomaly: true,
          anomalyType: "MULTIPLE_IP_LOGINS",
          severity: "HIGH",
          details: {
            uniqueIPCount: uniqueIPs.length,
            message: `Account accessed from ${uniqueIPs.length} different IP addresses in 24 hours`,
          },
        };
      }

      return { isAnomaly: false };
    } catch (error: any) {
      logger.error("Error checking multiple IP logins", {
        error: error.message,
        userId,
      });
      return { isAnomaly: false };
    }
  }

  /**
   * Check for suspicious large inventory updates
   */
  async checkLargeInventoryUpdate(
    inventoryId: string,
    previousQuantity: number,
    newQuantity: number
  ): Promise<AnomalyDetectionResult> {
    try {
      const inventory = await this.prisma.sellerInventory.findUnique({
        where: { id: inventoryId },
        include: {
          seller: { select: { id: true, businessName: true } },
          masterProduct: { select: { name: true } },
        },
      });

      if (!inventory) {
        return { isAnomaly: false };
      }

      const quantityChange = Math.abs(newQuantity - previousQuantity);
      const changePercentage = previousQuantity > 0 ? quantityChange / previousQuantity : 0;

      // Flag if quantity changes by more than 1000 units or 500%
      if (quantityChange > 1000 || changePercentage > 5) {
        await this.createSecurityAlert({
          userId: inventory.sellerId,
          userType: "seller",
          anomalyType: "LARGE_INVENTORY_UPDATE",
          severity: quantityChange > 5000 ? "HIGH" : "LOW",
          details: {
            inventoryId,
            productName: inventory.masterProduct.name,
            previousQuantity,
            newQuantity,
            quantityChange,
            changePercentage: (changePercentage * 100).toFixed(2) + "%",
          },
        });

        return {
          isAnomaly: true,
          anomalyType: "LARGE_INVENTORY_UPDATE",
          severity: quantityChange > 5000 ? "HIGH" : "LOW",
          details: {
            quantityChange,
            changePercentage: (changePercentage * 100).toFixed(2) + "%",
            message: `Large inventory update: ${quantityChange} units`,
          },
        };
      }

      return { isAnomaly: false };
    } catch (error: any) {
      logger.error("Error checking large inventory update", {
        error: error.message,
        inventoryId,
      });
      return { isAnomaly: false };
    }
  }

  /**
   * Check for unusual buyer order patterns
   */
  async checkUnusualOrderPattern(buyerId: string, orderId: string): Promise<AnomalyDetectionResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          totalAmount: true,
          items: { select: { quantity: true } },
        },
      });

      if (!order) {
        return { isAnomaly: false };
      }

      // Get buyer's order history (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const recentOrders = await this.prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          totalAmount: true,
          items: { select: { quantity: true } },
        },
      });

      if (recentOrders.length < 3) {
        // Not enough data to establish pattern
        return { isAnomaly: false };
      }

      // Calculate average order value
      const avgOrderValue =
        recentOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0) / recentOrders.length;

      // Flag if current order is 10x the average
      if (Number(order.totalAmount) > avgOrderValue * 10) {
        await this.createSecurityAlert({
          userId: buyerId,
          userType: "buyer",
          anomalyType: "UNUSUAL_ORDER_VALUE",
          severity: "LOW",
          details: {
            orderId,
            orderValue: Number(order.totalAmount),
            averageOrderValue: avgOrderValue,
            ratio: (Number(order.totalAmount) / avgOrderValue).toFixed(2),
          },
        });

        return {
          isAnomaly: true,
          anomalyType: "UNUSUAL_ORDER_VALUE",
          severity: "LOW",
          details: {
            orderValue: Number(order.totalAmount),
            averageOrderValue: avgOrderValue,
            message: `Order value is ${(Number(order.totalAmount) / avgOrderValue).toFixed(2)}x the average`,
          },
        };
      }

      return { isAnomaly: false };
    } catch (error: any) {
      logger.error("Error checking unusual order pattern", {
        error: error.message,
        buyerId,
        orderId,
      });
      return { isAnomaly: false };
    }
  }

  /**
   * Check for rapid successive orders (potential bot activity)
   */
  async checkRapidOrders(buyerId: string): Promise<AnomalyDetectionResult> {
    try {
      // Get orders in last 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentOrders = await this.prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: oneHourAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      // Flag if more than 10 orders in 1 hour
      if (recentOrders.length > 10) {
        await this.createSecurityAlert({
          userId: buyerId,
          userType: "buyer",
          anomalyType: "RAPID_ORDERS",
          severity: "HIGH",
          details: {
            orderCount: recentOrders.length,
            timeWindow: "1 hour",
            suspectedBotActivity: true,
          },
        });

        return {
          isAnomaly: true,
          anomalyType: "RAPID_ORDERS",
          severity: "HIGH",
          details: {
            orderCount: recentOrders.length,
            message: `${recentOrders.length} orders placed in 1 hour (potential bot activity)`,
          },
        };
      }

      return { isAnomaly: false };
    } catch (error: any) {
      logger.error("Error checking rapid orders", {
        error: error.message,
        buyerId,
      });
      return { isAnomaly: false };
    }
  }

  /**
   * Check for failed login attempts (brute force detection)
   */
  async checkFailedLoginAttempts(
    email: string,
    userType: "seller" | "buyer" | "admin"
  ): Promise<AnomalyDetectionResult> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // MySQL doesn't support JSON path queries
      // Fetch all failed login attempts and filter in code
      const allFailedAttempts = await this.prisma.activityLog.findMany({
        where: {
          entityType: userType.charAt(0).toUpperCase() + userType.slice(1),
          action: "LOGIN_FAILED",
          createdAt: { gte: fifteenMinutesAgo },
        },
      });

      // Filter by email in metadata
      const failedAttempts = allFailedAttempts.filter((log) => {
        try {
          const metadata = log.metadata as any;
          return metadata && metadata.email === email;
        } catch {
          return false;
        }
      });

      // Flag if more than 5 failed attempts in 15 minutes
      if (failedAttempts.length > 5) {
        await this.createSecurityAlert({
          userId: email, // Using email as identifier since login might not succeed
          userType,
          anomalyType: "BRUTE_FORCE_ATTEMPT",
          severity: "CRITICAL",
          details: {
            email,
            attemptCount: failedAttempts.length,
            timeWindow: "15 minutes",
          },
        });

        return {
          isAnomaly: true,
          anomalyType: "BRUTE_FORCE_ATTEMPT",
          severity: "CRITICAL",
          details: {
            attemptCount: failedAttempts.length,
            message: `${failedAttempts.length} failed login attempts in 15 minutes`,
          },
        };
      }

      return { isAnomaly: false };
    } catch (error: any) {
      logger.error("Error checking failed login attempts", {
        error: error.message,
        email,
      });
      return { isAnomaly: false };
    }
  }

  /**
   * Create security alert
   */
  private async createSecurityAlert(data: {
    userId: string;
    userType: string;
    anomalyType: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    details: any;
  }): Promise<void> {
    try {
      const alertTitle = this.getAlertTitle(data.anomalyType);
      const alertMessage = this.getAlertMessage(data.anomalyType, data.details);

      // Map MEDIUM to LOW since AlertTier only has CRITICAL, HIGH, LOW
      const tier = data.severity === "MEDIUM" ? "LOW" : data.severity;

      await this.prisma.adminAlert.create({
        data: {
          tier: tier as "CRITICAL" | "HIGH" | "LOW",
          status: "OPEN",
          title: alertTitle,
          message: alertMessage,
          alertCode: `SECURITY_${data.anomalyType}`,
          entityType: data.userType.charAt(0).toUpperCase() + data.userType.slice(1),
          entityId: data.userId,
          metadata: data.details,
        },
      });

      logger.warn("Security anomaly detected", {
        userId: data.userId,
        userType: data.userType,
        anomalyType: data.anomalyType,
        severity: data.severity,
      });
    } catch (error: any) {
      logger.error("Error creating security alert", {
        error: error.message,
        data,
      });
    }
  }

  /**
   * Get alert title based on anomaly type
   */
  private getAlertTitle(anomalyType: string): string {
    const titles: Record<string, string> = {
      MULTIPLE_IP_LOGINS: "Security Alert: Multiple IP Logins Detected",
      LARGE_INVENTORY_UPDATE: "Security Alert: Unusual Inventory Update",
      UNUSUAL_ORDER_VALUE: "Security Alert: Unusual Order Value",
      RAPID_ORDERS: "Security Alert: Rapid Order Activity (Potential Bot)",
      BRUTE_FORCE_ATTEMPT: "Security Alert: Brute Force Login Attempt",
    };

    return titles[anomalyType] || "Security Alert: Anomalous Activity Detected";
  }

  /**
   * Get alert message based on anomaly type and details
   */
  private getAlertMessage(anomalyType: string, details: any): string {
    switch (anomalyType) {
      case "MULTIPLE_IP_LOGINS":
        return `Account accessed from ${details.uniqueIPCount} different IP addresses in ${details.timeWindow}. Current IP: ${details.currentIP}`;
      
      case "LARGE_INVENTORY_UPDATE":
        return `Large inventory update for "${details.productName}": ${details.previousQuantity} → ${details.newQuantity} (${details.changePercentage} change)`;
      
      case "UNUSUAL_ORDER_VALUE":
        return `Order value ($${details.orderValue}) is ${details.ratio}x the buyer's average order value ($${details.averageOrderValue})`;
      
      case "RAPID_ORDERS":
        return `${details.orderCount} orders placed in ${details.timeWindow}. Suspected bot activity.`;
      
      case "BRUTE_FORCE_ATTEMPT":
        return `${details.attemptCount} failed login attempts for ${details.email} in ${details.timeWindow}`;
      
      default:
        return "Anomalous activity detected";
    }
  }

  /**
   * Get all security alerts
   */
  async getSecurityAlerts(filters: {
    severity?: string;
    anomalyType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    alerts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { severity, anomalyType, status, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const where: any = {
        alertCode: { startsWith: "SECURITY_" },
      };

      if (severity) where.tier = severity;
      if (status) where.status = status;
      if (anomalyType) where.alertCode = `SECURITY_${anomalyType}`;

      const [alerts, total] = await Promise.all([
        this.prisma.adminAlert.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        this.prisma.adminAlert.count({ where }),
      ]);

      return {
        alerts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error("Error fetching security alerts", {
        error: error.message,
      });
      throw error;
    }
  }
}

