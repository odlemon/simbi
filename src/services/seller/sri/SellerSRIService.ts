// @ts-nocheck
import { prisma } from "../../../utils/database";
import { SRICalculationService } from "../../admin/sellers/SRICalculationService";

type SRIStatusColor = "GREEN" | "YELLOW" | "RED";

const sriCalc = new SRICalculationService();

export class SellerSRIService {
  private toStatusColor(score: number): SRIStatusColor {
    if (score >= 70) return "GREEN";
    if (score >= 50) return "YELLOW";
    return "RED";
  }

  private buildAdvice(components: any): Array<{ key: string; title: string; detail: string }> {
    const advice: Array<{ key: string; title: string; detail: string }> = [];

    const fulfilment = Math.round((components.fulfilmentRate || 0) * 100);
    const onTime = Math.round((components.onTimeDeliveryRate || 0) * 100);
    const defect = Math.round((components.defectRate || 0) * 100);
    const compliance = Math.round((components.complianceScore || 0) * 100);

    if (fulfilment < 85) {
      advice.push({
        key: "FULFILMENT",
        title: "Improve fulfilment rate",
        detail: `Your fulfilment rate is ${fulfilment}%. Accept/reject orders quickly and avoid 12h timeouts.`,
      });
    }
    if (onTime < 85) {
      advice.push({
        key: "ON_TIME_DELIVERY",
        title: "Improve on-time delivery",
        detail: `Your on-time delivery rate is ${onTime}%. Ensure dispatch happens quickly and update fulfilment status promptly.`,
      });
    }
    if (defect > 5) {
      advice.push({
        key: "DEFECT_RATE",
        title: "Reduce return/dispute rate",
        detail: `Your defect/return rate is ${defect}%. Ensure correct parts, accurate descriptions, and strong quality checks.`,
      });
    }
    if (compliance < 100) {
      advice.push({
        key: "COMPLIANCE",
        title: "Complete compliance documents",
        detail: `Some required compliance documents may be missing or expired. Upload/renew to restore compliance score.`,
      });
    }

    if (advice.length === 0) {
      advice.push({
        key: "OK",
        title: "Good standing",
        detail: "Your current SRI components look healthy. Keep maintaining response times and quality.",
      });
    }

    return advice;
  }

  private pickWarning(components: any, status: SRIStatusColor): string | null {
    if (status === "GREEN") return null;

    const fulfilment = Math.round((components.fulfilmentRate || 0) * 100);
    const onTime = Math.round((components.onTimeDeliveryRate || 0) * 100);
    const defect = Math.round((components.defectRate || 0) * 100);
    const compliance = Math.round((components.complianceScore || 0) * 100);

    // Pick most critical by simple heuristics
    const candidates: Array<{ key: string; severity: number; msg: string }> = [
      {
        key: "FULFILMENT",
        severity: fulfilment < 70 ? 3 : fulfilment < 85 ? 2 : 0,
        msg: `Warning: Fulfilment Rate is ${fulfilment}%. Improve acceptance and avoid timeouts to prevent eligibility risk.`,
      },
      {
        key: "ON_TIME_DELIVERY",
        severity: onTime < 70 ? 3 : onTime < 85 ? 2 : 0,
        msg: `Warning: On-time Delivery Rate is ${onTime}%. Dispatch earlier to avoid late deliveries impacting SRI.`,
      },
      {
        key: "DEFECT_RATE",
        severity: defect > 10 ? 3 : defect > 5 ? 2 : 0,
        msg: `Warning: Defect/Return Rate is ${defect}%. Reduce disputes/returns by improving accuracy and QC.`,
      },
      {
        key: "COMPLIANCE",
        severity: compliance < 100 ? 2 : 0,
        msg: "Warning: Compliance documents are incomplete/expired. Update required documents to restore compliance score.",
      },
    ];

    candidates.sort((a, b) => b.severity - a.severity);
    const top = candidates[0];
    return top && top.severity > 0 ? top.msg : null;
  }

  async getSummary(sellerId: string): Promise<any> {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        sriScore: true,
        isEligible: true,
        isShadowBanned: true,
        lastSriCalculation: true,
      },
    });
    if (!seller) throw new Error("Seller not found");

    // If last calc missing, compute on-demand (does not persist)
    const computed = await sriCalc.calculateSellerSRI(sellerId);
    const sriScore = typeof seller.sriScore === "number" ? seller.sriScore : computed.score;
    const statusColor = this.toStatusColor(sriScore);

    const warning = this.pickWarning(computed.components, statusColor);

    return {
      sellerId,
      sriScore,
      statusColor,
      isEligible: seller.isEligible ?? computed.eligible,
      isShadowBanned: seller.isShadowBanned ?? computed.shadowBanned,
      lastSriCalculation: seller.lastSriCalculation,
      warning,
    };
  }

  async getBreakdown(sellerId: string): Promise<any> {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        sriScore: true,
        lastSriCalculation: true,
      },
    });
    if (!seller) throw new Error("Seller not found");

    const computed = await sriCalc.calculateSellerSRI(sellerId);
    const sriScore = typeof seller.sriScore === "number" ? seller.sriScore : computed.score;
    const statusColor = this.toStatusColor(sriScore);

    return {
      sellerId,
      sriScore,
      statusColor,
      lastSriCalculation: seller.lastSriCalculation,
      weights: {
        fulfilment: 0.4,
        delivery: 0.4,
        defect: 0.15,
        compliance: 0.05,
      },
      components: computed.components,
      advice: this.buildAdvice(computed.components),
    };
  }
}

