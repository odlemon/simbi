// @ts-nocheck

import crypto from "crypto";
import type { Currency } from "@prisma/client";
import { prisma } from "../../utils/database";
import { assertPrismaLogisticsModels } from "../../utils/assertPrismaLogisticsModels";
import { logger } from "../../utils/logger";
import { classifyPackageTier, type PackageTierCode } from "./ShippingPackageTier";
import { CarrierIntegrationService } from "./CarrierIntegrationService";
import { CommercePricingService } from "../admin/settings/CommercePricingService";

const CACHE_TTL_MS = 30 * 60 * 1000;
const OTD_PADDING_MAX_HOURS = 72;

export interface ShippingQuoteLineInput {
  masterProductId: string;
  quantity: number;
}

export interface ShippingQuoteResult {
  cost: number;
  etaHours: number;
  paddedEtaHours: number;
  tier: PackageTierCode;
  carrierId: string | null;
  usedMatrixFallback: boolean;
  cacheHit: boolean;
  snapshot: Record<string, unknown>;
}

export class ShippingQuoteService {
  private carrierIntegration = new CarrierIntegrationService();
  private commerce = new CommercePricingService();

  async ensureDefaultRateMatrices(): Promise<void> {
    assertPrismaLogisticsModels(prisma);
    const defaults = [
      { currency: "USD" as Currency, tier: "SMALL", maxL: 30, maxW: 30, maxH: 30, maxWt: 5, cost: 5, eta: 48 },
      { currency: "USD", tier: "MEDIUM", maxL: 60, maxW: 60, maxH: 60, maxWt: 15, cost: 12, eta: 72 },
      { currency: "USD", tier: "LARGE", maxL: 200, maxW: 200, maxH: 200, maxWt: 500, cost: 35, eta: 120 },
      { currency: "ZWL", tier: "SMALL", maxL: 30, maxW: 30, maxH: 30, maxWt: 5, cost: 180, eta: 48 },
      { currency: "ZWL", tier: "MEDIUM", maxL: 60, maxW: 60, maxH: 60, maxWt: 15, cost: 450, eta: 72 },
      { currency: "ZWL", tier: "LARGE", maxL: 200, maxW: 200, maxH: 200, maxWt: 500, cost: 1200, eta: 120 },
    ];
    for (const d of defaults) {
      await prisma.shippingRateMatrix.upsert({
        where: {
          currency_tier: { currency: d.currency, tier: d.tier },
        },
        create: {
          currency: d.currency,
          tier: d.tier,
          maxLengthCm: d.maxL,
          maxWidthCm: d.maxW,
          maxHeightCm: d.maxH,
          maxWeightKg: d.maxWt,
          baseCost: d.cost,
          baselineEtaHours: d.eta,
          isActive: true,
        },
        update: {},
      });
    }
  }

  async aggregateDimensionsFromMasterProducts(
    lines: ShippingQuoteLineInput[]
  ): Promise<{ maxL: number; maxW: number; maxH: number; maxWt: number }> {
    const qtyById = new Map<string, number>();
    for (const l of lines) {
      qtyById.set(l.masterProductId, (qtyById.get(l.masterProductId) || 0) + l.quantity);
    }
    const ids = [...qtyById.keys()];
    if (!ids.length) {
      return { maxL: 0, maxW: 0, maxH: 0, maxWt: 0 };
    }
    const products = await prisma.masterProduct.findMany({
      where: { id: { in: ids } },
      select: { id: true, length: true, width: true, height: true, weight: true },
    });
    let maxL = 0;
    let maxW = 0;
    let maxH = 0;
    let maxWt = 0;
    for (const p of products) {
      maxL = Math.max(maxL, p.length || 0);
      maxW = Math.max(maxW, p.width || 0);
      maxH = Math.max(maxH, p.height || 0);
      const q = qtyById.get(p.id) || 1;
      maxWt = Math.max(maxWt, (p.weight || 0) * q);
    }
    return { maxL, maxW, maxH, maxWt };
  }

  private async matrixFallback(
    currency: Currency,
    tier: PackageTierCode
  ): Promise<{ cost: number; etaHours: number }> {
    await this.ensureDefaultRateMatrices();
    const row = await prisma.shippingRateMatrix.findUnique({
      where: { currency_tier: { currency, tier } },
    });
    if (!row) {
      return { cost: 10, etaHours: 72 };
    }
    return { cost: row.baseCost, etaHours: row.baselineEtaHours };
  }

  private async sellerOnTimeDeliveryRate(sellerId: string): Promise<number> {
    const orders = await prisma.order.findMany({
      where: {
        sellerId,
        status: "DELIVERED",
        actualDeliveryDate: { not: null },
        estimatedDeliveryDate: { not: null },
      },
      select: { actualDeliveryDate: true, estimatedDeliveryDate: true },
      orderBy: { actualDeliveryDate: "desc" },
      take: 200,
    });
    if (!orders.length) return 0.85;
    let onTime = 0;
    for (const o of orders) {
      if (o.actualDeliveryDate <= o.estimatedDeliveryDate) onTime++;
    }
    return onTime / orders.length;
  }

  private buildCacheKey(parts: Record<string, string | number>): string {
    const s = JSON.stringify(parts);
    return crypto.createHash("sha256").update(s).digest("hex");
  }

