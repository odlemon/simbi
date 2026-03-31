// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { AdminFinancialPartnerService } from "../../../services/admin/financialPartners/AdminFinancialPartnerService";
import { logger } from "../../../utils/logger";

const service = new AdminFinancialPartnerService();

export class AdminFinancialPartnerController {
  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await service.list();
      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      logger.error("admin financial partners list", { error: e.message });
      res.status(500).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const row = await service.getById(req.params.id);
      if (!row) {
        res.status(404).json({
          success: false,
          message: "Not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: row,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const row = await service.create(req.body);
      res.status(201).json({
        success: true,
        data: service.sanitizePartner(row),
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(400).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const row = await service.update(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: service.sanitizePartner(row),
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      const code = e.message === "Financial partner not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  updateSecrets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const row = await service.updateSecrets(req.params.id, req.body || {});
      res.status(200).json({
        success: true,
        message: "Secrets updated",
        data: service.sanitizePartner(row),
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      const code = e.message === "Financial partner not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await service.delete(req.params.id);
      res.status(200).json({
        success: true,
        message: "Deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      const code = e.message.includes("Cannot delete") ? 400 : 500;
      res.status(code).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  listApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await service.listApplications({
        partnerId: req.query.partnerId as string,
        status: req.query.status as string,
        page: Number(req.query.page),
        limit: Number(req.query.limit),
      });
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
