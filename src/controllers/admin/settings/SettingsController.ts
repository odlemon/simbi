// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { SystemSettingsService } from "../../../services/admin/settings/SystemSettingsService";
import { CommercePricingService } from "../../../services/admin/settings/CommercePricingService";
import { logger } from "../../../utils/logger";

export class SettingsController {
  private settingsService: SystemSettingsService;
  private commercePricingService: CommercePricingService;

  constructor() {
    this.settingsService = new SystemSettingsService();
    this.commercePricingService = new CommercePricingService();
  }

  getCommercePricing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await this.commercePricingService.ensureDefaults();
      const data = await this.commercePricingService.getSnapshot();
      const shippingEngine = await this.commercePricingService.getShippingEngine();
      res.status(200).json({
        success: true,
        data: { ...data, shippingEngine },
        keys: {
          shippingMode: "commerce.shipping.mode",
          shippingEngine: "commerce.shipping.engine",
          shippingFlatRate: "commerce.shipping.flatRate",
          shippingDynamicPrice: "commerce.shipping.dynamicPrice",
          shippingDynamicDistanceKm: "commerce.shipping.dynamicDistanceKm",
          commissionPercent: "commerce.platform.commissionPercent",
          useAdvancedProductRules: "commerce.platform.useAdvancedProductRules",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCommercePricing", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch commerce pricing settings",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  updateCommercePricing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        shippingMode,
        shippingEngine,
        shippingFlatRate,
        shippingDynamicPrice,
        shippingDynamicDistanceKm,
        commissionPercent,
        useAdvancedProductRules,
      } = req.body || {};
      if (
        shippingMode === undefined &&
        shippingEngine === undefined &&
        shippingFlatRate === undefined &&
        shippingDynamicPrice === undefined &&
        shippingDynamicDistanceKm === undefined &&
        commissionPercent === undefined &&
        useAdvancedProductRules === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "Provide at least one of: shippingMode (fixed|distance), shippingEngine (legacy|carrier_v1), shippingFlatRate, shippingDynamicPrice, shippingDynamicDistanceKm, commissionPercent (0–100), useAdvancedProductRules (boolean)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const data = await this.commercePricingService.updateSnapshot(
        {
          shippingMode,
          shippingEngine,
          shippingFlatRate,
          shippingDynamicPrice,
          shippingDynamicDistanceKm,
          commissionPercent,
          useAdvancedProductRules,
        },
        req.admin.id
      );

      const shippingEngineOut = await this.commercePricingService.getShippingEngine();

      res.status(200).json({
        success: true,
        message: "Commerce pricing updated successfully",
        data: { ...data, shippingEngine: shippingEngineOut },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateCommercePricing", { error: error.message });
      const status = error.message?.includes("must be") ? 400 : 500;
      res.status(status).json({
        success: false,
        message: status === 400 ? error.message : "Failed to update commerce pricing",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/settings
  getAllSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const settings = await this.settingsService.getAllSettings();

      res.status(200).json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllSettings", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/settings/:key
  getSettingByKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const setting = await this.settingsService.getSettingByKey(key);

      if (!setting) {
        res.status(404).json({
          success: false,
          message: "Setting not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: setting,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSettingByKey", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch setting",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/settings/:key
  updateSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key } = req.params;
      const { value, dataType, description } = req.body;

      if (!value || !dataType) {
        res.status(400).json({
          success: false,
          message: "value and dataType are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const setting = await this.settingsService.upsertSetting(
        key,
        value,
        dataType,
        description,
        req.admin.id
      );

      res.status(200).json({
        success: true,
        message: "Setting updated successfully",
        data: setting,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateSetting", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update setting",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/settings
  createSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key, value, dataType, description } = req.body;

      if (!key || !value || !dataType) {
        res.status(400).json({
          success: false,
          message: "key, value, and dataType are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const setting = await this.settingsService.upsertSetting(
        key,
        value,
        dataType,
        description,
        req.admin.id
      );

      res.status(201).json({
        success: true,
        message: "Setting created successfully",
        data: setting,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createSetting", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to create setting",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // DELETE /api/admin/settings/:key
  deleteSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key } = req.params;
      await this.settingsService.deleteSetting(key, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Setting deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in deleteSetting", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to delete setting",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/settings/initialize-defaults
  initializeDefaults = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const count = await this.settingsService.initializeDefaults();

      res.status(200).json({
        success: true,
        message: `${count} default settings initialized`,
        data: { count },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in initializeDefaults", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to initialize defaults",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // MFA & PASSWORD COMPLIANCE MONITORING
  // ============================================================================

  // GET /api/admin/settings/mfa-status
  getMFAStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.settingsService.getMFAStatus();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getMFAStatus", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch MFA status",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/settings/password-compliance
  getPasswordCompliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.settingsService.getPasswordCompliance();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getPasswordCompliance", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch password compliance",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