  /**
   * Public checkout quote: dimensions from master products, failover carriers, matrix fallback, OTD padding.
   */
  async getQuote(params: {
    sellerId: string;
    lines: ShippingQuoteLineInput[];
    deliveryDistanceKm?: number | null;
    regionCode?: string | null;
    currency: Currency;
  }): Promise<ShippingQuoteResult> {
    assertPrismaLogisticsModels(prisma);
    const regionCode = (params.regionCode || "DEFAULT").toUpperCase();
    const distanceKm = params.deliveryDistanceKm ?? 0;

    const { maxL, maxW, maxH, maxWt } = await this.aggregateDimensionsFromMasterProducts(params.lines);
    const tier = classifyPackageTier(maxL, maxW, maxH, maxWt);

    const cacheKey = this.buildCacheKey({
      sellerId: params.sellerId,
      regionCode,
      tier,
      currency: params.currency,
      d: Math.round(distanceKm * 10) / 10,
      dims: `${maxL}|${maxW}|${maxH}|${maxWt}`,
    });

    const now = new Date();
    const cached = await prisma.shippingQuoteCache.findUnique({
      where: { cacheKey },
    });
    if (cached && cached.expiresAt > now) {
      return {
        cost: cached.cost,
        etaHours: cached.etaHours,
        paddedEtaHours: cached.paddedEtaHours,
        tier,
        carrierId: cached.carrierId,
        usedMatrixFallback: !cached.carrierId,
        cacheHit: true,
        snapshot: {
          tier,
          regionCode,
          distanceKm,
          maxL,
          maxW,
          maxH,
          maxWt,
          cacheKey,
        },
      };
    }

    let region = await prisma.logisticsRegion.findUnique({
      where: { regionCode },
      include: { primaryCarrier: true },
    });
    if (!region && regionCode !== "DEFAULT") {
      region = await prisma.logisticsRegion.findUnique({
        where: { regionCode: "DEFAULT" },
        include: { primaryCarrier: true },
      });
    }

    const carrierIds: string[] = [];
    if (region?.primaryCarrierId) carrierIds.push(region.primaryCarrierId);
    const failover = (region?.failoverCarrierIds as string[] | null) || [];
    if (Array.isArray(failover)) {
      for (const id of failover) {
        if (id && !carrierIds.includes(id)) carrierIds.push(id);
      }
    }

    const carriers = await prisma.carrier.findMany({
      where: { id: { in: carrierIds.length ? carrierIds : [] }, status: "ACTIVE" },
    });
    const carrierById = new Map(carriers.map((c) => [c.id, c]));

    let best: { carrierId: string; cost: number; eta: number; raw?: unknown } | null = null;

    const quoteBody = {
      sellerId: params.sellerId,
      regionCode,
      distanceKm,
      dimensionsCm: { length: maxL, width: maxW, height: maxH },
      weightKg: maxWt,
      tier,
      currency: params.currency,
      lines: params.lines,
    };

    for (const cid of carrierIds) {
      const carrier = carrierById.get(cid);
      if (!carrier || !carrier.hasApiIntegration) continue;
      const res = await this.carrierIntegration.quoteRates(carrier, quoteBody);
      if (res.ok && res.cost != null && res.etaHours != null) {
        if (!best || res.etaHours < best.eta) {
          best = { carrierId: carrier.id, cost: res.cost, eta: res.etaHours, raw: res.raw };
        }
      }
    }

    let cost: number;
    let etaHours: number;
    let carrierId: string | null = null;
    let usedMatrixFallback = false;

    if (best) {
      cost = best.cost;
      etaHours = best.eta;
      carrierId = best.carrierId;
    } else {
      const m = await this.matrixFallback(params.currency, tier);
      cost = m.cost;
      etaHours = m.etaHours;
      usedMatrixFallback = true;
    }

    const otd = await this.sellerOnTimeDeliveryRate(params.sellerId);
    const padding = Math.min(OTD_PADDING_MAX_HOURS, Math.max(0, (1 - otd) * 48));
    const paddedEtaHours = etaHours + padding;

    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    await prisma.shippingQuoteCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        tier,
        currency: params.currency,
        cost,
        etaHours,
        paddedEtaHours,
        carrierId,
        rawCarrierResponse: best?.raw ?? null,
        expiresAt,
      },
      update: {
        tier,
        cost,
        etaHours,
        paddedEtaHours,
        carrierId,
        rawCarrierResponse: best?.raw ?? null,
        expiresAt,
      },
    });

    const snapshot = {
      tier,
      regionCode,
      distanceKm,
      maxL,
      maxW,
      maxH,
      maxWt,
      carrierId,
      usedMatrixFallback,
      sellerOnTimeRate: otd,
      paddingHours: padding,
      cacheKey,
    };

    logger.info("Shipping quote computed", { sellerId: params.sellerId, tier, cost, carrierId });

    return {
      cost,
      etaHours,
      paddedEtaHours,
      tier,
      carrierId,
      usedMatrixFallback,
      cacheHit: false,
      snapshot,
    };
  }

  async isCarrierShippingEngine(): Promise<boolean> {
    const e = await this.commerce.getShippingEngine();
    return e === "carrier_v1";
  }
}
