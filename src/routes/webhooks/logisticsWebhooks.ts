// @ts-nocheck
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { LogisticsManagementService } from "../../services/admin/logistics/LogisticsManagementService";
import { logger } from "../../utils/logger";
import { dbConnection } from "../../utils/database";

const router = Router();
const logisticsService = new LogisticsManagementService();
const prisma = dbConnection.getPrismaClient();

/**
 * Middleware to verify webhook signature
 */
const verifyWebhookSignature = async (
  req: Request,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const signature = req.headers["x-webhook-signature"] as string;
    const carrierId = req.params.carrierId;

    if (!signature) {
      res.status(401).json({
        success: false,
        message: "Missing webhook signature",
      });
      return;
    }

    // Fetch carrier API key
    const carrier = await prisma.carrier.findUnique({
      where: { id: carrierId },
      select: { apiKey: true, name: true },
    });

    if (!carrier || !carrier.apiKey) {
      res.status(401).json({
        success: false,
        message: "Invalid carrier or missing API key",
      });
      return;
    }

    // Verify signature using HMAC
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", carrier.apiKey)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.error("Webhook signature verification failed", {
        carrierId,
        carrierName: carrier.name,
      });
      
      res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
      return;
    }

    logger.info("Webhook signature verified", {
      carrierId,
      carrierName: carrier.name,
    });

    next();
  } catch (error: any) {
    logger.error("Error verifying webhook signature", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Signature verification failed",
    });
  }
};

/**
 * POST /api/webhooks/logistics/:carrierId/tracking-update
 * Receive tracking updates from carrier APIs
 */
router.post("/:carrierId/tracking-update", verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const { carrierId } = req.params;
    const { trackingNumber, status, location, notes, timestamp } = req.body;

    // Validate required fields
    if (!trackingNumber || !status) {
      res.status(400).json({
        success: false,
        message: "trackingNumber and status are required",
      });
      return;
    }

    // Process webhook
    const result = await logisticsService.processCarrierWebhook(carrierId, {
      trackingNumber,
      status,
      location: location || "Unknown",
      notes: notes || "",
      timestamp: timestamp || new Date().toISOString(),
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    logger.error("Error processing webhook", {
      error: error.message,
      carrierId: req.params.carrierId,
    });
    res.status(500).json({
      success: false,
      message: "Failed to process webhook",
    });
  }
});

/**
 * GET /api/webhooks/logistics/health
 * Health check for webhook endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Logistics webhook endpoint is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;


