// @ts-nocheck

import axios, { AxiosError } from "axios";
import { LoanStatus } from "@prisma/client";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { LoanStatusWorkflowService } from "./LoanStatusWorkflowService";

type IntegrationConfig = {
  baseUrl?: string;
  submitPath?: string;
  submitMethod?: string;
  statusPath?: string;
  statusMethod?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

function deepReplaceTemplates(
  value: unknown,
  ctx: { secrets: Record<string, unknown>; application: Record<string, unknown>; verified: Record<string, unknown> }
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .replace(/\{\{secrets\.([^}]+)\}\}/g, (_, key) => {
        const v = ctx.secrets[key];
        return v != null ? String(v) : "";
      })
      .replace(/\{\{application\.([^}]+)\}\}/g, (_, key) => {
        const v = ctx.application[key];
        return v != null ? String(v) : "";
      })
      .replace(/\{\{verified\.([^}]+)\}\}/g, (_, key) => {
        const v = ctx.verified[key];
        return v != null ? String(v) : "";
      });
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepReplaceTemplates(v, ctx));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepReplaceTemplates(v, ctx);
    }
    return out;
  }
  return value;
}

export class LoanPartnerIntegrationService {
  private workflow = new LoanStatusWorkflowService();

  /**
   * POST configured partner endpoint with payload (verified snapshot + application fields).
   */
  async submitApplication(applicationId: string): Promise<void> {
    const app = await prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: { partner: true },
    });
    if (!app || !app.partner) {
      throw new Error("Application or partner not found");
    }

    const cfg = (app.partner.integrationConfigJson as IntegrationConfig | null) || {};
    const secrets = (app.partner.integrationSecretsJson as Record<string, unknown> | null) || {};
    const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");
    const pathPart = cfg.submitPath || "/";
    const url =
      app.partner.apiEndpoint ||
      (baseUrl ? `${baseUrl}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}` : "");

    if (!url) {
      logger.info("Loan partner has no submit URL; skipping HTTP submit", {
        applicationId,
        partnerId: app.partnerId,
      });
      return;
    }

    const verified = (app.verifiedSnapshot as Record<string, unknown>) || {};
    const applicationCtx: Record<string, unknown> = {
      id: app.id,
      requestedAmount: app.requestedAmount,
      purpose: app.purpose,
      currency: app.currency,
      collateralDescription: app.collateralDescription ?? "",
    };

    const defaultBody = {
      applicationId: app.id,
      sellerId: app.sellerId,
      partnerId: app.partnerId,
      requestedAmount: app.requestedAmount,
      currency: app.currency,
      purpose: app.purpose,
      verifiedSnapshot: verified,
      customFields: app.applicationData,
    };

    const method = (cfg.submitMethod || "POST").toUpperCase();
    const headers = (deepReplaceTemplates(cfg.headers || {}, {
      secrets,
      application: applicationCtx,
      verified,
    }) as Record<string, string>) || { "Content-Type": "application/json" };
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (secrets.apiKey && !headers.Authorization && !headers["X-API-Key"]) {
      headers["X-API-Key"] = String(secrets.apiKey);
    }
    if (app.partner.apiKey && !headers["X-API-Key"]) {
      headers["X-API-Key"] = app.partner.apiKey;
    }

    const timeout = cfg.timeoutMs ?? 20000;

    try {
      const response = await axios({
        method: method as any,
        url,
        data: defaultBody,
        headers,
        timeout,
        validateStatus: () => true,
      });

      const patch: Record<string, unknown> = {
        lastSubmitHttpStatus: response.status,
        lastSubmitAt: new Date().toISOString(),
        lastSubmitBody: response.data,
      };

      await prisma.loanApplication.update({
        where: { id: applicationId },
        data: {
          partnerResponse: {
            ...((app.partnerResponse as object) || {}),
            ...patch,
          } as any,
        },
      });

      const promote =
        (cfg as any).promoteToPartnerEnteredOnHttp2xx !== false;

      if (response.status >= 200 && response.status < 300) {
        const extId =
          (response.data && (response.data.referenceId || response.data.applicationRef || response.data.id)) ||
          null;
        if (extId) {
          await prisma.loanApplication.update({
            where: { id: applicationId },
            data: { partnerReferenceId: String(extId) },
          });
        }
        if (promote) {
          await this.workflow.transitionStatus(
            applicationId,
            LoanStatus.PARTNER_ENTERED,
            "SYSTEM",
            {
              note: "Partner API accepted submission",
              rawPayload: response.data,
              partnerResponsePatch: patch,
            }
          );
        }
      } else {
        logger.warn("Loan partner submit non-2xx", {
          applicationId,
          status: response.status,
          data: response.data,
        });
      }
    } catch (err: any) {
      const ax = err as AxiosError;
      logger.error("Loan partner submit failed", {
        applicationId,
        message: ax.message,
      });
      await prisma.loanApplication.update({
        where: { id: applicationId },
        data: {
          partnerResponse: {
            ...((app.partnerResponse as object) || {}),
            lastSubmitError: ax.message,
            lastSubmitAt: new Date().toISOString(),
          } as any,
        },
      });
    }
  }

  /**
   * Optional GET/POST to partner status endpoint. Paths may include {{application.partnerReferenceId}}.
   */
  async pollStatus(applicationId: string): Promise<{ ok: boolean; message?: string }> {
    const app = await prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: { partner: true },
    });
    if (!app || !app.partner) {
      return { ok: false, message: "Not found" };
    }

    const cfg = (app.partner.integrationConfigJson as IntegrationConfig | null) || {};
    const secrets = (app.partner.integrationSecretsJson as Record<string, unknown> | null) || {};
    const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");
    let statusPath = cfg.statusPath || "";
    if (!statusPath || !baseUrl) {
      return { ok: false, message: "Partner status polling not configured" };
    }

    const verified = (app.verifiedSnapshot as Record<string, unknown>) || {};
    statusPath = String(
      deepReplaceTemplates(statusPath, {
        secrets,
        application: {
          id: app.id,
          partnerReferenceId: app.partnerReferenceId || "",
          requestedAmount: app.requestedAmount,
        },
        verified,
      })
    );

    const url = `${baseUrl}${statusPath.startsWith("/") ? statusPath : `/${statusPath}`}`;
    const method = (cfg.statusMethod || "GET").toUpperCase();
    const headers = (deepReplaceTemplates(cfg.headers || {}, {
      secrets,
      application: { id: app.id, partnerReferenceId: app.partnerReferenceId || "" },
      verified,
    }) as Record<string, string>) || {};
    if (secrets.apiKey && !headers["X-API-Key"]) {
      headers["X-API-Key"] = String(secrets.apiKey);
    }
    if (app.partner.apiKey && !headers["X-API-Key"]) {
      headers["X-API-Key"] = app.partner.apiKey;
    }

    try {
      const response = await axios({
        method: method as any,
        url,
        headers,
        timeout: cfg.timeoutMs ?? 15000,
        validateStatus: () => true,
      });

      const data = response.data;
      const rawStatus =
        (data && (data.status || data.applicationStatus || data.state)) || null;
      if (!rawStatus) {
        return { ok: false, message: "No status in partner response" };
      }

      const mapped = this.workflow.parseExternalStatus(String(rawStatus));
      if (!mapped) {
        return { ok: false, message: `Unmapped partner status: ${rawStatus}` };
      }

      await this.workflow.transitionStatus(applicationId, mapped, "POLL", {
        rawPayload: data,
        partnerResponsePatch: {
          lastPollHttpStatus: response.status,
          lastPollAt: new Date().toISOString(),
          lastPollBody: data,
        },
        rejectionReason: data.rejectionReason || data.reason || undefined,
        approvedAmount: data.approvedAmount != null ? Number(data.approvedAmount) : undefined,
      });

      return { ok: true };
    } catch (err: any) {
      logger.error("Loan partner poll failed", { applicationId, message: err.message });
      return { ok: false, message: err.message };
    }
  }
}
