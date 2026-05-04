// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Carrier, CarrierStatus, Shipment, ShipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { assertPrismaLogisticsModels } from "../../../utils/assertPrismaLogisticsModels";
import { CarrierIntegrationService } from "../../shipping/CarrierIntegrationService";

interface CreateCarrierData {
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  apiEndpoint?: string;
  apiKey?: string;
  serviceLevels: any; // JSON array
  hasApiIntegration?: boolean;
  integrationConfig?: Record<string, unknown>;
  integrationSecrets?: Record<string, unknown>;
  slaConfig?: Record<string, unknown>;
  supportsWebhook?: boolean;
  pollingIntervalMinutes?: number;
  displayPriority?: number;
}

interface CreateShipmentData {
  orderId: string;
  carrierId: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  estimatedDelivery: Date;
}

export class LogisticsManagementService {
  private carrierIntegration = new CarrierIntegrationService();

  private sanitizeCarrier(c: Carrier): Record<string, unknown> {
    const row = c as any;
    const { apiKey, integrationSecretsJson, ...rest } = row;
    const secrets = (integrationSecretsJson || {}) as Record<string, unknown>;
    const integrationSecretsMasked =
      Object.keys(secrets).length > 0
        ? Object.fromEntries(Object.keys(secrets).map((k) => [k, "***"]))
        : null;
    return {
      ...rest,
      apiKey: apiKey ? "***" : null,
      integrationSecretsMasked,
    };
  }

  /**
   * Get all carriers
   */
  async getAllCarriers(): Promise<Record<string, unknown>[]> {
    try {
      const rows = await prisma.carrier.findMany({
        orderBy: { name: "asc" },
      });
      return rows.map((c) => this.sanitizeCarrier(c));
    } catch (error: any) {
      logger.error("Error fetching carriers", { error: error.message });
      throw error;
    }
  }

  /**
   * Get carrier by ID
   */
  async getCarrierById(carrierId: string): Promise<Record<string, unknown> | null> {
    try {
      const c = await prisma.carrier.findUnique({
        where: { id: carrierId },
      });
      return c ? this.sanitizeCarrier(c) : null;
    } catch (error: any) {
      logger.error("Error fetching carrier", { error: error.message, carrierId });
      throw error;
    }
  }

  /**
   * Create carrier
   */
  async createCarrier(data: CreateCarrierData, adminId: string): Promise<Record<string, unknown>> {
    try {
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const code = typeof data.code === "string" ? data.code.trim() : "";
      const contactEmail = typeof data.contactEmail === "string" ? data.contactEmail.trim() : "";
      const contactPhone = typeof data.contactPhone === "string" ? data.contactPhone.trim() : "";

      if (!name) {
        throw new Error("Carrier name is required");
      }
      if (!code) {
        throw new Error(
          "Carrier code is required (short unique identifier, e.g. FEDEX_ZW). Send JSON field `code`."
        );
      }
      if (!contactEmail) {
        throw new Error("contactEmail is required");
      }
      if (!contactPhone) {
        throw new Error("contactPhone is required");
      }

      // Check if carrier code already exists
      const existing = await prisma.carrier.findUnique({
        where: { code },
      });

      if (existing) {
        throw new Error("Carrier with this code already exists");
      }

      const hasApi =
        data.hasApiIntegration ??
        !!(data.apiEndpoint || data.integrationConfig);

      const carrier = await prisma.carrier.create({
        data: {
          name,
          code,
          contactEmail,
          contactPhone,
          apiEndpoint: data.apiEndpoint,
          apiKey: data.apiKey,
          serviceLevels: data.serviceLevels ?? [],
          status: CarrierStatus.ACTIVE,
          hasApiIntegration: hasApi,
          integrationConfigJson: data.integrationConfig ?? undefined,
          integrationSecretsJson: data.integrationSecrets ?? undefined,
          slaConfigJson: data.slaConfig ?? undefined,
          supportsWebhook: data.supportsWebhook ?? true,
          pollingIntervalMinutes: data.pollingIntervalMinutes ?? 30,
          displayPriority: data.displayPriority ?? 0,
        },
      });

      logger.info("Carrier created", { carrierId: carrier.id, name: carrier.name, adminId });
      return this.sanitizeCarrier(carrier);
    } catch (error: any) {
      logger.error("Error creating carrier", { error: error.message });
      throw error;
    }
  }

