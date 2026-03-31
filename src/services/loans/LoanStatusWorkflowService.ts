// @ts-nocheck

import { LoanStatus, Prisma } from "@prisma/client";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";

export type LoanStatusEventSource = "SYSTEM" | "WEBHOOK" | "POLL" | "SELLER" | "ADMIN";

export class LoanStatusWorkflowService {
  async appendEvent(
    tx: Prisma.TransactionClient,
    params: {
      loanApplicationId: string;
      fromStatus: LoanStatus | null;
      toStatus: LoanStatus;
      source: LoanStatusEventSource;
      note?: string | null;
      rawPayload?: unknown;
    }
  ): Promise<void> {
    await tx.loanApplicationStatusEvent.create({
      data: {
        loanApplicationId: params.loanApplicationId,
        fromStatus: params.fromStatus === undefined ? null : params.fromStatus,
        toStatus: params.toStatus,
        source: params.source,
        note: params.note ?? null,
        rawPayload:
          params.rawPayload === undefined
            ? undefined
            : (params.rawPayload as Prisma.InputJsonValue),
      },
    });
  }

  async transitionStatus(
    applicationId: string,
    toStatus: LoanStatus,
    source: LoanStatusEventSource,
    options?: {
      note?: string | null;
      rawPayload?: unknown;
      partnerReferenceId?: string | null;
      partnerResponsePatch?: Record<string, unknown>;
      rejectionReason?: string | null;
      approvedAmount?: number | null;
      interestRate?: number | null;
      termMonths?: number | null;
      monthlyPayment?: number | null;
    }
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const app = await tx.loanApplication.findUnique({
        where: { id: applicationId },
      });
      if (!app) {
        throw new Error("Loan application not found");
      }

      const fromStatus = app.status;
      if (fromStatus === toStatus) {
        return;
      }

      const data: Prisma.LoanApplicationUpdateInput = {
        status: toStatus,
      };

      if (options?.partnerReferenceId != null) {
        data.partnerReferenceId = options.partnerReferenceId;
      }
      if (options?.rejectionReason != null) {
        data.rejectionReason = options.rejectionReason;
      }
      if (options?.approvedAmount != null) {
        data.approvedAmount = options.approvedAmount;
      }
      if (options?.interestRate != null) {
        data.interestRate = options.interestRate;
      }
      if (options?.termMonths != null) {
        data.termMonths = options.termMonths;
      }
      if (options?.monthlyPayment != null) {
        data.monthlyPayment = options.monthlyPayment;
      }

      const now = new Date();
      if (toStatus === LoanStatus.SUBMITTED || toStatus === LoanStatus.PARTNER_ENTERED) {
        data.submittedAt = app.submittedAt ?? now;
      }
      if (toStatus === LoanStatus.UNDER_REVIEW) {
        data.reviewedAt = now;
      }
      if (toStatus === LoanStatus.APPROVED) {
        data.approvedAt = now;
      }
      if (toStatus === LoanStatus.REJECTED) {
        data.rejectedAt = now;
      }
      if (toStatus === LoanStatus.DISBURSED) {
        data.disbursedAt = now;
      }

      if (options?.partnerResponsePatch) {
        const prev = (app.partnerResponse as Record<string, unknown>) || {};
        data.partnerResponse = { ...prev, ...options.partnerResponsePatch } as Prisma.InputJsonValue;
      }

      if (source === "POLL") {
        data.lastStatusSyncAt = now;
      }
      if (source === "WEBHOOK") {
        data.lastStatusSyncAt = now;
      }

      await tx.loanApplication.update({
        where: { id: applicationId },
        data,
      });

      await this.appendEvent(tx, {
        loanApplicationId: applicationId,
        fromStatus,
        toStatus,
        source,
        note: options?.note ?? null,
        rawPayload: options?.rawPayload,
      });
    });

    logger.info("Loan application status updated", {
      applicationId,
      toStatus,
      source,
    });
  }

  /** Map partner-facing status strings to internal enum (best-effort). */
  parseExternalStatus(raw: string): LoanStatus | null {
    const s = String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    const map: Record<string, LoanStatus> = {
      DRAFT: LoanStatus.DRAFT,
      SUBMITTED: LoanStatus.SUBMITTED,
      ENTERED: LoanStatus.PARTNER_ENTERED,
      PARTNER_ENTERED: LoanStatus.PARTNER_ENTERED,
      RECEIVED: LoanStatus.PARTNER_ENTERED,
      ACK: LoanStatus.PARTNER_ENTERED,
      ACKNOWLEDGED: LoanStatus.PARTNER_ENTERED,
      UNDER_REVIEW: LoanStatus.UNDER_REVIEW,
      IN_REVIEW: LoanStatus.UNDER_REVIEW,
      REVIEW: LoanStatus.UNDER_REVIEW,
      APPROVED: LoanStatus.APPROVED,
      REJECTED: LoanStatus.REJECTED,
      DECLINED: LoanStatus.REJECTED,
      DISBURSED: LoanStatus.DISBURSED,
      FUNDED: LoanStatus.DISBURSED,
      ACTIVE: LoanStatus.ACTIVE,
      PAID_OFF: LoanStatus.PAID_OFF,
      PAIDOFF: LoanStatus.PAID_OFF,
      DEFAULTED: LoanStatus.DEFAULTED,
      CANCELLED: LoanStatus.CANCELLED,
      CANCELED: LoanStatus.CANCELLED,
    };
    return map[s] ?? null;
  }
}
