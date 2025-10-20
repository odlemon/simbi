// @ts-nocheck
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export class OrderProcessingService {
  private prisma = dbConnection.getPrismaClient();

  /**
   * Track order processing time for a staff member (dispatcher)
   * Called when order status changes
   */
  async trackOrderProcessing(
    orderId: string,
    staffId: string,
    sellerId: string,
    fromStatus: string,
    toStatus: string
  ) {
    try {
      // Get the order
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Calculate processing time if moving to a completion status
      let processingTimeMinutes: number | null = null;

      if (
        toStatus === "SHIPPED" ||
        toStatus === "DELIVERED" ||
        toStatus === "COMPLETED"
      ) {
        const now = new Date();
        const timeDiff = now.getTime() - order.createdAt.getTime();
        processingTimeMinutes = Math.round(timeDiff / (1000 * 60)); // Convert to minutes
      }

      // Log the activity
      await this.prisma.staffActivityLog.create({
        data: {
          staffId,
          sellerId,
          activityType: "ORDER_PROCESSED",
          description: `Order ${orderId} status changed from ${fromStatus} to ${toStatus}`,
          metadata: {
            orderId,
            fromStatus,
            toStatus,
            processingTimeMinutes,
            timestamp: new Date().toISOString(),
          },
        },
      });

      logger.info("Order processing tracked", {
        orderId,
        staffId,
        fromStatus,
        toStatus,
        processingTimeMinutes,
      });

      return {
        orderId,
        staffId,
        fromStatus,
        toStatus,
        processingTimeMinutes,
      };
    } catch (error: any) {
      logger.error("Failed to track order processing", {
        orderId,
        staffId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get order processing performance for staff members (US-S-307)
   */
  async getStaffPerformance(
    sellerId: string,
    staffId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {
      sellerId,
      activityType: "ORDER_PROCESSED",
    };

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const activities = await this.prisma.staffActivityLog.findMany({
      where,
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by staff member
    const staffPerformanceMap = new Map<
      string,
      {
        staffId: string;
        firstName: string;
        lastName: string;
        department: string;
        position: string;
        totalOrders: number;
        totalProcessingTimeMinutes: number;
        avgProcessingTimeMinutes: number;
        avgProcessingTimeHours: number;
        fastestProcessingMinutes: number;
        slowestProcessingMinutes: number;
      }
    >();

    activities.forEach((activity) => {
      const processingTime = activity.metadata?.processingTimeMinutes;
      
      // Only count activities with valid processing times
      if (processingTime && typeof processingTime === "number" && processingTime > 0) {
        const key = activity.staffId;

        if (staffPerformanceMap.has(key)) {
          const existing = staffPerformanceMap.get(key)!;
          existing.totalOrders += 1;
          existing.totalProcessingTimeMinutes += processingTime;
          existing.fastestProcessingMinutes = Math.min(
            existing.fastestProcessingMinutes,
            processingTime
          );
          existing.slowestProcessingMinutes = Math.max(
            existing.slowestProcessingMinutes,
            processingTime
          );
        } else {
          staffPerformanceMap.set(key, {
            staffId: activity.staffId,
            firstName: activity.staff.firstName,
            lastName: activity.staff.lastName,
            department: activity.staff.department,
            position: activity.staff.position,
            totalOrders: 1,
            totalProcessingTimeMinutes: processingTime,
            avgProcessingTimeMinutes: processingTime,
            avgProcessingTimeHours: processingTime / 60,
            fastestProcessingMinutes: processingTime,
            slowestProcessingMinutes: processingTime,
          });
        }
      }
    });

    // Calculate averages
    const staffPerformance = Array.from(staffPerformanceMap.values()).map(
      (staff) => {
        const avgMinutes = staff.totalProcessingTimeMinutes / staff.totalOrders;
        return {
          ...staff,
          avgProcessingTimeMinutes: Math.round(avgMinutes),
          avgProcessingTimeHours: Math.round((avgMinutes / 60) * 10) / 10,
        };
      }
    );

    // Sort by average processing time (fastest first)
    return staffPerformance.sort(
      (a, b) => a.avgProcessingTimeMinutes - b.avgProcessingTimeMinutes
    );
  }

  /**
   * Get detailed processing history for an order
   */
  async getOrderProcessingHistory(orderId: string, sellerId: string) {
    const activities = await this.prisma.staffActivityLog.findMany({
      where: {
        sellerId,
        activityType: "ORDER_PROCESSED",
        description: {
          contains: orderId,
        },
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return activities.map((activity) => ({
      activityId: activity.id,
      staffId: activity.staffId,
      staffName: `${activity.staff.firstName} ${activity.staff.lastName}`,
      department: activity.staff.department,
      fromStatus: activity.metadata?.fromStatus,
      toStatus: activity.metadata?.toStatus,
      processingTimeMinutes: activity.metadata?.processingTimeMinutes,
      timestamp: activity.createdAt,
    }));
  }

  /**
   * Get dispatcher performance rankings
   */
  async getDispatcherRankings(sellerId: string, limit: number = 10) {
    const performance = await this.getStaffPerformance(sellerId);

    // Filter only dispatchers
    const dispatchers = performance.filter(
      (staff) =>
        staff.department === "DELIVERY" || staff.position.toLowerCase().includes("dispatch")
    );

    // Return top performers
    return dispatchers.slice(0, limit).map((dispatcher, index) => ({
      rank: index + 1,
      ...dispatcher,
    }));
  }
}



