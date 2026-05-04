// @ts-nocheck

import { logger } from "../../../utils/logger";
import { MoneyUtils } from "../../../utils/money";
import { SystemSettingsService } from "./SystemSettingsService";

export type ShippingMode = "fixed" | "distance";

export const COMMERCE_SETTING_KEYS = {
  SHIPPING_MODE: "commerce.shipping.mode",
  SHIPPING_ENGINE: "commerce.shipping.engine",
  SHIPPING_FLAT_RATE: "commerce.shipping.flatRate",
  SHIPPING_DYNAMIC_PRICE: "commerce.shipping.dynamicPrice",
  SHIPPING_DYNAMIC_DISTANCE_KM: "commerce.shipping.dynamicDistanceKm",
  COMMISSION_PERCENT: "commerce.platform.commissionPercent",
  USE_ADVANCED_PRODUCT_RULES: "commerce.platform.useAdvancedProductRules",
} as const;

export type ShippingEngineMode = "legacy" | "carrier_v1";

/** Safe subset of commerce pricing for unauthenticated cart/checkout UIs. */
export interface PublicBuyerShippingConfig {
  mode: ShippingMode;
  /** Per seller sub-order when `mode` is `fixed`; also the amount the server uses if distance checkout omits `deliveryDistanceKm`. */
  flatRatePerSellerOrder: number;
  /** Present when `mode` is `distance`; use with buyer-computed `deliveryDistanceKm` to estimate shipping. */
  distancePricing: null | {
    pricePerBlock: number;
    kilometersPerBlock: number;
  };
}

export interface CommercePricingSnapshot {
  /** One of: fixed flat fee, or distance-based using dynamicPrice + dynamicDistanceKm. */
  shippingMode: ShippingMode;
  shippingFlatRate: number;
  /**
   * Monetary amount charged for each `shippingDynamicDistanceKm` block.
   * Shipping = (deliveryDistanceKm / shippingDynamicDistanceKm) * shippingDynamicPrice (rounded).
   */
  shippingDynamicPrice: number;
  /** Kilometers covered by one `shippingDynamicPrice` block (must be > 0 when mode is distance). */
  shippingDynamicDistanceKm: number;
  commissionPercent: number;
  useAdvancedProductRules: boolean;
}

const DEFAULTS: CommercePricingSnapshot = {
  shippingMode: "fixed",
  shippingFlatRate: 10,
  shippingDynamicPrice: 5,
  shippingDynamicDistanceKm: 10,
  commissionPercent: 10,
  useAdvancedProductRules: true,
};

function clampPercentToDecimal(percent: number): number {
  const p = Number(percent);
  if (!Number.isFinite(p) || p < 0) return 0;
  if (p > 100) return 1;
  return p / 100;
}

function parseShippingMode(raw: string | undefined | null): ShippingMode {
  const v = String(raw || "").toLowerCase().trim();
  if (v === "distance") return "distance";
  return "fixed";
}

export class CommercePricingService {
  private settings = new SystemSettingsService();

  static computeAdvancedCommissionRate(productName: string): number {
    const name = (productName || "").toLowerCase();
    if (name.includes("brake") || name.includes("filter")) {
      return 0.1;
    }
    if (name.includes("engine") || name.includes("transmission")) {
      return 0.15;
    }
    return 0.12;
  }

  /**
   * Shipping for one seller order row.
   * - fixed: `shippingFlatRate`
   * - distance: `(deliveryDistanceKm / shippingDynamicDistanceKm) * shippingDynamicPrice` when distance and config valid; else falls back to flat (logged).
   */
  static computeShippingCost(
    snapshot: CommercePricingSnapshot,
    deliveryDistanceKm?: number | null
  ): number {
    if (snapshot.shippingMode !== "distance") {
      return MoneyUtils.roundToCents(Number(snapshot.shippingFlatRate) || 0);
    }

    const dist = deliveryDistanceKm;
    const blockKm = Number(snapshot.shippingDynamicDistanceKm);
    const blockPrice = Number(snapshot.shippingDynamicPrice);

    if (
      dist != null &&
      Number.isFinite(dist) &&
      dist >= 0 &&
      Number.isFinite(blockKm) &&
      blockKm > 0 &&
      Number.isFinite(blockPrice) &&
      blockPrice >= 0
    ) {
      return MoneyUtils.roundToCents((dist / blockKm) * blockPrice);
    }

    logger.warn("Distance shipping selected but deliveryDistanceKm missing or invalid dynamic config; using flat rate fallback", {
      deliveryDistanceKm: dist,
      blockKm,
      blockPrice,
    });
    return MoneyUtils.roundToCents(Number(snapshot.shippingFlatRate) || 0);
  }

