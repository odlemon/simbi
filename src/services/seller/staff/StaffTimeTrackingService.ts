// @ts-nocheck

import { logger } from "../../../utils/logger";
import { ActivityType } from "@prisma/client";
import { prisma } from "../../../utils/database";

interface ClockInDTO {
  notes?: string;
}

interface ClockOutDTO {
  notes?: string;
}

export class StaffTimeTrackingService {
  /**
   * Clock in - staff member starts their shift
   */
  async clockIn(staffId: string, sellerId: string, data?: ClockInDTO) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existingLog = await prisma.staffTimeLog.findFirst({
      where: {
        staffId,
        date: today,
        clockOut: null, // Not clocked out yet
      },
    });

    if (existingLog) {
      throw new Error("You are already clocked in. Please clock out first.");
    }

    const clockInTime = new Date();

    // Create time log
    const timeLog = await prisma.staffTimeLog.create({
      data: {
        staffId,
        sellerId,
        date: today,
        clockIn: clockInTime,
        notes: data?.notes,
      },
    });

    // Log activity
    await prisma.staffActivityLog.create({
      data: {
        staffId,
        sellerId,
        activityType: ActivityType.TIME_LOGGED,
        description: `Clocked in at ${clockInTime.toLocaleTimeString()}`,
      },
    });

    logger.info("Staff clocked in", {
      staffId,
      timeLogId: timeLog.id,
      clockIn: clockInTime,
    });

    return {
      id: timeLog.id,
      clockIn: timeLog.clockIn,
      date: timeLog.date,
      notes: timeLog.notes,
    };
  }

  /**
   * Clock out - staff member ends their shift
   */
  async clockOut(staffId: string, sellerId: string, data?: ClockOutDTO) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active clock-in for today
    const activeLog = await prisma.staffTimeLog.findFirst({
      where: {
        staffId,
        date: today,
        clockOut: null,
      },
    });

    if (!activeLog) {
      throw new Error("No active clock-in found. Please clock in first.");
    }

    const clockOutTime = new Date();
    const clockInTime = new Date(activeLog.clockIn);

    // Calculate hours worked
    const hoursWorked =
      (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    // Update time log
    const timeLog = await prisma.staffTimeLog.update({
      where: { id: activeLog.id },
      data: {
        clockOut: clockOutTime,
        hoursWorked: Number(hoursWorked.toFixed(2)),
        notes: data?.notes || activeLog.notes,
      },
    });

    // Log activity
    await prisma.staffActivityLog.create({
      data: {
        staffId,
        sellerId,
        activityType: ActivityType.TIME_LOGGED,
        description: `Clocked out at ${clockOutTime.toLocaleTimeString()} (${hoursWorked.toFixed(
          2
        )} hours)`,
      },
    });

    logger.info("Staff clocked out", {
      staffId,
      timeLogId: timeLog.id,
      clockOut: clockOutTime,
      hoursWorked,
    });

    return {
      id: timeLog.id,
      clockIn: timeLog.clockIn,
      clockOut: timeLog.clockOut,
      hoursWorked: timeLog.hoursWorked,
      date: timeLog.date,
      notes: timeLog.notes,
    };
  }

  /**
   * Get staff member's own time logs
   */
  async getMyTimeLogs(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 30
  ) {
    const where: any = { staffId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const timeLogs = await prisma.staffTimeLog.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    const totalHours = timeLogs.reduce(
      (sum, log) => sum + (log.hoursWorked || 0),
      0
    );

    return {
      timeLogs,
      summary: {
        totalHours: Number(totalHours.toFixed(2)),
        totalDays: timeLogs.length,
        averageHoursPerDay:
          timeLogs.length > 0
            ? Number((totalHours / timeLogs.length).toFixed(2))
            : 0,
      },
    };
  }

  /**
   * Get current clock-in status
   */
  async getClockInStatus(staffId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLog = await prisma.staffTimeLog.findFirst({
      where: {
        staffId,
        date: today,
        clockOut: null,
      },
    });

    if (!activeLog) {
      return {
        isClockedIn: false,
        message: "You are not clocked in",
      };
    }

    const now = new Date();
    const clockInTime = new Date(activeLog.clockIn);
    const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    return {
      isClockedIn: true,
      clockIn: activeLog.clockIn,
      hoursWorked: Number(hoursWorked.toFixed(2)),
      message: "You are currently clocked in",
    };
  }
}

export const staffTimeTrackingService = new StaffTimeTrackingService();



