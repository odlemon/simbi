// @ts-nocheck
import { Request, Response } from "express";
import { LoanWebhookService } from "../../services/loans/LoanWebhookService";
import { logger } from "../../utils/logger";

const webhookService = new LoanWebhookService();

export class LoanPartnerWebhookController {
  /**
   * POST /api/webhooks/loans/:partnerSlug/status
   * Body: { applicationId, status, partnerReferenceId?, rejectionReason?, signature, ... }
   * signature = HMAC-SHA256 hex of `${applicationId}|${STATUS_UPPER}`
   */
  partnerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { partnerSlug } = req.params;
      await webhookService.handlePartnerCallback(partnerSlug, req.body);
      res.status(200).json({
        success: true,
        message: "Accepted",
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      logger.warn("Loan webhook rejected", { error: e.message });
      const code =
        e.message === "Invalid signature" || e.message === "Unknown partner"
          ? 401
          : e.message === "Application not found for partner"
            ? 404
            : 400;
      res.status(code).json({
        success: false,
        message: e.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
