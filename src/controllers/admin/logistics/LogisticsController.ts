// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { LogisticsManagementService } from "../../../services/admin/logistics/LogisticsManagementService";
import { logger } from "../../../utils/logger";
import {
  adminAuditService,
  AdminAuditAction,
} from "../../../services/admin/audit/AdminAuditService";

export class LogisticsController {
  private logisticsService: LogisticsManagementService;

  constructor() {
    this.logisticsService = new LogisticsManagementService();
  }

  // GET /api/admin/logistics/carriers
  getAllCarriers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const carriers = await this.logisticsService.getAllCarriers();

      res.status(200).json({
        success: true,
        data: carriers,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllCarriers", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch carriers",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/carriers/:id
  getCarrierById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const carrier = await this.logisticsService.getCarrierById(id);

      if (!carrier) {
        res.status(404).json({
          success: false,
          message: "Carrier not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: carrier,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCarrierById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch carrier",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/logistics/carriers
  createCarrier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const carrier = await this.logisticsService.createCarrier(req.body, req.admin.id);

      await adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.CARRIER_CREATED,
        entityType: "Carrier",
        entityId: carrier.id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: { code: carrier.code, name: carrier.name },
      });

      res.status(201).json({
        success: true,
        message: "Carrier created successfully",
        data: carrier,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createCarrier", { error: error.message });
      const msg = error.message || "Failed to create carrier";
      const clientError =
        /is required|already exists|Send JSON field|Unique constraint/i.test(msg) ||
        msg.includes("P2002");
      res.status(clientError ? 400 : 500).json({
        success: false,
        message: msg,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/logistics/carriers/:id
  updateCarrier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const carrier = await this.logisticsService.updateCarrier(id, req.body, req.admin.id);

      await adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.CARRIER_UPDATED,
        entityType: "Carrier",
        entityId: id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: { fields: Object.keys(req.body || {}) },
      });

      res.status(200).json({
        success: true,
        message: "Carrier updated successfully",
        data: carrier,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateCarrier", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update carrier",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // DELETE /api/admin/logistics/carriers/:id
  deleteCarrier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      await this.logisticsService.deleteCarrier(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Carrier deactivated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in deleteCarrier", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete carrier",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/shipments
  getAllShipments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      const shipments = await this.logisticsService.getAllShipments(status as any);

      res.status(200).json({
        success: true,
        data: shipments,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllShipments", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch shipments",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/shipments/:id
  getShipmentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const shipment = await this.logisticsService.getShipmentById(id);

      if (!shipment) {
        res.status(404).json({
          success: false,
          message: "Shipment not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: shipment,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getShipmentById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch shipment",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/logistics/shipments
  createShipment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shipment = await this.logisticsService.createShipment(req.body, req.admin.id);

      res.status(201).json({
        success: true,
        message: "Shipment created successfully",
        data: shipment,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createShipment", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create shipment",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/logistics/shipments/:id
  updateShipmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const { status, location, notes } = req.body;

      if (!status || !location) {
        res.status(400).json({
          success: false,
          message: "status and location are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shipment = await this.logisticsService.updateShipmentStatus(
        id,
        status,
        location,
        notes || "",
        req.admin.id
      );

      res.status(200).json({
        success: true,
        message: "Shipment status updated successfully",
        data: shipment,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateShipmentStatus", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update shipment status",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/carriers/:id/performance
  getCarrierPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const performance = await this.logisticsService.getCarrierPerformance(id);

      res.status(200).json({
        success: true,
        data: performance,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCarrierPerformance", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch carrier performance",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/analytics
  getLogisticsAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const analytics = await this.logisticsService.getLogisticsAnalytics();

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getLogisticsAnalytics", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch logistics analytics",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/regions
  listLogisticsRegions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const regions = await this.logisticsService.listLogisticsRegions();
      res.status(200).json({
        success: true,
        data: regions,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in listLogisticsRegions", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch logistics regions",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/logistics/regions
  createLogisticsRegion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const { regionCode, name, primaryCarrierId, failoverCarrierIds } = req.body || {};
      if (!regionCode || !primaryCarrierId) {
        res.status(400).json({
          success: false,
          message: "regionCode and primaryCarrierId are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const region = await this.logisticsService.createLogisticsRegion({
        regionCode,
        name,
        primaryCarrierId,
        failoverCarrierIds: Array.isArray(failoverCarrierIds) ? failoverCarrierIds : [],
      });

      await adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.REGION_CREATED,
        entityType: "LogisticsRegion",
        entityId: region.id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: { regionCode, primaryCarrierId },
      });

      res.status(201).json({
        success: true,
        message: "Region created",
        data: region,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createLogisticsRegion", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create region",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/logistics/regions/:id
  updateLogisticsRegion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const { regionCode, name, primaryCarrierId, failoverCarrierIds } = req.body || {};
      const region = await this.logisticsService.updateLogisticsRegion(id, {
        regionCode,
        name,
        primaryCarrierId,
        failoverCarrierIds,
      });

      await adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.REGION_UPDATED,
        entityType: "LogisticsRegion",
        entityId: id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: { regionCode, primaryCarrierId },
      });

      res.status(200).json({
        success: true,
        message: "Region updated",
        data: region,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateLogisticsRegion", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update region",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // DELETE /api/admin/logistics/regions/:id
  deleteLogisticsRegion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      await this.logisticsService.deleteLogisticsRegion(id);
      res.status(200).json({
        success: true,
        message: "Region deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in deleteLogisticsRegion", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete region",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/logistics/shipping-matrix
  listShippingRateMatrices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rows = await this.logisticsService.listShippingRateMatrices();
      res.status(200).json({
        success: true,
        data: rows,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in listShippingRateMatrices", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch shipping rate matrix",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/logistics/shipping-matrix
  upsertShippingRateMatrix = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const b = req.body || {};
      if (!b.currency || !b.tier) {
        res.status(400).json({
          success: false,
          message: "currency and tier are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const row = await this.logisticsService.upsertShippingRateMatrix({
        currency: b.currency,
        tier: b.tier,
        maxLengthCm: Number(b.maxLengthCm),
        maxWidthCm: Number(b.maxWidthCm),
        maxHeightCm: Number(b.maxHeightCm),
        maxWeightKg: Number(b.maxWeightKg),
        baseCost: Number(b.baseCost),
        baselineEtaHours: Number(b.baselineEtaHours),
        isActive: b.isActive,
      });

      await adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.MATRIX_UPDATED,
        entityType: "ShippingRateMatrix",
        entityId: row.id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: { currency: b.currency, tier: b.tier },
      });

      res.status(200).json({
        success: true,
        message: "Matrix row saved",
        data: row,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in upsertShippingRateMatrix", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to save matrix row",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/logistics/shipments/poll-updates
  pollShipmentUpdates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.logisticsService.batchPollPendingShipments();

      res.status(200).json({
        success: true,
        data: result,
        message: `Polled ${result.checked} shipments, ${result.updated} updated`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in pollShipmentUpdates", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to poll shipment updates",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