  /**
   * Update carrier
   */
  async updateCarrier(
    carrierId: string,
    data: Partial<CreateCarrierData>,
    adminId: string
  ): Promise<Record<string, unknown>> {
    try {
      const carrier = await prisma.carrier.update({
        where: { id: carrierId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.contactEmail && { contactEmail: data.contactEmail }),
          ...(data.contactPhone && { contactPhone: data.contactPhone }),
          ...(data.apiEndpoint !== undefined && { apiEndpoint: data.apiEndpoint }),
          ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
          ...(data.serviceLevels && { serviceLevels: data.serviceLevels }),
          ...(data.hasApiIntegration !== undefined && {
            hasApiIntegration: data.hasApiIntegration,
          }),
          ...(data.integrationConfig !== undefined && {
            integrationConfigJson: data.integrationConfig,
          }),
          ...(data.integrationSecrets !== undefined && {
            integrationSecretsJson: data.integrationSecrets,
          }),
          ...(data.slaConfig !== undefined && { slaConfigJson: data.slaConfig }),
          ...(data.supportsWebhook !== undefined && {
            supportsWebhook: data.supportsWebhook,
          }),
          ...(data.pollingIntervalMinutes !== undefined && {
            pollingIntervalMinutes: data.pollingIntervalMinutes,
          }),
          ...(data.displayPriority !== undefined && {
            displayPriority: data.displayPriority,
          }),
        },
      });

      logger.info("Carrier updated", { carrierId, adminId });
      return this.sanitizeCarrier(carrier);
    } catch (error: any) {
      logger.error("Error updating carrier", { error: error.message, carrierId });
      throw error;
    }
  }

  /**
   * Delete carrier
   */
  async deleteCarrier(carrierId: string, adminId: string): Promise<void> {
    try {
      // Check if carrier has active shipments
      const activeShipments = await prisma.shipment.count({
        where: {
          carrierId,
          status: { in: ["PENDING_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
        },
      });

      if (activeShipments > 0) {
        throw new Error("Cannot delete carrier with active shipments");
      }

      await prisma.carrier.update({
        where: { id: carrierId },
        data: { status: CarrierStatus.INACTIVE },
      });

      logger.info("Carrier deactivated", { carrierId, adminId });
    } catch (error: any) {
      logger.error("Error deleting carrier", { error: error.message, carrierId });
      throw error;
    }
  }

  /**
   * Get all shipments with filters
   */
  async getAllShipments(status?: ShipmentStatus): Promise<any[]> {
    try {
      const shipments = await prisma.shipment.findMany({
        where: status ? { status } : undefined,
        include: {
          order: {
            select: {
              orderNumber: true,
              buyer: { select: { firstName: true, lastName: true } },
              seller: { select: { businessName: true } },
            },
          },
          carrier: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return shipments;
    } catch (error: any) {
      logger.error("Error fetching shipments", { error: error.message });
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(shipmentId: string): Promise<any> {
    assertPrismaLogisticsModels(prisma);
    try {
      return await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          order: {
            include: {
              buyer: true,
              seller: true,
              items: true,
            },
          },
          carrier: true,
          trackingEvents: { orderBy: { createdAt: "asc" } },
        },
      });
    } catch (error: any) {
      logger.error("Error fetching shipment", { error: error.message, shipmentId });
      throw error;
    }
  }

  /**
   * Create shipment
   */
  async createShipment(data: CreateShipmentData, adminId: string): Promise<Shipment> {
    try {
      // Generate tracking number
      const trackingNumber = this.generateTrackingNumber();

      const shipment = await prisma.shipment.create({
        data: {
          orderId: data.orderId,
          carrierId: data.carrierId,
          trackingNumber,
          weight: data.weight,
          length: data.length,
          width: data.width,
          height: data.height,
          status: ShipmentStatus.PENDING_PICKUP,
          estimatedDelivery: data.estimatedDelivery,
          trackingHistory: [
            {
              status: "PENDING_PICKUP",
              timestamp: new Date().toISOString(),
              location: "Origin",
              notes: "Shipment created",
            },
          ],
        },
      });

      logger.info("Shipment created", { shipmentId: shipment.id, trackingNumber, adminId });
      return shipment;
    } catch (error: any) {
      logger.error("Error creating shipment", { error: error.message });
      throw error;
    }
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    location: string,
    notes: string,
    adminId: string,
    meta?: {
      rawStatus?: string;
      rawPayload?: unknown;
      source?: string;
    }
  ): Promise<Shipment> {
    try {
      assertPrismaLogisticsModels(prisma);
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      // Update tracking history
      const trackingHistory = (shipment.trackingHistory as any[]) || [];
      trackingHistory.push({
        status,
        timestamp: new Date().toISOString(),
        location,
        notes,
      });

      // Update actual delivery date if delivered
      const updateData: any = {
        status,
        trackingHistory,
      };

      if (status === ShipmentStatus.DELIVERED) {
        updateData.actualDelivery = new Date();

        // Update order status
        await prisma.order.update({
          where: { id: shipment.orderId },
          data: {
            status: "DELIVERED",
            actualDeliveryDate: new Date(),
          },
        });
      }

      const updatedShipment = await prisma.shipment.update({
        where: { id: shipmentId },
        data: updateData,
      });

      const source =
        meta?.source ||
        (adminId === "SYSTEM_WEBHOOK" ? "WEBHOOK" : "ADMIN");

      await prisma.shipmentTrackingEvent.create({
        data: {
          shipmentId,
          standardStatus: status,
          rawStatus: meta?.rawStatus ?? null,
          location,
          notes,
          source,
          rawPayload: meta?.rawPayload
            ? (meta.rawPayload as object)
            : undefined,
        },
      });

      logger.info("Shipment status updated", {
        shipmentId,
        status,
        adminId,
      });

      return updatedShipment;
    } catch (error: any) {
      logger.error("Error updating shipment status", {
        error: error.message,
        shipmentId,
      });
      throw error;
    }
  }

  /**
   * Get carrier performance metrics
   */
  async getCarrierPerformance(carrierId: string): Promise<{
    totalShipments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    avgDeliveryDays: number;
    onTimeRate: number;
  }> {
    try {
      const shipments = await prisma.shipment.findMany({
        where: {
          carrierId,
          status: ShipmentStatus.DELIVERED,
          actualDelivery: { not: null },
        },
      });

      let onTimeDeliveries = 0;
      let totalDeliveryDays = 0;

      for (const shipment of shipments) {
        if (shipment.actualDelivery && shipment.estimatedDelivery) {
          const isOnTime = shipment.actualDelivery <= shipment.estimatedDelivery;
          if (isOnTime) onTimeDeliveries++;

          // Calculate delivery days
          const deliveryDays =
            (shipment.actualDelivery.getTime() - shipment.createdAt.getTime()) /
            (1000 * 60 * 60 * 24);
          totalDeliveryDays += deliveryDays;
        }
      }

      const totalShipments = shipments.length;
      const lateDeliveries = totalShipments - onTimeDeliveries;
      const avgDeliveryDays = totalShipments > 0 ? totalDeliveryDays / totalShipments : 0;
      const onTimeRate = totalShipments > 0 ? (onTimeDeliveries / totalShipments) * 100 : 0;

      return {
        totalShipments,
        onTimeDeliveries,
        lateDeliveries,
        avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
      };
    } catch (error: any) {
      logger.error("Error calculating carrier performance", {
        error: error.message,
        carrierId,
      });
      throw error;
    }
  }

  /**
   * Get logistics analytics
   */
  async getLogisticsAnalytics(): Promise<{
    totalShipments: number;
    inTransit: number;
    delivered: number;
    failed: number;
    avgDeliveryTime: number;
    topCarriers: Array<{ name: string; shipments: number }>;
  }> {
    try {
      const [
        totalShipments,
        inTransit,
        delivered,
        failed,
        allDelivered,
        carrierStats,
      ] = await Promise.all([
        prisma.shipment.count(),
        prisma.shipment.count({ where: { status: "IN_TRANSIT" } }),
        prisma.shipment.count({ where: { status: "DELIVERED" } }),
        prisma.shipment.count({ where: { status: "FAILED_DELIVERY" } }),
        prisma.shipment.findMany({
          where: { status: "DELIVERED", actualDelivery: { not: null } },
          select: { createdAt: true, actualDelivery: true },
        }),
        prisma.shipment.groupBy({
          by: ["carrierId"],
          _count: true,
          orderBy: { _count: { carrierId: "desc" } },
          take: 5,
        }),
      ]);

      // Calculate average delivery time
      let totalDeliveryTime = 0;
      for (const shipment of allDelivered) {
        if (shipment.actualDelivery) {
          const deliveryTime =
            shipment.actualDelivery.getTime() - shipment.createdAt.getTime();
          totalDeliveryTime += deliveryTime;
        }
      }
      const avgDeliveryTime =
        allDelivered.length > 0
          ? totalDeliveryTime / allDelivered.length / (1000 * 60 * 60 * 24)
          : 0;

      // Get carrier names
      const topCarriers = await Promise.all(
        carrierStats.map(async (stat) => {
          const carrier = await prisma.carrier.findUnique({
            where: { id: stat.carrierId },
            select: { name: true },
          });
          return {
            name: carrier?.name || "Unknown",
            shipments: stat._count,
          };
        })
      );

      return {
        totalShipments,
        inTransit,
        delivered,
        failed,
        avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
        topCarriers,
      };
    } catch (error: any) {
      logger.error("Error fetching logistics analytics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate tracking number
   */
  private generateTrackingNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SIMBI${timestamp}${random}`;
  }

  /**
   * Process webhook from carrier API
   */
  async processCarrierWebhook(
    carrierId: string,
    webhookData: {
      trackingNumber: string;
      status: string;
      location: string;
      notes: string;
      timestamp: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find shipment by tracking number
      const shipment = await prisma.shipment.findUnique({
        where: { trackingNumber: webhookData.trackingNumber },
      });

      if (!shipment) {
        logger.warn("Webhook received for unknown tracking number", {
          trackingNumber: webhookData.trackingNumber,
          carrierId,
        });
        return {
          success: false,
          message: "Tracking number not found",
        };
      }

      // Verify carrier matches
      if (shipment.carrierId !== carrierId) {
        logger.error("Webhook carrier mismatch", {
          trackingNumber: webhookData.trackingNumber,
          expectedCarrier: shipment.carrierId,
          receivedCarrier: carrierId,
        });
        return {
          success: false,
          message: "Carrier mismatch",
        };
      }

      // Map external status to internal status
      const internalStatus = this.mapCarrierStatusToInternal(webhookData.status);

      // Update shipment
      await this.updateShipmentStatus(
        shipment.id,
        internalStatus,
        webhookData.location,
        `[Webhook] ${webhookData.notes}`,
        "SYSTEM_WEBHOOK",
        {
          rawStatus: webhookData.status,
          source: "WEBHOOK",
          rawPayload: webhookData,
        }
      );

      logger.info("Webhook processed successfully", {
        trackingNumber: webhookData.trackingNumber,
        status: internalStatus,
        carrierId,
      });

      return {
        success: true,
        message: "Webhook processed successfully",
      };
    } catch (error: any) {
      logger.error("Error processing webhook", {
        error: error.message,
        webhookData,
      });
      return {
        success: false,
        message: error.message || "Webhook processing failed",
      };
    }
  }

  /**
   * Map carrier-specific status codes to internal status
   */
  private mapCarrierStatusToInternal(carrierStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      // DHL status codes
      "transit": "IN_TRANSIT",
      "picked-up": "IN_TRANSIT",
      "delivered": "DELIVERED",
      "out-for-delivery": "OUT_FOR_DELIVERY",
      "failed": "FAILED_DELIVERY",
      "returned": "RETURNED_TO_SENDER",

      // FedEx-style short codes
      it: "IN_TRANSIT",
      od: "OUT_FOR_DELIVERY",
      dl: "DELIVERED",
      de: "FAILED_DELIVERY",

      // Generic + human labels
      pending: "PENDING_PICKUP",
      "pending-pickup": "PENDING_PICKUP",
      "pendingpickup": "PENDING_PICKUP",
      "in-transit": "IN_TRANSIT",
      "out-for-delivery": "OUT_FOR_DELIVERY",
      exception: "FAILED_DELIVERY",
    };

    const normalizedStatus = carrierStatus.toLowerCase().replace(/[_\s]/g, "-");
    return statusMap[normalizedStatus] || "IN_TRANSIT";
  }

  /**
   * Poll carrier API for shipment updates (fallback when webhooks unavailable)
   */
  async pollCarrierForUpdates(shipmentId: string): Promise<void> {
    try {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { carrier: true },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      if (["DELIVERED", "FAILED_DELIVERY", "RETURNED_TO_SENDER"].includes(shipment.status)) {
        return;
      }

      const carrier = shipment.carrier;
      const cfg = (carrier.integrationConfigJson as any) || {};
      if (!carrier.hasApiIntegration || !cfg.trackingPollPath) {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { lastPolledAt: new Date() },
        });
        return;
      }

      const poll = await this.carrierIntegration.pollTracking(
        carrier,
        shipment.trackingNumber
      );

      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { lastPolledAt: new Date() },
      });

      if (!poll.ok || !poll.status) {
        return;
      }

      const internal = this.mapCarrierStatusToInternal(poll.status);
      if (internal === shipment.status) {
        return;
      }

      await this.updateShipmentStatus(
        shipmentId,
        internal,
        poll.location || "Unknown",
        poll.notes || "[Poll]",
        "SYSTEM_POLL",
        {
          rawStatus: poll.status,
          source: "POLL",
          rawPayload: poll.raw,
        }
      );
    } catch (error: any) {
      logger.error("Error polling carrier API", {
        error: error.message,
        shipmentId,
      });
    }
  }

  /**
   * Batch poll all pending shipments (cron job - every 30 minutes)
   */
  async batchPollPendingShipments(): Promise<{
    checked: number;
    updated: number;
  }> {
    try {
      // Get all non-final-status shipments
      const pendingShipments = await prisma.shipment.findMany({
        where: {
          status: {
            in: ["PENDING_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
        include: { carrier: true },
      });

      let updated = 0;
      const now = Date.now();

      for (const shipment of pendingShipments) {
        try {
          const intervalMin = shipment.carrier?.pollingIntervalMinutes ?? 30;
          const last = shipment.lastPolledAt?.getTime() ?? 0;
          if (last && now - last < intervalMin * 60 * 1000) {
            continue;
          }
          await this.pollCarrierForUpdates(shipment.id);
          updated++;
        } catch (error) {
          logger.error("Failed to poll shipment", { shipmentId: shipment.id });
        }
      }

      logger.info("Batch polling completed", {
        checked: pendingShipments.length,
        updated,
      });

      return {
        checked: pendingShipments.length,
        updated,
      };
    } catch (error: any) {
      logger.error("Error in batch polling", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate pre-paid return label for return shipment
   */
  async generateReturnLabel(
    orderId: string,
    returnAddress: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      province: string;
      postalCode?: string;
      phoneNumber: string;
    },
    originAddress: string
  ): Promise<{ trackingNumber: string; labelUrl: string; cost: number }> {
    try {
      // TODO: Integrate with actual carrier API to generate return label
      // For now, generate a mock return label

      const trackingNumber = `RET${Date.now().toString().slice(-8)}`;
      const labelUrl = `https://labels.simbimarket.com/returns/${trackingNumber}.pdf`;
      
      // Calculate return shipping cost (simplified - should use carrier API)
      const cost = 15.0; // Default return shipping cost

      logger.info(`Return label generated for order ${orderId}: ${trackingNumber}`);

      return {
        trackingNumber,
        labelUrl,
        cost,
      };
    } catch (error: any) {
      logger.error("Error generating return label:", error);
      throw error;
    }
  }

  /**
   * Calculate return shipping cost
   */
  async calculateReturnShippingCost(
    originAddress: string,
    destinationAddress: {
      addressLine1: string;
      city: string;
      province: string;
    },
    weight: number,
    dimensions?: { length: number; width: number; height: number }
  ): Promise<number> {
    try {
      // TODO: Integrate with carrier API to get actual return shipping cost
      // For now, return a default cost based on weight
      const baseCost = 10.0;
      const weightMultiplier = weight * 0.5; // $0.50 per kg
      return baseCost + weightMultiplier;
    } catch (error: any) {
      logger.error("Error calculating return shipping cost:", error);
      throw error;
    }
  }

  async listLogisticsRegions() {
    assertPrismaLogisticsModels(prisma);
    return prisma.logisticsRegion.findMany({
      orderBy: { regionCode: "asc" },
      include: { primaryCarrier: { select: { id: true, name: true, code: true } } },
    });
  }

  async createLogisticsRegion(data: {
    regionCode: string;
    name?: string;
    primaryCarrierId: string;
    failoverCarrierIds: string[];
  }) {
    assertPrismaLogisticsModels(prisma);
    return prisma.logisticsRegion.create({
      data: {
        regionCode: data.regionCode.toUpperCase(),
        name: data.name,
        primaryCarrierId: data.primaryCarrierId,
        failoverCarrierIds: data.failoverCarrierIds || [],
      },
    });
  }

  async updateLogisticsRegion(
    id: string,
    data: Partial<{
      regionCode: string;
      name: string | null;
      primaryCarrierId: string;
      failoverCarrierIds: string[];
    }>
  ) {
    assertPrismaLogisticsModels(prisma);
    return prisma.logisticsRegion.update({
      where: { id },
      data: {
        ...(data.regionCode && { regionCode: data.regionCode.toUpperCase() }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.primaryCarrierId && { primaryCarrierId: data.primaryCarrierId }),
        ...(data.failoverCarrierIds && { failoverCarrierIds: data.failoverCarrierIds }),
      },
    });
  }

  async deleteLogisticsRegion(id: string) {
    assertPrismaLogisticsModels(prisma);
    await prisma.logisticsRegion.delete({ where: { id } });
  }

  async listShippingRateMatrices() {
    assertPrismaLogisticsModels(prisma);
    return prisma.shippingRateMatrix.findMany({
      where: { isActive: true },
      orderBy: [{ currency: "asc" }, { tier: "asc" }],
    });
  }

  async upsertShippingRateMatrix(data: {
    currency: any;
    tier: string;
    maxLengthCm: number;
    maxWidthCm: number;
    maxHeightCm: number;
    maxWeightKg: number;
    baseCost: number;
    baselineEtaHours: number;
    isActive?: boolean;
  }) {
    assertPrismaLogisticsModels(prisma);
    return prisma.shippingRateMatrix.upsert({
      where: {
        currency_tier: { currency: data.currency, tier: data.tier },
      },
      create: {
        currency: data.currency,
        tier: data.tier,
        maxLengthCm: data.maxLengthCm,
        maxWidthCm: data.maxWidthCm,
        maxHeightCm: data.maxHeightCm,
        maxWeightKg: data.maxWeightKg,
        baseCost: data.baseCost,
        baselineEtaHours: data.baselineEtaHours,
        isActive: data.isActive ?? true,
      },
      update: {
        maxLengthCm: data.maxLengthCm,
        maxWidthCm: data.maxWidthCm,
        maxHeightCm: data.maxHeightCm,
        maxWeightKg: data.maxWeightKg,
        baseCost: data.baseCost,
        baselineEtaHours: data.baselineEtaHours,
        isActive: data.isActive ?? true,
      },
    });
  }
}

