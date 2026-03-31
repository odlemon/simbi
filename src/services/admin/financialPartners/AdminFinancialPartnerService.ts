// @ts-nocheck

import { Prisma } from "@prisma/client";
import { prisma } from "../../../utils/database";

function slugify(name: string): string {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export class AdminFinancialPartnerService {
  sanitizePartner(partner: any) {
    if (!partner) return partner;
    const { integrationSecretsJson, ...rest } = partner;
    return {
      ...rest,
      hasIntegrationSecrets: integrationSecretsJson != null && Object.keys(integrationSecretsJson).length > 0,
    };
  }

  async list() {
    const rows = await prisma.financialPartner.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map((r) => this.sanitizePartner(r));
  }

  async getById(id: string) {
    const p = await prisma.financialPartner.findUnique({ where: { id } });
    return p ? this.sanitizePartner(p) : null;
  }

  async create(data: {
    name: string;
    slug?: string;
    description: string;
    minAmount: number;
    maxAmount: number;
    interestRate: number;
    termMonths: number;
    logo?: string | null;
    contactEmail?: string | null;
    feesAndTermsSummary?: string | null;
    isActive?: boolean;
    fieldDefinitionsJson?: unknown;
    integrationConfigJson?: unknown;
    integrationSecretsJson?: unknown;
    apiEndpoint?: string | null;
    apiKey?: string | null;
    webhookUrl?: string | null;
  }) {
    const slug = data.slug?.trim() || slugify(data.name);
    const existing = await prisma.financialPartner.findUnique({ where: { slug } });
    if (existing) {
      throw new Error(`Slug already in use: ${slug}`);
    }
    return prisma.financialPartner.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        interestRate: data.interestRate,
        termMonths: data.termMonths,
        logo: data.logo ?? null,
        contactEmail: data.contactEmail ?? null,
        feesAndTermsSummary: data.feesAndTermsSummary ?? null,
        isActive: data.isActive ?? true,
        fieldDefinitionsJson: data.fieldDefinitionsJson as Prisma.InputJsonValue | undefined,
        integrationConfigJson: data.integrationConfigJson as Prisma.InputJsonValue | undefined,
        integrationSecretsJson: data.integrationSecretsJson as Prisma.InputJsonValue | undefined,
        apiEndpoint: data.apiEndpoint ?? null,
        apiKey: data.apiKey ?? null,
        webhookUrl: data.webhookUrl ?? null,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      minAmount: number;
      maxAmount: number;
      interestRate: number;
      termMonths: number;
      logo: string | null;
      contactEmail: string | null;
      feesAndTermsSummary: string | null;
      isActive: boolean;
      fieldDefinitionsJson: unknown;
      integrationConfigJson: unknown;
      apiEndpoint: string | null;
      apiKey: string | null;
      webhookUrl: string | null;
    }>
  ) {
    const existing = await prisma.financialPartner.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Financial partner not found");
    }
    if (data.slug && data.slug !== existing.slug) {
      const clash = await prisma.financialPartner.findUnique({ where: { slug: data.slug } });
      if (clash) {
        throw new Error(`Slug already in use: ${data.slug}`);
      }
    }
    return prisma.financialPartner.update({
      where: { id },
      data: {
        ...data,
        fieldDefinitionsJson: data.fieldDefinitionsJson as Prisma.InputJsonValue | undefined,
        integrationConfigJson: data.integrationConfigJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Merge secrets (e.g. { apiKey, webhookSigningSecret }). Omit a key to leave previous value. */
  async updateSecrets(id: string, secrets: Record<string, unknown>) {
    const existing = await prisma.financialPartner.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Financial partner not found");
    }
    const prev = (existing.integrationSecretsJson as Record<string, unknown>) || {};
    const next = { ...prev };
    for (const [k, v] of Object.entries(secrets)) {
      if (v === null || v === "") {
        delete next[k];
      } else {
        next[k] = v;
      }
    }
    return prisma.financialPartner.update({
      where: { id },
      data: { integrationSecretsJson: next as Prisma.InputJsonValue },
    });
  }

  async delete(id: string) {
    const count = await prisma.loanApplication.count({ where: { partnerId: id } });
    if (count > 0) {
      throw new Error("Cannot delete partner with existing loan applications; deactivate instead");
    }
    await prisma.financialPartner.delete({ where: { id } });
    return { success: true };
  }

  async listApplications(params?: { partnerId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params?.limit) || 20));
    const where: any = {};
    if (params?.partnerId) where.partnerId = params.partnerId;
    if (params?.status) where.status = params.status;

    const [total, rows] = await Promise.all([
      prisma.loanApplication.count({ where }),
      prisma.loanApplication.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, businessName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    };
  }
}