  getEffectiveProductCommissionRate(productName: string, snapshot: CommercePricingSnapshot): number {
    if (snapshot.useAdvancedProductRules) {
      return CommercePricingService.computeAdvancedCommissionRate(productName);
    }
    return clampPercentToDecimal(snapshot.commissionPercent);
  }

  getEffectiveCategoryDisplayRate(category: string, snapshot: CommercePricingSnapshot): number {
    if (snapshot.useAdvancedProductRules) {
      return MoneyUtils.getCommissionRate(category || "General");
    }
    return clampPercentToDecimal(snapshot.commissionPercent);
  }

  /**
   * Public, buyer-safe payload (no commission fields). Ensures defaults exist.
   */
  async getPublicShippingConfigForBuyers(): Promise<PublicBuyerShippingConfig> {
    await this.ensureDefaults();
    const s = await this.getSnapshot();
    const flatRatePerSellerOrder = MoneyUtils.roundToCents(Number(s.shippingFlatRate) || 0);
    if (s.shippingMode !== "distance") {
      return {
        mode: "fixed",
        flatRatePerSellerOrder,
        distancePricing: null,
      };
    }
    let km = Number(s.shippingDynamicDistanceKm);
    if (!Number.isFinite(km) || km <= 0) {
      km = DEFAULTS.shippingDynamicDistanceKm;
    }
    return {
      mode: "distance",
      flatRatePerSellerOrder,
      distancePricing: {
        pricePerBlock: MoneyUtils.roundToCents(Number(s.shippingDynamicPrice) || 0),
        kilometersPerBlock: km,
      },
    };
  }

  async getShippingEngine(): Promise<ShippingEngineMode> {
    await this.ensureDefaults();
    const row = await this.settings.getSettingByKey(COMMERCE_SETTING_KEYS.SHIPPING_ENGINE);
    const v = String(row?.value || "legacy").toLowerCase().trim();
    if (v === "carrier_v1" || v === "carrier") return "carrier_v1";
    return "legacy";
  }

  async getSnapshot(): Promise<CommercePricingSnapshot> {
    try {
      const modeRow = await this.settings.getSettingByKey(COMMERCE_SETTING_KEYS.SHIPPING_MODE);
      const shippingMode = parseShippingMode(modeRow?.value);

      const shippingFlatRate = await this.settings.getValue<number>(
        COMMERCE_SETTING_KEYS.SHIPPING_FLAT_RATE,
        DEFAULTS.shippingFlatRate
      );
      const shippingDynamicPrice = await this.settings.getValue<number>(
        COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_PRICE,
        DEFAULTS.shippingDynamicPrice
      );
      const shippingDynamicDistanceKm = await this.settings.getValue<number>(
        COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_DISTANCE_KM,
        DEFAULTS.shippingDynamicDistanceKm
      );
      const commissionPercent = await this.settings.getValue<number>(
        COMMERCE_SETTING_KEYS.COMMISSION_PERCENT,
        DEFAULTS.commissionPercent
      );
      const useAdvancedProductRules = await this.settings.getValue<boolean>(
        COMMERCE_SETTING_KEYS.USE_ADVANCED_PRODUCT_RULES,
        DEFAULTS.useAdvancedProductRules
      );

      return {
        shippingMode,
        shippingFlatRate: Number.isFinite(Number(shippingFlatRate)) ? Number(shippingFlatRate) : DEFAULTS.shippingFlatRate,
        shippingDynamicPrice: Number.isFinite(Number(shippingDynamicPrice))
          ? Number(shippingDynamicPrice)
          : DEFAULTS.shippingDynamicPrice,
        shippingDynamicDistanceKm: Number.isFinite(Number(shippingDynamicDistanceKm))
          ? Number(shippingDynamicDistanceKm)
          : DEFAULTS.shippingDynamicDistanceKm,
        commissionPercent: Number.isFinite(Number(commissionPercent)) ? Number(commissionPercent) : DEFAULTS.commissionPercent,
        useAdvancedProductRules: Boolean(useAdvancedProductRules),
      };
    } catch (error: any) {
      logger.error("CommercePricingService.getSnapshot failed, using defaults", { error: error.message });
      return { ...DEFAULTS };
    }
  }

