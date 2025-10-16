// @ts-nocheck
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { SellerEmployee, EmployeeShift, Payslip } from "@prisma/client";

interface CreateEmployeeData {
  sellerId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  position: string;
  department?: string;
  salary: number;
  hourlyRate?: number;
  bankAccountNumber?: string;
  bankName?: string;
  hiredDate: Date;
}

interface ClockInData {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export class HRManagementService {
  private prisma = dbConnection.getPrismaClient();

  // Geofence settings (in meters)
  private readonly GEOFENCE_RADIUS = 100; // 100 meters

  /**
   * Get all employees for a seller
   */
  async getSellerEmployees(sellerId: string): Promise<SellerEmployee[]> {
    try {
      return await this.prisma.sellerEmployee.findMany({
        where: { sellerId },
        orderBy: { hiredDate: "desc" },
      });
    } catch (error: any) {
      logger.error("Error fetching seller employees", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: string): Promise<SellerEmployee | null> {
    try {
      return await this.prisma.sellerEmployee.findUnique({
        where: { id: employeeId },
        include: {
          seller: { select: { businessName: true, businessAddress: true } },
        },
      }) as any;
    } catch (error: any) {
      logger.error("Error fetching employee", {
        error: error.message,
        employeeId,
      });
      throw error;
    }
  }

  /**
   * Create employee
   */
  async createEmployee(data: CreateEmployeeData, adminId: string): Promise<SellerEmployee> {
    try {
      // Check if national ID already exists
      const existing = await this.prisma.sellerEmployee.findUnique({
        where: { nationalId: data.nationalId },
      });

      if (existing) {
        throw new Error("Employee with this national ID already exists");
      }

      const employee = await this.prisma.sellerEmployee.create({
        data: {
          sellerId: data.sellerId,
          nationalId: data.nationalId,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber, // TODO: Encrypt in production
          email: data.email,
          position: data.position,
          department: data.department,
          salary: data.salary, // TODO: Encrypt in production
          hourlyRate: data.hourlyRate,
          bankAccountNumber: data.bankAccountNumber, // TODO: Encrypt in production
          bankName: data.bankName,
          hiredDate: data.hiredDate,
          isActive: true,
        },
      });

      logger.info("Employee created", {
        employeeId: employee.id,
        sellerId: data.sellerId,
        adminId,
      });

      return employee;
    } catch (error: any) {
      logger.error("Error creating employee", { error: error.message });
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(
    employeeId: string,
    data: Partial<CreateEmployeeData>,
    adminId: string
  ): Promise<SellerEmployee> {
    try {
      const employee = await this.prisma.sellerEmployee.update({
        where: { id: employeeId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.position && { position: data.position }),
          ...(data.department !== undefined && { department: data.department }),
          ...(data.salary !== undefined && { salary: data.salary }),
          ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
          ...(data.bankAccountNumber !== undefined && { bankAccountNumber: data.bankAccountNumber }),
          ...(data.bankName !== undefined && { bankName: data.bankName }),
        },
      });

      logger.info("Employee updated", { employeeId, adminId });
      return employee;
    } catch (error: any) {
      logger.error("Error updating employee", { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(employeeId: string, adminId: string): Promise<void> {
    try {
      await this.prisma.sellerEmployee.update({
        where: { id: employeeId },
        data: {
          isActive: false,
          terminatedDate: new Date(),
        },
      });

      logger.info("Employee terminated", { employeeId, adminId });
    } catch (error: any) {
      logger.error("Error terminating employee", { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Clock in
   */
  async clockIn(data: ClockInData): Promise<EmployeeShift> {
    try {
      // Check if employee has an open shift
      const openShift = await this.prisma.employeeShift.findFirst({
        where: {
          employeeId: data.employeeId,
          clockOutTime: null,
        },
      });

      if (openShift) {
        throw new Error("Employee already clocked in. Please clock out first.");
      }

      // Get employee's work location (from seller address)
      const employee = await this.prisma.sellerEmployee.findUnique({
        where: { id: data.employeeId },
        include: { seller: true },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      // TODO: Parse seller business address to get coordinates
      // For now, create shift without validation
      const shift = await this.prisma.employeeShift.create({
        data: {
          employeeId: data.employeeId,
          clockInTime: new Date(),
          clockInLocation: {
            lat: data.latitude,
            lng: data.longitude,
            accuracy: data.accuracy,
          },
          isValidated: false, // Will be validated by geofence check
        },
      });

      logger.info("Employee clocked in", {
        employeeId: data.employeeId,
        shiftId: shift.id,
      });

      return shift;
    } catch (error: any) {
      logger.error("Error clocking in", { error: error.message });
      throw error;
    }
  }

  /**
   * Clock out
   */
  async clockOut(employeeId: string, latitude: number, longitude: number, accuracy: number): Promise<EmployeeShift> {
    try {
      // Find open shift
      const openShift = await this.prisma.employeeShift.findFirst({
        where: {
          employeeId,
          clockOutTime: null,
        },
      });

      if (!openShift) {
        throw new Error("No open shift found. Please clock in first.");
      }

      // Calculate total hours
      const clockInTime = openShift.clockInTime;
      const clockOutTime = new Date();
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const shift = await this.prisma.employeeShift.update({
        where: { id: openShift.id },
        data: {
          clockOutTime,
          clockOutLocation: {
            lat: latitude,
            lng: longitude,
            accuracy,
          },
          totalHours: Math.round(totalHours * 100) / 100,
        },
      });

      logger.info("Employee clocked out", {
        employeeId,
        shiftId: shift.id,
        totalHours: shift.totalHours,
      });

      return shift;
    } catch (error: any) {
      logger.error("Error clocking out", { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Get employee shifts
   */
  async getEmployeeShifts(employeeId: string, limit: number = 30): Promise<EmployeeShift[]> {
    try {
      return await this.prisma.employeeShift.findMany({
        where: { employeeId },
        orderBy: { clockInTime: "desc" },
        take: limit,
      });
    } catch (error: any) {
      logger.error("Error fetching employee shifts", {
        error: error.message,
        employeeId,
      });
      throw error;
    }
  }

  /**
   * Validate shifts (geofence)
   */
  async validateShifts(): Promise<{ validated: number; failed: number }> {
    try {
      // Get all unvalidated shifts
      const shifts = await this.prisma.employeeShift.findMany({
        where: { isValidated: false },
        include: {
          employee: {
            include: { seller: true },
          },
        },
      });

      let validated = 0;
      let failed = 0;

      for (const shift of shifts) {
        // TODO: Implement proper geofence validation
        // For now, mark all as validated
        await this.prisma.employeeShift.update({
          where: { id: shift.id },
          data: { isValidated: true },
        });
        validated++;
      }

      logger.info("Shifts validated", { validated, failed });

      return { validated, failed };
    } catch (error: any) {
      logger.error("Error validating shifts", { error: error.message });
      throw error;
    }
  }

  /**
   * Generate payslips for a period
   */
  async generatePayslips(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
    adminId: string
  ): Promise<number> {
    try {
      const employees = await this.prisma.sellerEmployee.findMany({
        where: { sellerId, isActive: true },
      });

      let generated = 0;

      for (const employee of employees) {
        // Check if payslip already exists for this period
        const existing = await this.prisma.payslip.findFirst({
          where: {
            employeeId: employee.id,
            periodStart,
            periodEnd,
          },
        });

        if (existing) {
          continue;
        }

        // Calculate gross salary (base + overtime if hourly)
        let grossSalary = employee.salary;

        if (employee.hourlyRate) {
          // Get total hours for period
          const shifts = await this.prisma.employeeShift.findMany({
            where: {
              employeeId: employee.id,
              clockInTime: {
                gte: periodStart,
                lte: periodEnd,
              },
              isValidated: true,
            },
          });

          const totalHours = shifts.reduce((sum, shift) => sum + (shift.totalHours || 0), 0);
          grossSalary = totalHours * employee.hourlyRate;
        }

        // Calculate deductions (Zimbabwe tax rates)
        const payeDeduction = this.calculatePAYE(grossSalary);
        const nssaDeduction = grossSalary * 0.035; // 3.5% NSSA
        const netSalary = grossSalary - payeDeduction - nssaDeduction;

        // Create payslip
        await this.prisma.payslip.create({
          data: {
            employeeId: employee.id,
            periodStart,
            periodEnd,
            grossSalary,
            payeDeduction,
            nssaDeduction,
            otherDeductions: 0,
            netSalary,
            generatedAt: new Date(),
          },
        });

        generated++;
      }

      logger.info("Payslips generated", {
        sellerId,
        periodStart,
        periodEnd,
        count: generated,
        adminId,
      });

      return generated;
    } catch (error: any) {
      logger.error("Error generating payslips", { error: error.message });
      throw error;
    }
  }

  /**
   * Get employee payslips
   */
  async getEmployeePayslips(employeeId: string): Promise<Payslip[]> {
    try {
      return await this.prisma.payslip.findMany({
        where: { employeeId },
        orderBy: { periodEnd: "desc" },
      });
    } catch (error: any) {
      logger.error("Error fetching employee payslips", {
        error: error.message,
        employeeId,
      });
      throw error;
    }
  }

  /**
   * Get payslip by ID
   */
  async getPayslipById(payslipId: string): Promise<Payslip | null> {
    try {
      return await this.prisma.payslip.findUnique({
        where: { id: payslipId },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              nationalId: true,
              position: true,
            },
          },
        },
      }) as any;
    } catch (error: any) {
      logger.error("Error fetching payslip", { error: error.message, payslipId });
      throw error;
    }
  }

  /**
   * Calculate PAYE (Pay As You Earn) tax - Zimbabwe rates
   */
  private calculatePAYE(grossSalary: number): number {
    // Simplified Zimbabwe PAYE calculation
    // TODO: Use actual tax brackets
    if (grossSalary <= 100000) {
      return 0; // Tax-free threshold
    } else if (grossSalary <= 300000) {
      return (grossSalary - 100000) * 0.20; // 20%
    } else if (grossSalary <= 600000) {
      return 40000 + (grossSalary - 300000) * 0.25; // 25%
    } else {
      return 115000 + (grossSalary - 600000) * 0.30; // 30%
    }
  }

  /**
   * Get payroll report for seller
   */
  async getPayrollReport(sellerId: string, periodStart: Date, periodEnd: Date): Promise<{
    totalEmployees: number;
    totalGrossSalary: number;
    totalPAYE: number;
    totalNSSA: number;
    totalNetSalary: number;
    payslips: Payslip[];
  }> {
    try {
      const payslips = await this.prisma.payslip.findMany({
        where: {
          employee: { sellerId },
          periodStart,
          periodEnd,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              nationalId: true,
            },
          },
        },
      });

      const totalGrossSalary = payslips.reduce((sum, p) => sum + p.grossSalary, 0);
      const totalPAYE = payslips.reduce((sum, p) => sum + p.payeDeduction, 0);
      const totalNSSA = payslips.reduce((sum, p) => sum + p.nssaDeduction, 0);
      const totalNetSalary = payslips.reduce((sum, p) => sum + p.netSalary, 0);

      return {
        totalEmployees: payslips.length,
        totalGrossSalary,
        totalPAYE,
        totalNSSA,
        totalNetSalary,
        payslips: payslips as any,
      };
    } catch (error: any) {
      logger.error("Error generating payroll report", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }
}


