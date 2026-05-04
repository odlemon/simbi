// @ts-nocheck
import { prisma } from "../../../utils/database";

export class ComplianceAuditService {
  async createAudit(sellerId: string, adminId: string, score: number, notes?: string) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error("score must be a number between 0 and 100");
    }
    const seller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { id: true } });
    if (!seller) throw new Error("Seller not found");

    return prisma.complianceAudit.create({
      data: {
        sellerId,
        auditedBy: adminId,
        score: Math.round(score),
        notes: notes || null,
      },
    });
  }

  async getLatestAudit(sellerId: string) {
    return prisma.complianceAudit.findFirst({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAuditHistory(sellerId: string, limit: number = 10) {
    return prisma.complianceAudit.findMany({
      where: { sellerId },
      take: Math.min(50, limit),
      orderBy: { createdAt: "desc" },
    });
  }
}