  async updateSnapshot(
    input: Partial<
      Pick<
        CommercePricingSnapshot,
        | "shippingMode"
        | "shippingFlatRate"
        | "shippingDynamicPrice"
        | "shippingDynamicDistanceKm"
        | "commissionPercent"
        | "useAdvancedProductRules"
      >
    > & { shippingEngine?: ShippingEngineMode },
    adminId: string
  ): Promise<CommercePricingSnapshot> {
    if (input.shippingEngine !== undefined) {
      const se = String(input.shippingEngine).toLowerCase();
      if (se !== "legacy" && se !== "carrier_v1") {
        throw new Error('shippingEngine must be "legacy" or "carrier_v1"');
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.SHIPPING_ENGINE,
        se,
        "string",
        "Shipping engine: legacy (flat/distance) or carrier_v1 (matrix + carriers + cache)",
        adminId
      );
    }

    if (input.shippingMode !== undefined) {
      const m = String(input.shippingMode).toLowerCase();
      if (m !== "fixed" && m !== "distance") {
        throw new Error('shippingMode must be "fixed" or "distance"');
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.SHIPPING_MODE,
        m,
        "string",
        "Shipping calculation: fixed (flat rate) or distance (price per distance block)",
        adminId
      );
    }

    if (input.shippingFlatRate !== undefined) {
      const v = Number(input.shippingFlatRate);
      if (!Number.isFinite(v) || v < 0) {
        throw new Error("shippingFlatRate must be a non-negative number");
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.SHIPPING_FLAT_RATE,
        String(v),
        "number",
        "Flat shipping when mode is fixed, or fallback when distance data missing",
        adminId
      );
    }

    if (input.shippingDynamicPrice !== undefined) {
      const v = Number(input.shippingDynamicPrice);
      if (!Number.isFinite(v) || v < 0) {
        throw new Error("shippingDynamicPrice must be a non-negative number");
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_PRICE,
        String(v),
        "number",
        "Price for each shippingDynamicDistanceKm block (distance mode)",
        adminId
      );
    }

    if (input.shippingDynamicDistanceKm !== undefined) {
      const v = Number(input.shippingDynamicDistanceKm);
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error("shippingDynamicDistanceKm must be greater than 0");
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_DISTANCE_KM,
        String(v),
        "number",
        "Kilometers per pricing block for distance shipping",
        adminId
      );
    }

    if (input.commissionPercent !== undefined) {
      const v = Number(input.commissionPercent);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        throw new Error("commissionPercent must be between 0 and 100");
      }
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.COMMISSION_PERCENT,
        String(v),
        "number",
        "Platform commission percentage (0–100) when advanced product rules are off",
        adminId
      );
    }

    if (input.useAdvancedProductRules !== undefined) {
      await this.settings.upsertSetting(
        COMMERCE_SETTING_KEYS.USE_ADVANCED_PRODUCT_RULES,
        input.useAdvancedProductRules ? "true" : "false",
        "boolean",
        "Use tiered commission by product name (orders) / category (browse) instead of a single commissionPercent",
        adminId
      );
    }

    const snap = await this.getSnapshot();
    if (snap.shippingMode === "distance" && (snap.shippingDynamicDistanceKm <= 0 || snap.shippingDynamicPrice < 0)) {
      throw new Error("Distance mode requires shippingDynamicDistanceKm > 0 and valid shippingDynamicPrice");
    }
    return snap;
  }

  async ensureDefaults(): Promise<void> {
    const adminId = "system";
    const keys = [
      {
        key: COMMERCE_SETTING_KEYS.SHIPPING_ENGINE,
        value: "legacy",
        dataType: "string",
        description: "Shipping engine: legacy | carrier_v1",
      },
      {
        key: COMMERCE_SETTING_KEYS.SHIPPING_MODE,
        value: DEFAULTS.shippingMode,
        dataType: "string",
        description: "Shipping: fixed or distance",
      },
      {
        key: COMMERCE_SETTING_KEYS.SHIPPING_FLAT_RATE,
        value: String(DEFAULTS.shippingFlatRate),
        dataType: "number",
        description: "Flat shipping per seller order / fallback",
      },
      {
        key: COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_PRICE,
        value: String(DEFAULTS.shippingDynamicPrice),
        dataType: "number",
        description: "Price per dynamicDistanceKm block",
      },
      {
        key: COMMERCE_SETTING_KEYS.SHIPPING_DYNAMIC_DISTANCE_KM,
        value: String(DEFAULTS.shippingDynamicDistanceKm),
        dataType: "number",
        description: "Kilometers per pricing block",
      },
      {
        key: COMMERCE_SETTING_KEYS.COMMISSION_PERCENT,
        value: String(DEFAULTS.commissionPercent),
        dataType: "number",
        description: "Platform commission percentage (0–100)",
      },
      {
        key: COMMERCE_SETTING_KEYS.USE_ADVANCED_PRODUCT_RULES,
        value: DEFAULTS.useAdvancedProductRules ? "true" : "false",
        dataType: "boolean",
        description: "Use tiered commission rules when true",
      },
    ];
    for (const row of keys) {
      if (!(await this.settings.getSettingByKey(row.key))) {
        await this.settings.upsertSetting(row.key, row.value, row.dataType, row.description, adminId);
      }
    }
  }
}
