// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { HRManagementService } from "../../../services/admin/hr/HRManagementService";
import { logger } from "../../../utils/logger";

export class HRController {
  private hrService: HRManagementService;

  constructor() {
    this.hrService = new HRManagementService();
  }

  // GET /api/admin/hr/sellers/:sellerId/employees
  getSellerEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.params;
      const employees = await this.hrService.getSellerEmployees(sellerId);

      res.status(200).json({
        success: true,
        data: employees,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSellerEmployees", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch employees",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/employees/:id
  getEmployeeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const employee = await this.hrService.getEmployeeById(id);

      if (!employee) {
        res.status(404).json({
          success: false,
          message: "Employee not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: employee,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getEmployeeById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch employee",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/hr/sellers/:sellerId/employees
  createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sellerId } = req.params;
      const employee = await this.hrService.createEmployee(
        { ...req.body, sellerId },
        req.admin.id
      );

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: employee,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createEmployee", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create employee",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/hr/employees/:id
  updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const employee = await this.hrService.updateEmployee(id, req.body, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: employee,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateEmployee", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update employee",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // DELETE /api/admin/hr/employees/:id
  terminateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      await this.hrService.terminateEmployee(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Employee terminated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in terminateEmployee", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to terminate employee",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/hr/shifts/clock-in
  clockIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeId, latitude, longitude, accuracy } = req.body;

      if (!employeeId || !latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: "employeeId, latitude, and longitude are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shift = await this.hrService.clockIn({
        employeeId,
        latitude,
        longitude,
        accuracy: accuracy || 0,
      });

      res.status(201).json({
        success: true,
        message: "Clocked in successfully",
        data: shift,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in clockIn", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to clock in",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/hr/shifts/clock-out
  clockOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeId, latitude, longitude, accuracy } = req.body;

      if (!employeeId || !latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: "employeeId, latitude, and longitude are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shift = await this.hrService.clockOut(
        employeeId,
        latitude,
        longitude,
        accuracy || 0
      );

      res.status(200).json({
        success: true,
        message: "Clocked out successfully",
        data: shift,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in clockOut", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to clock out",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/employees/:id/shifts
  getEmployeeShifts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 30 } = req.query;

      const shifts = await this.hrService.getEmployeeShifts(id, Number(limit));

      res.status(200).json({
        success: true,
        data: shifts,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getEmployeeShifts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch shifts",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/shifts/validate
  validateShifts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.hrService.validateShifts();

      res.status(200).json({
        success: true,
        message: "Shifts validated successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in validateShifts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to validate shifts",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/hr/payroll/generate
  generatePayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sellerId, periodStart, periodEnd } = req.body;

      if (!sellerId || !periodStart || !periodEnd) {
        res.status(400).json({
          success: false,
          message: "sellerId, periodStart, and periodEnd are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const count = await this.hrService.generatePayslips(
        sellerId,
        new Date(periodStart),
        new Date(periodEnd),
        req.admin.id
      );

      res.status(201).json({
        success: true,
        message: `${count} payslips generated successfully`,
        data: { count },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in generatePayslips", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to generate payslips",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/employees/:id/payslips
  getEmployeePayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const payslips = await this.hrService.getEmployeePayslips(id);

      res.status(200).json({
        success: true,
        data: payslips,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getEmployeePayslips", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch payslips",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/payslips/:id
  getPayslipById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const payslip = await this.hrService.getPayslipById(id);

      if (!payslip) {
        res.status(404).json({
          success: false,
          message: "Payslip not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: payslip,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getPayslipById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch payslip",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/hr/payroll/reports
  getPayrollReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId, periodStart, periodEnd } = req.query;

      if (!sellerId || !periodStart || !periodEnd) {
        res.status(400).json({
          success: false,
          message: "sellerId, periodStart, and periodEnd are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const report = await this.hrService.getPayrollReport(
        sellerId as string,
        new Date(periodStart as string),
        new Date(periodEnd as string)
      );

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getPayrollReport", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to generate payroll report",
        timestamp: new Date().toISOString(),
      });
    }
  };
}


