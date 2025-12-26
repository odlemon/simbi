// @ts-nocheck

import { StaffStatus, StaffDepartment, ActivityType, StaffRole } from "@prisma/client";
import { logger } from "../../../utils/logger";
import bcrypt from "bcryptjs";
import { emailService } from "../../EmailService";
import crypto from "crypto";
import { prisma } from "../../../utils/database";

interface CreateStaffDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: StaffDepartment;
  position: string;
  role: StaffRole;
  salary: number;
  hourlyRate?: number;
  startDate: Date;
}

interface LogTimeDTO {
  staffId: string;
  clockIn: Date;
  clockOut?: Date;
  hoursWorked?: number;
  notes?: string;
}

export class StaffService {

  /**
   * Create staff member
   */
  async createStaff(sellerId: string, data: CreateStaffDTO) {
    // Check if email already exists
    const existing = await prisma.sellerStaff.findFirst({
      where: {
        email: data.email,
      },
    });

    if (existing) {
      throw new Error("Staff member with this email already exists");
    }

    // Get seller information for email
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        businessName: true,
        tradingName: true,
      },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    // Generate secure temporary password (12 characters: letters, numbers, special chars)
    const tempPassword = this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Validate role is valid enum value
    if (!Object.values(StaffRole).includes(data.role)) {
      throw new Error(`Invalid role. Must be one of: ${Object.values(StaffRole).join(", ")}`);
    }

    const staff = await prisma.sellerStaff.create({
      data: {
        sellerId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        department: data.department,
        position: data.position,
        role: data.role,
        salary: data.salary,
        hourlyRate: data.hourlyRate,
        startDate: data.startDate,
        status: StaffStatus.ACTIVE,
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    // Log activity
    await prisma.staffActivityLog.create({
      data: {
        staffId: staff.id,
        sellerId,
        activityType: ActivityType.STAFF_CREATED,
        description: `Staff member created: ${data.firstName} ${data.lastName} with role ${data.role}`,
      },
    });

    // Send credentials via email
    try {
      const businessName = seller.tradingName || seller.businessName;
      await emailService.sendStaffCredentials(
        data.email,
        data.firstName,
        data.lastName,
        tempPassword,
        businessName
      );

      logger.info("Staff credentials email sent", {
        sellerId,
        staffId: staff.id,
        email: data.email,
      });
    } catch (emailError: any) {
      logger.error("Failed to send staff credentials email", {
        sellerId,
        staffId: staff.id,
        email: data.email,
        error: emailError.message,
      });
      // Don't throw error - staff was created successfully, email failure is not critical
    }

    logger.info("Staff member created", {
      sellerId,
      staffId: staff.id,
      email: data.email,
    });

    return {
      staff,
      tempPassword, // Return so seller can share with staff
    };
  }

  /**
   * Get all staff
   */
  async getAllStaff(
    sellerId: string,
    filters: {
      status?: StaffStatus;
      department?: StaffDepartment;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.department) {
      where.department = filters.department;
    }

    const total = await prisma.sellerStaff.count({ where });

    const staff = await prisma.sellerStaff.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        role: true,
        salary: true,
        hourlyRate: true,
        startDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose passwordHash
      },
    });

