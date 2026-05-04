// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";

/**
 * Manual high-priority fraud investigation flag → AdminAlert (FRAUD_INVESTIGATION).
 */
export class SecurityController {
  createSuspectedFraudAlert = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sellerId, orderId, notes } = req.body || {};

      if (!notes || typeof notes !== "string" || notes.trim().length < 3) {
        res.status(400).json({
          success: false,
          message: "notes is required (min 3 characters)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!sellerId && !orderId) {
        res.status(400).json({
          success: false,
          message: "Provide at least one of sellerId or orderId",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let entityType: string | undefined;
      let entityId: string | undefined;
      let title = "Suspected fraud — investigation requested";
      let message = notes.trim();

      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { orderNumber: true, sellerId: true },
        });
        if (!order) {
          res.status(404).json({
            success: false,
            message: "Order not found",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        entityType = "Order";
        entityId = orderId;
        title = `Suspected fraud — order ${order.orderNumber}`;
        message = `${message}\nOrder: ${order.orderNumber} (seller ${order.sellerId})`;
      } else if (sellerId) {
        const seller = await prisma.seller.findUnique({
          where: { id: sellerId },
          select: { businessName: true, email: true },
        });
        if (!seller) {
          res.status(404).json({
            success: false,
            message: "Seller not found",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        entityType = "Seller";
        entityId = sellerId;
        title = `Suspected fraud — seller ${seller.businessName}`;
        message = `${message}\nSeller: ${seller.businessName} (${seller.email})`;
      }

      const alert = await prisma.adminAlert.create({
        data: {
          tier: "CRITICAL",
          status: "OPEN",
          title,
          message,
          alertCode: "FRAUD_INVESTIGATION",
          entityType,
          entityId,
          metadata: {
            kind: "FRAUD_RISK",
            sellerId: sellerId || undefined,
            orderId: orderId || undefined,
            notes: notes.trim(),
            flaggedBy: req.admin.id,
            flaggedByEmail: req.admin.email,
          },
        },
      });

      logger.warn("FRAUD_INVESTIGATION alert created", {
        alertId: alert.id,
        adminId: req.admin.id,
      });

      res.status(201).json({
        success: true,
        data: { id: alert.id, alertCode: alert.alertCode },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("createSuspectedFraudAlert", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to create alert",
        timestamp: new Date().toISOString(),
      });
    }
  };
}
