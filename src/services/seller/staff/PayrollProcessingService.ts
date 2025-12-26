// @ts-nocheck
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";
import { emailService } from "../../EmailService";
import { TransactionType, ExpenseCategory } from "@prisma/client";
import { accountMappingService } from "../accounting/AccountMappingService";
export class PayrollProcessingService {

  /**
   * Process payroll for active staff
   * Creates payslips, sends emails, and creates accounting entries
   */
  async processPayroll(
    sellerId: string,
    period: "weekly" | "monthly",
    month?: number,
    year?: number,
    weekStart?: Date
  ) {
    logger.info("Processing payroll", {
      sellerId,
      period,
      month,
      year,
      weekStart,
    });

    // Check if PayrollRun model exists (Prisma client needs to be regenerated)
    if (!prisma.payrollRun) {
      throw new Error(
        "PayrollRun model not found. Please run 'npx prisma generate' to regenerate Prisma client after schema changes."
      );
    }

    // Calculate date range
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

    // Check if payroll already exists for this period
    const existingPayroll = await prisma.payrollRun.findFirst({
      where: {
        sellerId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
      },
    });

    if (existingPayroll) {
      throw new Error(
        `Payroll already processed for ${period} period ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
      );
    }

    // Get all active staff members
    const staff = await prisma.sellerStaff.findMany({
      where: {
        sellerId,
        isActive: true,
      },
    });

    if (staff.length === 0) {
      throw new Error("No active staff members found");
    }

    // Create payroll run
    const payrollRun = await prisma.payrollRun.create({
      data: {
        sellerId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
        month: period === "monthly" ? month : null,
        year: period === "monthly" ? year : null,
        weekStart: period === "weekly" ? weekStart : null,
        totalAmount: 0, // Will update after calculating
        staffCount: staff.length,
        payslipsCount: 0, // Will update after creating payslips
        status: "PENDING",
        processedBy: sellerId,
      },
    });

    let totalAmount = 0;
    const payslips = [];

    // Process each staff member
    for (const member of staff) {
      // Get time logs for the period
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
      const salaryForPeriod =
        period === "weekly"
          ? member.salary / 4.33 // Average weeks per month
          : member.salary;

      const grossPay = salaryForPeriod + hourlyPay;
      const netPay = grossPay; // No deductions for now

      // Create payslip
      const payslip = await prisma.staffPayslip.create({
        data: {
          staffId: member.id,
          sellerId,
          payrollRunId: payrollRun.id,
          periodStart: startDate,
          periodEnd: endDate,
          grossPay,
          totalHours: totalHours > 0 ? totalHours : null,
          hourlyPay: hourlyPay > 0 ? hourlyPay : null,
          salaryForPeriod,
          netPay,
        },
      });

      totalAmount += netPay;
      payslips.push(payslip);

      // Send payslip email
      try {
        await this.sendPayslipEmail(member, payslip, period, startDate, endDate);
        
        // Update payslip with email sent status
        await prisma.staffPayslip.update({
          where: { id: payslip.id },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      } catch (error: any) {
        logger.error("Failed to send payslip email", {
          staffId: member.id,
          payslipId: payslip.id,
          error: error.message,
        });
        // Continue processing even if email fails
      }
    }

    // Update payroll run with totals
    const updatedPayrollRun = await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalAmount,
        payslipsCount: payslips.length,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    // Create accounting ledger entry for total payroll expense
    try {
      const accountId = await accountMappingService.getAccountIdForTransaction(
        TransactionType.EXPENSE,
        ExpenseCategory.WAGES
      );

      await prisma.sellerLedger.create({
        data: {
          sellerId,
          accountId,
          transactionDate: new Date(),
          type: "EXPENSE",
          category: "WAGES",
          amountUSD: totalAmount,
          description: `Payroll ${period} - ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]} - ${payslips.length} staff members`,
          referenceId: payrollRun.id,
          balance: 0, // Will be calculated by financial summary
          debit: totalAmount,
          credit: 0,
        },
      });

      logger.info("Accounting ledger entry created for payroll", {
        sellerId,
        payrollRunId: payrollRun.id,
        amount: totalAmount,
      });
    } catch (error: any) {
      logger.error("Failed to create accounting ledger entry", {
        sellerId,
        payrollRunId: payrollRun.id,
        error: error.message,
      });
      // Don't fail payroll if accounting entry fails
    }

    // Log activity
    for (const member of staff) {
      await prisma.staffActivityLog.create({
        data: {
          staffId: member.id,
          sellerId,
          activityType: "OTHER",
          description: `Payroll processed for ${period} period`,
          metadata: {
            payrollRunId: payrollRun.id,
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
          },
        },
      });
    }

    logger.info("Payroll processed successfully", {
      sellerId,
      payrollRunId: payrollRun.id,
      staffCount: staff.length,
      totalAmount,
    });

    return {
      payrollRun: updatedPayrollRun,
      payslips,
      totalAmount,
    };
  }

  /**
   * Send payslip email to staff member
   */
  private async sendPayslipEmail(
    staff: any,
    payslip: any,
    period: string,
    startDate: Date,
    endDate: Date
  ) {
    const periodLabel =
      period === "weekly"
        ? `Week of ${startDate.toLocaleDateString()}`
        : `${startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .payslip-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; font-weight: bold; font-size: 1.1em; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Payslip - ${periodLabel}</h1>
    </div>
    <div class="content">
      <p>Dear ${staff.firstName} ${staff.lastName},</p>
      <p>Your payslip for ${periodLabel} has been processed.</p>
      
      <div class="payslip-details">
        <div class="detail-row">
          <span>Period:</span>
          <span>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span>Position:</span>
          <span>${staff.position}</span>
        </div>
        <div class="detail-row">
          <span>Department:</span>
          <span>${staff.department}</span>
        </div>
        ${payslip.totalHours ? `
        <div class="detail-row">
          <span>Total Hours:</span>
          <span>${payslip.totalHours.toFixed(2)} hours</span>
        </div>
        ` : ""}
        ${payslip.hourlyPay ? `
        <div class="detail-row">
          <span>Hourly Pay:</span>
          <span>$${payslip.hourlyPay.toFixed(2)}</span>
        </div>
        ` : ""}
        <div class="detail-row">
          <span>Salary for Period:</span>
          <span>$${payslip.salaryForPeriod.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span>Gross Pay:</span>
          <span>$${payslip.grossPay.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span>Net Pay:</span>
          <span>$${payslip.netPay.toFixed(2)}</span>
        </div>
      </div>
      
      <p>If you have any questions about your payslip, please contact your manager.</p>
    </div>
    <div class="footer">
      <p><strong>Simbi Market</strong></p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
PAYSLIP - ${periodLabel}

Dear ${staff.firstName} ${staff.lastName},

Your payslip for ${periodLabel} has been processed.

Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Position: ${staff.position}
Department: ${staff.department}
${payslip.totalHours ? `Total Hours: ${payslip.totalHours.toFixed(2)} hours\n` : ""}
${payslip.hourlyPay ? `Hourly Pay: $${payslip.hourlyPay.toFixed(2)}\n` : ""}
Salary for Period: $${payslip.salaryForPeriod.toFixed(2)}
Gross Pay: $${payslip.grossPay.toFixed(2)}
Net Pay: $${payslip.netPay.toFixed(2)}

If you have any questions about your payslip, please contact your manager.

---
Simbi Market
This is an automated message. Please do not reply to this email.
    `;

    await emailService.sendEmail({
      to: staff.email,
      toName: `${staff.firstName} ${staff.lastName}`,
      subject: `Your Payslip - ${periodLabel}`,
      htmlBody: htmlContent,
      textBody: textContent,
      module: "payroll",
    });
  }

  /**
   * Get payroll runs for seller
   */
  async getPayrollRuns(
    sellerId: string,
    filters?: {
      period?: "weekly" | "monthly";
      startDate?: Date;
      endDate?: Date;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId,
    };

    if (filters?.period) {
      where.period = filters.period;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.periodStart = {};
      if (filters.startDate) {
        where.periodStart.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.periodStart.lte = filters.endDate;
      }
    }

    // Check if PayrollRun model exists (Prisma client needs to be regenerated)
    if (!prisma.payrollRun) {
      throw new Error(
        "PayrollRun model not found. Please run 'npx prisma generate' to regenerate Prisma client."
      );
    }

    const total = await prisma.payrollRun.count({ where });

    const payrollRuns = await prisma.payrollRun.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        payslips: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true,
                department: true,
              },
            },
          },
        },
      },
    });

    return {
      payrollRuns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payroll run with details
   */
  async getPayrollRun(sellerId: string, payrollRunId: string) {
    // Check if PayrollRun model exists (Prisma client needs to be regenerated)
    if (!prisma.payrollRun) {
      throw new Error(
        "PayrollRun model not found. Please run 'npx prisma generate' to regenerate Prisma client."
      );
    }

    const payrollRun = await prisma.payrollRun.findFirst({
      where: {
        id: payrollRunId,
        sellerId,
      },
      include: {
        payslips: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!payrollRun) {
      throw new Error("Payroll run not found");
    }

    return payrollRun;
  }
}

export const payrollProcessingService = new PayrollProcessingService();

