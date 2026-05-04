// @ts-nocheck

import axios from "axios";
import type { Carrier } from "@prisma/client";
import { logger } from "../../utils/logger";

type CarrierIntegrationConfig = {
  baseUrl?: string;
  rateQuotePath?: string;
  trackingPollPath?: string;
  rateQuoteMethod?: string;
  trackingPollMethod?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

function deepReplaceTemplates(
  value: unknown,
  ctx: { secrets: Record<string, unknown>; quote: Record<string, unknown> }
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value
      .replace(/\{\{secrets\.([^}]+)\}\}/g, (_, key) => {
        const v = ctx.secrets[key];
        return v != null ? String(v) : "";
      })
      .replace(/\{\{quote\.([^}]+)\}\}/g, (_, key) => {
        const v = ctx.quote[key];
        return v != null ? String(v) : "";
      });
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepReplaceTemplates(v, ctx));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) {
      out[k] = deepReplaceTemplates(v, ctx);
    }
    return out;
  }
  return value;
}

function mergeSecrets(carrier: Carrier): Record<string, unknown> {
  const j = (carrier.integrationSecretsJson as Record<string, unknown> | null) || {};
  const legacy: Record<string, unknown> = { ...j };
  if (carrier.apiKey && !legacy.apiKey) legacy.apiKey = carrier.apiKey;
  return legacy;
}

function mergeConfig(carrier: Carrier): CarrierIntegrationConfig {
  return ((carrier.integrationConfigJson as CarrierIntegrationConfig) || {}) as CarrierIntegrationConfig;
}

export type CarrierQuoteResult = {
  ok: boolean;
  cost?: number;
  etaHours?: number;
  raw?: unknown;
  error?: string;
};

export type CarrierTrackingPollResult = {
  ok: boolean;
  status?: string;
  location?: string;
  notes?: string;
  raw?: unknown;
  error?: string;
};

export class CarrierIntegrationService {
  /**
   * POST rate quote to carrier-configured endpoint. Expects JSON { cost, etaHours } or nested data.cost.
   */
  async quoteRates(
    carrier: Carrier,
    body: Record<string, unknown>
  ): Promise<CarrierQuoteResult> {
    const cfg = mergeConfig(carrier);
    const secrets = mergeSecrets(carrier);
    const baseUrl = (cfg.baseUrl || carrier.apiEndpoint || "").replace(/\/$/, "");
    const pathPart = cfg.rateQuotePath || "/rates/quote";
    const url = baseUrl
      ? `${baseUrl}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`
      : "";

    if (!url) {
      return { ok: false, error: "No rate quote URL configured" };
    }

    const quoteCtx = body;
    const headers = (deepReplaceTemplates(cfg.headers || {}, {
      secrets,
      quote: quoteCtx,
    }) as Record<string, string>) || { "Content-Type": "application/json" };
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (secrets.apiKey && !headers.Authorization && !headers["X-API-Key"]) {
      headers["X-API-Key"] = String(secrets.apiKey);
    }

    const method = (cfg.rateQuoteMethod || "POST").toUpperCase();
    const timeout = cfg.timeoutMs ?? 15000;

    try {
      const response = await axios({
        method: method as any,
        url,
        data: body,
        headers,
        timeout,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        return {
          ok: false,
          error: `HTTP ${response.status}`,
          raw: response.data,
        };
      }

      const data = response.data as any;
      const cost = Number(data?.cost ?? data?.data?.cost ?? data?.rate);
      const etaHours = Number(data?.etaHours ?? data?.eta ?? data?.data?.etaHours);
      if (!Number.isFinite(cost) || !Number.isFinite(etaHours)) {
        return { ok: false, error: "Invalid quote response shape", raw: data };
      }
      return { ok: true, cost, etaHours, raw: data };
    } catch (e: any) {
      logger.warn("Carrier quoteRates failed", { carrierId: carrier.id, error: e.message });
      return { ok: false, error: e.message };
    }
  }

  async pollTracking(
    carrier: Carrier,
    trackingNumber: string
  ): Promise<CarrierTrackingPollResult> {
    const cfg = mergeConfig(carrier);
    const secrets = mergeSecrets(carrier);
    const baseUrl = (cfg.baseUrl || carrier.apiEndpoint || "").replace(/\/$/, "");
    const pathTpl = cfg.trackingPollPath || "/tracking/{{quote.trackingNumber}}";
    const pathPart = String(
      deepReplaceTemplates(pathTpl, {
        secrets,
        quote: { trackingNumber },
      })
    );
    const url = baseUrl
      ? `${baseUrl}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`
      : "";

    if (!url) {
      return { ok: false, error: "No tracking poll URL configured" };
    }

    const headers = (deepReplaceTemplates(cfg.headers || {}, {
      secrets,
      quote: { trackingNumber },
    }) as Record<string, string>) || { "Content-Type": "application/json" };
    if (secrets.apiKey && !headers["X-API-Key"]) {
      headers["X-API-Key"] = String(secrets.apiKey);
    }

    const method = (cfg.trackingPollMethod || "GET").toUpperCase();
    const timeout = cfg.timeoutMs ?? 15000;

    try {
      const response = await axios({
        method: method as any,
        url,
        headers,
        timeout,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        return { ok: false, error: `HTTP ${response.status}`, raw: response.data };
      }

      const data = response.data as any;
      const status = String(data?.status ?? data?.data?.status ?? "");
      const location = String(data?.location ?? data?.data?.location ?? "");
      const notes = String(data?.notes ?? data?.description ?? "");
      if (!status) {
        return { ok: false, error: "No status in tracking response", raw: data };
      }
      return { ok: true, status, location, notes, raw: data };
    } catch (e: any) {
      logger.warn("Carrier pollTracking failed", {
        carrierId: carrier.id,
        trackingNumber,
        error: e.message,
      });
      return { ok: false, error: e.message };
    }
  }
}