    return {
      staff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single staff member
   */
  async getStaff(sellerId: string, staffId: string) {
    const staff = await prisma.sellerStaff.findFirst({
      where: {
        id: staffId,
        sellerId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        role: true,
        salary: true,
        hourlyRate: true,
        startDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    return staff;
  }

  /**
   * Update staff member
   */
  async updateStaff(
    sellerId: string,
    staffId: string,
    data: Partial<CreateStaffDTO>
  ) {
    const existing = await prisma.sellerStaff.findFirst({
      where: {
        id: staffId,
        sellerId,
      },
    });

    if (!existing) {
      throw new Error("Staff member not found");
    }

    // Validate role if provided
    if (data.role && !Object.values(StaffRole).includes(data.role)) {
      throw new Error(`Invalid role. Must be one of: ${Object.values(StaffRole).join(", ")}`);
    }

    const updated = await prisma.sellerStaff.update({
      where: { id: staffId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        department: data.department,
        position: data.position,
        role: data.role,
        salary: data.salary,
        hourlyRate: data.hourlyRate,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        salary: true,
        hourlyRate: true,
        startDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log activity
    await prisma.staffActivityLog.create({
      data: {
        staffId,
        sellerId,
        activityType: ActivityType.STAFF_UPDATED,
        description: `Staff member updated`,
      },
    });

    logger.info("Staff member updated", {
      sellerId,
      staffId,
    });

    return updated;
  }

  /**
   * Deactivate staff member
   */
  async deactivateStaff(sellerId: string, staffId: string) {
    const existing = await prisma.sellerStaff.findFirst({
      where: {
        id: staffId,
        sellerId,
      },
    });

    if (!existing) {
      throw new Error("Staff member not found");
    }

    await prisma.sellerStaff.update({
      where: { id: staffId },
      data: {
        status: StaffStatus.INACTIVE,
      },
    });

    // Log activity
    await prisma.staffActivityLog.create({
      data: {
        staffId,
        sellerId,
        activityType: ActivityType.STAFF_DEACTIVATED,
        description: `Staff member deactivated`,
      },
    });

    logger.info("Staff member deactivated", {
      sellerId,
      staffId,
    });

    return { success: true };
  }

  /**
   * Log time
   */
  async logTime(sellerId: string, data: LogTimeDTO) {
    // Verify staff belongs to seller
    const staff = await prisma.sellerStaff.findFirst({
      where: {
        id: data.staffId,
        sellerId,
      },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    const timeLog = await prisma.staffTimeLog.create({
      data: {
        staffId: data.staffId,
        sellerId,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        hoursWorked: data.hoursWorked,
        notes: data.notes,
      },
    });

    logger.info("Time log created", {
      sellerId,
      staffId: data.staffId,
      timeLogId: timeLog.id,
    });

    return timeLog;
  }

  /**
   * Get time logs
   */
  async getTimeLogs(
    sellerId: string,
    staffId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {
      sellerId,
    };

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) where.clockIn.gte = startDate;
      if (endDate) where.clockIn.lte = endDate;
    }

    const timeLogs = await prisma.staffTimeLog.findMany({
      where,
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
        clockIn: "desc",
      },
    });

    return timeLogs;
  }

  /**
   * Get staff activity logs
   */
  async getActivityLogs(
    sellerId: string,
    staffId?: string,
    activityType?: ActivityType
  ) {
    const where: any = {
      sellerId,
    };

    if (staffId) {
      where.staffId = staffId;
    }

    if (activityType) {
      where.activityType = activityType;
    }

    const logs = await prisma.staffActivityLog.findMany({
      where,
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return logs;
  }

  /**
   * Get payroll summary (FR-S-5.3.3 - supports weekly and monthly)
   */
  async getPayrollSummary(
    sellerId: string,
    period: "weekly" | "monthly",
    month?: number,
    year?: number,
    weekStart?: Date
  ) {
    logger.info("getPayrollSummary called", {
      sellerId,
      period,
      month,
      year,
      weekStart,
    });

    let startDate: Date;
    let endDate: Date;

    if (period === "weekly") {
      if (!weekStart) {
        throw new Error("weekStart is required for weekly payroll");
      }
      startDate = new Date(weekStart);
      endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6); // 7 days total
    } else {
      // Monthly
      if (!month || !year) {
        throw new Error("month and year are required for monthly payroll");
      }
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }

    logger.info("Date range calculated", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get all active staff members
    const staff = await prisma.sellerStaff.findMany({
      where: {
        sellerId,
        isActive: true, // Use isActive instead of status for more flexibility
      },
    });

    logger.info("Staff members found", {
      count: staff.length,
      staff: staff.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        isActive: s.isActive,
      })),
    });

    if (staff.length === 0) {
      logger.warn("No active staff members found for payroll", { sellerId });
      // Return empty payroll instead of error - but still return proper structure
      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        month,
        year,
        staff: [],
        grandTotal: 0,
      };
    }

    const payrollSummary = await Promise.all(
      staff.map(async (member) => {
        // Get time logs for the period (check by date, not clockIn time)
        const timeLogs = await prisma.staffTimeLog.findMany({
          where: {
            staffId: member.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const totalHours = timeLogs.reduce(
          (sum, log) => sum + (log.hoursWorked || 0),
          0
        );

        const hourlyPay = member.hourlyRate
          ? member.hourlyRate * totalHours
          : 0;

        // For weekly, prorate the monthly salary
        const salaryForPeriod = period === "weekly" 
          ? (member.salary / 4.33) // Average weeks per month
          : member.salary;

        return {
          staffId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          department: member.department,
          position: member.position,
          salary: member.salary,
          hourlyRate: member.hourlyRate,
          totalHours,
          hourlyPay,
          salaryForPeriod,
          totalPay: salaryForPeriod + hourlyPay,
        };
      })
    );

    const grandTotal = payrollSummary.reduce(
      (sum, item) => sum + item.totalPay,
      0
    );

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      month,
      year,
      staff: payrollSummary,
      grandTotal,
    };
  }

  /**
   * Generate secure random password
   * 12 characters: uppercase, lowercase, numbers, special characters
   */
  private generateSecurePassword(): string {
    const length = 12;
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Excluded I, O for clarity
    const lowercase = "abcdefghijkmnopqrstuvwxyz"; // Excluded l for clarity
    const numbers = "23456789"; // Excluded 0, 1 for clarity
    const special = "!@#$%&*";
    
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = "";
    
    // Ensure at least one character from each category
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password to randomize character positions
    return password
      .split("")
      .sort(() => crypto.randomInt(-1, 2))
      .join("");
  }
}

