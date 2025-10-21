// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Carrier, CarrierStatus, Shipment, ShipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../utils/database";

interface CreateCarrierData {
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  apiEndpoint?: string;
  apiKey?: string;
  serviceLevels: any; // JSON array
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
  private prisma = prisma;

  /**
   * Get all carriers
   */
  async getAllCarriers(): Promise<Carrier[]> {
    try {
      return await this.prisma.carrier.findMany({
        orderBy: { name: "asc" },
      });
    } catch (error: any) {
      logger.error("Error fetching carriers", { error: error.message });
      throw error;
    }
  }

  /**
   * Get carrier by ID
   */
  async getCarrierById(carrierId: string): Promise<Carrier | null> {
    try {
      return await this.prisma.carrier.findUnique({
        where: { id: carrierId },
      });
    } catch (error: any) {
      logger.error("Error fetching carrier", { error: error.message, carrierId });
      throw error;
    }
  }

  /**
   * Create carrier
   */
  async createCarrier(data: CreateCarrierData, adminId: string): Promise<Carrier> {
    try {
      // Check if carrier code already exists
      const existing = await this.prisma.carrier.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new Error("Carrier with this code already exists");
      }

      const carrier = await this.prisma.carrier.create({
        data: {
          name: data.name,
          code: data.code,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          apiEndpoint: data.apiEndpoint,
          apiKey: data.apiKey, // TODO: Encrypt in production
          serviceLevels: data.serviceLevels,
          status: CarrierStatus.ACTIVE,
        },
      });

      logger.info("Carrier created", { carrierId: carrier.id, name: carrier.name, adminId });
      return carrier;
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
  ): Promise<Carrier> {
    try {
      const carrier = await this.prisma.carrier.update({
        where: { id: carrierId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.apiEndpoint !== undefined && { apiEndpoint: data.apiEndpoint }),
          ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
          ...(data.serviceLevels && { serviceLevels: data.serviceLevels }),
        },
      });

      logger.info("Carrier updated", { carrierId, adminId });
      return carrier;
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
      const activeShipments = await this.prisma.shipment.count({
        where: {
          carrierId,
          status: { in: ["PENDING_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
        },
      });

      if (activeShipments > 0) {
        throw new Error("Cannot delete carrier with active shipments");
      }

      await this.prisma.carrier.update({
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
      const shipments = await this.prisma.shipment.findMany({
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
    try {
      return await this.prisma.shipment.findUnique({
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

      const shipment = await this.prisma.shipment.create({
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
    adminId: string
  ): Promise<Shipment> {
    try {
      const shipment = await this.prisma.shipment.findUnique({
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
        await this.prisma.order.update({
          where: { id: shipment.orderId },
          data: {
            status: "DELIVERED",
            actualDeliveryDate: new Date(),
          },
        });
      }

      const updatedShipment = await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: updateData,
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
      const shipments = await this.prisma.shipment.findMany({
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
        this.prisma.shipment.count(),
        this.prisma.shipment.count({ where: { status: "IN_TRANSIT" } }),
        this.prisma.shipment.count({ where: { status: "DELIVERED" } }),
        this.prisma.shipment.count({ where: { status: "FAILED_DELIVERY" } }),
        this.prisma.shipment.findMany({
          where: { status: "DELIVERED", actualDelivery: { not: null } },
          select: { createdAt: true, actualDelivery: true },
        }),
        this.prisma.shipment.groupBy({
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
          const carrier = await this.prisma.carrier.findUnique({
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
      const shipment = await this.prisma.shipment.findUnique({
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
        "SYSTEM_WEBHOOK"
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
      
      // FedEx status codes
      "IT": "IN_TRANSIT",
      "OD": "OUT_FOR_DELIVERY",
      "DL": "DELIVERED",
      "DE": "FAILED_DELIVERY",
      
      // Generic
      "pending": "PENDING_PICKUP",
      "in_transit": "IN_TRANSIT",
      "out_for_delivery": "OUT_FOR_DELIVERY",
      "exception": "FAILED_DELIVERY",
    };

    const normalizedStatus = carrierStatus.toLowerCase().replace(/[_\s]/g, "-");
    return statusMap[normalizedStatus] || "IN_TRANSIT";
  }

  /**
   * Poll carrier API for shipment updates (fallback when webhooks unavailable)
   */
  async pollCarrierForUpdates(shipmentId: string): Promise<void> {
    try {
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { carrier: true },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      // Skip if already delivered or failed
      if (["DELIVERED", "FAILED_DELIVERY", "RETURNED_TO_SENDER"].includes(shipment.status)) {
        return;
      }

      // TODO: Implement actual carrier API polling
      // For now, log that polling would happen
      logger.info("Would poll carrier API for shipment update", {
        shipmentId,
        trackingNumber: shipment.trackingNumber,
        carrierId: shipment.carrierId,
      });

      // In production, this would:
      // 1. Call carrier.apiEndpoint with apiKey
      // 2. Parse response
      // 3. Update shipment status
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
      const pendingShipments = await this.prisma.shipment.findMany({
        where: {
          status: {
            in: ["PENDING_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
        select: { id: true },
      });

      let updated = 0;

      for (const shipment of pendingShipments) {
        try {
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
}

