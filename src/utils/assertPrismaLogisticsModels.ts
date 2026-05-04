// @ts-nocheck
import type { PrismaClient } from "@prisma/client";

/**
 * Logistics shipping features use newer Prisma models. If the client was not
 * regenerated after `schema.prisma` changed, delegates are missing at runtime
 * (`Cannot read properties of undefined (reading 'findMany')`).
 *
 * On Windows, stop `npm run dev` before `npx prisma generate` — the running
 * process locks `query_engine-windows.dll.node` and generate fails with EPERM.
 */
export function assertPrismaLogisticsModels(prisma: PrismaClient): void {
  const p = prisma as Record<string, { findMany?: unknown } | undefined>;
  const missing: string[] = [];
  if (typeof p.logisticsRegion?.findMany !== "function") missing.push("logisticsRegion");
  if (typeof p.shippingRateMatrix?.findMany !== "function") missing.push("shippingRateMatrix");
  if (typeof p.shippingQuoteCache?.findMany !== "function") missing.push("shippingQuoteCache");
  if (typeof p.shipmentTrackingEvent?.findMany !== "function") missing.push("shipmentTrackingEvent");
  if (missing.length) {
    throw new Error(
      `Prisma client is out of date (missing: ${missing.join(", ")}). Stop npm run dev, run npx prisma generate, restart. ` +
        `If DB tables are missing, run: npm run db:update-logistics-shipping`
    );
  }
}
