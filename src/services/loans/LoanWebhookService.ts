// @ts-nocheck

import crypto from "crypto";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { LoanStatusWorkflowService } from "./LoanStatusWorkflowService";

export type PartnerWebhookBody = {
  applicationId: string;
  status: string;
  partnerReferenceId?: string;
  rejectionReason?: string;
  approvedAmount?: number;
  interestRate?: number;
  termMonths?: number;
  monthlyPayment?: number;
  signature?: string;
  /** Echo from partner for debugging */
  raw?: unknown;
};

export class LoanWebhookService {
  private workflow = new LoanStatusWorkflowService();

  verifySignature(
    body: PartnerWebhookBody,
    secret: string | undefined | null
  ): boolean {
    if (!secret) {
      return false;
    }
    const payload = `${body.applicationId}|${String(body.status).toUpperCase()}`;
    const expected = crypto.createHmac("sha256", String(secret)).update(payload).digest("hex");
    const sig = (body.signature || "").trim();
    if (!sig) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(sig, "utf8"));
    } catch {
      return false;
    }
  }

  async handlePartnerCallback(partnerSlug: string, body: PartnerWebhookBody): Promise<void> {
    const partner = await prisma.financialPartner.findUnique({
      where: { slug: partnerSlug },
    });
    if (!partner || !partner.isActive) {
      throw new Error("Unknown partner");
    }

    const secrets = (partner.integrationSecretsJson as Record<string, unknown> | null) || {};
    const signingSecret = secrets.webhookSigningSecret || secrets.webhookSecret;
    if (!this.verifySignature(body, signingSecret as string)) {
      throw new Error("Invalid signature");
    }

    const app = await prisma.loanApplication.findFirst({
      where: {
        id: body.applicationId,
        partnerId: partner.id,
      },
    });
    if (!app) {
      throw new Error("Application not found for partner");
    }

    const mapped = this.workflow.parseExternalStatus(body.status);
    if (!mapped) {
      throw new Error(`Unknown status: ${body.status}`);
    }

    await this.workflow.transitionStatus(app.id, mapped, "WEBHOOK", {
      partnerReferenceId: body.partnerReferenceId ?? undefined,
      rejectionReason: body.rejectionReason ?? undefined,
      approvedAmount: body.approvedAmount,
      interestRate: body.interestRate,
      termMonths: body.termMonths,
      monthlyPayment: body.monthlyPayment,
      rawPayload: body.raw ?? body,
    });

    logger.info("Loan webhook processed", {
      applicationId: app.id,
      partnerSlug,
      status: mapped,
    });
  }
}
