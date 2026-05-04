// @ts-nocheck
import { CustomProductRequestStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { remoteUploadService } from "../../media/RemoteUploadService";
import { NotificationService } from "../../admin/notifications/NotificationService";

const REVIEW_SLO_HOURS = 72;
const MS_PER_HOUR = 60 * 60 * 1000;

export class SellerCustomProductRequestService {
  /**
   * 72h SLO and overdue flags (response shaping for API)
   */
  computeSloMeta(request: {
    reviewDueAt: Date | null;
    createdAt: Date;
    status: CustomProductRequestStatus;
    reviewedAt: Date | null;
  }): {
    reviewDueAt: string;
    hoursRemaining: number | null;
    isSloOverdue: boolean;
    sloBreachedOnDecision: boolean | null;
  } {
    const reviewDue = request.reviewDueAt
      ? new Date(request.reviewDueAt)
      : new Date(new Date(request.createdAt).getTime() + REVIEW_SLO_HOURS * MS_PER_HOUR);
    const now = Date.now();
    const dueMs = reviewDue.getTime() - now;
    const hoursRemaining = Math.round((dueMs / MS_PER_HOUR) * 100) / 100;
    const openStatuses: CustomProductRequestStatus[] = [
      CustomProductRequestStatus.PENDING,
      CustomProductRequestStatus.MORE_INFO_NEEDED,
    ];
    const isSloOverdue = openStatuses.includes(request.status) && now > reviewDue.getTime();
    let sloBreachedOnDecision: boolean | null = null;
    if (request.reviewedAt) {
      sloBreachedOnDecision = new Date(request.reviewedAt).getTime() > reviewDue.getTime();
    }
    return {
      reviewDueAt: reviewDue.toISOString(),
      hoursRemaining: openStatuses.includes(request.status) ? Math.max(0, hoursRemaining) : null,
      isSloOverdue,
      sloBreachedOnDecision,
    };
  }

  private validateUrls(
    imageUrls: string[],
    specSheetUrl: string,
    supplierDocUrls: string[]
  ): void {
    if (!imageUrls || imageUrls.length < 3) {
      throw new Error("At least 3 product images are required (high resolution recommended)");
    }
    if (!specSheetUrl) {
      throw new Error("OEM specification sheet PDF (specSheet) is required");
    }
    if (!supplierDocUrls || supplierDocUrls.length < 1) {
      throw new Error("At least 1 supplier documentation PDF is required for counterfeit verification");
    }
  }

  /**
   * Extract uploaded file arrays from multer
   */
  private collectFilesFromReqfiles(req: Express.Request): {
    images: Express.Multer.File[];
    specSheet: Express.Multer.File | undefined;
    supplierDocs: Express.Multer.File[];
  } {
    const f = req.files;
    if (!f || !Array.isArray(f) && typeof f !== "object") {
      return { images: [], specSheet: undefined, supplierDocs: [] };
    }
    const files = f as Record<string, Express.Multer.File[]>;
    return {
      images: files.images || [],
      specSheet: files.specSheet?.[0],
      supplierDocs: files.supplierDocs || [],
    };
  }

  /**
   * Create a custom product request (multipart upload in controller)
   */
  async createRequest(sellerId: string, req: Express.Request): Promise<any> {
    const { images, specSheet, supplierDocs } = this.collectFilesFromReqfiles(req);
    if (images.length < 3) {
      throw new Error("At least 3 images are required in field 'images'");
    }
    if (!specSheet) {
      throw new Error("OEM spec PDF is required in field 'specSheet'");
    }
    if (supplierDocs.length < 1) {
      throw new Error("At least 1 supplier document PDF is required in field 'supplierDocs'");
    }

    const body = req.body || {};
    const productName = String(body.productName || "").trim();
    const category = String(body.category || "").trim();
    const make = String(body.make || "").trim();
    const model = String(body.model || "").trim();
    const partCode = body.partCode != null && String(body.partCode).trim() !== "" ? String(body.partCode).trim() : null;
    const description = body.description != null && String(body.description).trim() !== "" ? String(body.description).trim() : null;
    const year = body.year != null && body.year !== "" ? parseInt(String(body.year), 10) : null;

    if (!productName) throw new Error("productName is required");
    if (!category) throw new Error("category is required");
    if (!make) throw new Error("make is required");
    if (!model) throw new Error("model is required");
    if (body.year != null && body.year !== "" && (Number.isNaN(year) || year === null)) {
      throw new Error("year must be a valid number if provided");
    }

    const imgRes = await remoteUploadService.uploadFiles(images, "products");
    if (!imgRes.success || !imgRes.files) {
      throw new Error(imgRes.error || "Failed to upload product images");
    }
    const imageUrls = imgRes.files.map((f) => f.url);

    const specRes = await remoteUploadService.uploadPdfFiles([specSheet], "custom-product-docs");
    if (!specRes.success || !specRes.files?.length) {
      throw new Error(specRes.error || "Failed to upload OEM specification PDF");
    }
    const specSheetUrl = specRes.files[0].url;

    const supRes = await remoteUploadService.uploadPdfFiles(supplierDocs, "custom-product-docs");
    if (!supRes.success || !supRes.files?.length) {
      throw new Error(supRes.error || "Failed to upload supplier documentation PDFs");
    }
    const supplierDocUrls = supRes.files.map((f) => f.url);

    this.validateUrls(imageUrls, specSheetUrl, supplierDocUrls);

    const reviewDueAt = new Date(Date.now() + REVIEW_SLO_HOURS * MS_PER_HOUR);

    const created = await prisma.customProductRequest.create({
      data: {
        sellerId,
        productName,
        category,
        make,
        model,
        year: year != null && !Number.isNaN(year) ? year : null,
        partCode,
        description,
        imageUrls,
        specSheetUrl,
        supplierDocUrls,
        reviewDueAt,
        status: CustomProductRequestStatus.PENDING,
        counterfeitCheckVerified: false,
      },
      include: {
        seller: { select: { id: true, businessName: true, email: true } },
      },
    });

    try {
      const ns = new NotificationService();
      await ns.createNotification(
        "CUSTOM_PRODUCT_REQUEST_SUBMITTED",
        "New custom product request",
        `Seller ${created.seller.businessName} (${created.seller.email}) submitted a custom product: "${productName}". Request ID: ${created.id}. Review due by SLO: ${reviewDueAt.toISOString()}.`
      );
    } catch (e) {
      logger.warn("Admin notification (custom product) failed", e);
    }

    return {
      ...created,
      slo: this.computeSloMeta(created),
    };
  }

  /**
   * List requests for the authenticated seller
   */
  async listForSeller(
    sellerId: string,
    filters: { status?: CustomProductRequestStatus; page?: number; limit?: number }
  ): Promise<{ requests: any[]; total: number; page: number; totalPages: number }> {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = { sellerId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      prisma.customProductRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdProduct: { select: { id: true, masterPartId: true, oemPartNumber: true, name: true } },
        },
      }),
      prisma.customProductRequest.count({ where }),
    ]);

    const requests = rows.map((r) => ({
      ...r,
      slo: this.computeSloMeta(r),
    }));

    return {
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getByIdForSeller(sellerId: string, id: string): Promise<any> {
    const r = await prisma.customProductRequest.findFirst({
      where: { id, sellerId },
      include: {
        createdProduct: true,
        seller: { select: { id: true, businessName: true, email: true } },
      },
    });
    if (!r) {
      throw new Error("Request not found");
    }
    return { ...r, slo: this.computeSloMeta(r) };
  }

  /**
   * Resubmit after MORE_INFO_NEEDED: new files and metadata, resets counterfeit verification, new 72h SLO
   */
  async resubmit(sellerId: string, id: string, req: Express.Request): Promise<any> {
    const existing = await prisma.customProductRequest.findFirst({
      where: { id, sellerId },
    });
    if (!existing) {
      throw new Error("Request not found");
    }
    if (existing.status !== CustomProductRequestStatus.MORE_INFO_NEEDED) {
      throw new Error("Resubmit is only allowed when status is MORE_INFO_NEEDED");
    }

    const { images, specSheet, supplierDocs } = this.collectFilesFromReqfiles(req);
    if (images.length < 3 || !specSheet || supplierDocs.length < 1) {
      throw new Error("Resubmit requires at least 3 images, 1 specSheet PDF, and 1 supplierDocs PDF (same as create)");
    }

    const body = req.body || {};
    const productName = String(body.productName || "").trim() || existing.productName;
    const category = String(body.category || "").trim() || existing.category;
    const make = String(body.make || "").trim() || existing.make;
    const model = String(body.model || "").trim() || existing.model;
    const partCode =
      body.partCode !== undefined
        ? body.partCode != null && String(body.partCode).trim() !== ""
          ? String(body.partCode).trim()
          : null
        : existing.partCode;
    const description =
      body.description !== undefined
        ? body.description != null && String(body.description).trim() !== ""
          ? String(body.description).trim()
          : null
        : existing.description;
    const year =
      body.year !== undefined
        ? body.year != null && body.year !== ""
          ? parseInt(String(body.year), 10)
          : null
        : existing.year;

    const imgRes = await remoteUploadService.uploadFiles(images, "products");
    if (!imgRes.success || !imgRes.files) throw new Error(imgRes.error || "Image upload failed");
    const imageUrls = imgRes.files.map((f) => f.url);

    const specRes = await remoteUploadService.uploadPdfFiles([specSheet], "custom-product-docs");
    if (!specRes.success || !specRes.files?.length) throw new Error(specRes.error || "Spec PDF upload failed");
    const specSheetUrl = specRes.files[0].url;

    const supRes = await remoteUploadService.uploadPdfFiles(supplierDocs, "custom-product-docs");
    if (!supRes.success || !supRes.files?.length) throw new Error(supRes.error || "Supplier docs upload failed");
    const supplierDocUrls = supRes.files.map((f) => f.url);

    this.validateUrls(imageUrls, specSheetUrl, supplierDocUrls);

    const reviewDueAt = new Date(Date.now() + REVIEW_SLO_HOURS * MS_PER_HOUR);

    const updated = await prisma.customProductRequest.update({
      where: { id },
      data: {
        productName,
        category,
        make,
        model,
        year: year != null && !Number.isNaN(year) ? year : null,
        partCode,
        description,
        imageUrls,
        specSheetUrl,
        supplierDocUrls,
        reviewDueAt,
        status: CustomProductRequestStatus.PENDING,
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        counterfeitCheckVerified: false,
        counterfeitCheckVerifiedAt: null,
        counterfeitCheckVerifiedBy: null,
        counterfeitCheckNotes: null,
      },
      include: {
        seller: { select: { id: true, businessName: true, email: true } },
      },
    });

    try {
      const { SellerNotificationService } = await import("../notifications/SellerNotificationService");
      const sns = new SellerNotificationService();
      await sns.createNotification(
        sellerId,
        "CUSTOM_PRODUCT_REQUEST_RESUBMITTED",
        "Custom product request updated",
        `Your resubmission for "${productName}" (request ${id}) is pending review. New review deadline: ${reviewDueAt.toISOString()}.`
      );
    } catch (e) {
      logger.warn("Seller notification (resubmit) failed", e);
    }

    try {
      const ns = new NotificationService();
      await ns.createNotification(
        "CUSTOM_PRODUCT_REQUEST_RESUBMITTED",
        "Custom product resubmitted",
        `Seller ${updated.seller.businessName} resubmitted custom product request "${productName}" (ID: ${id}). SLO: ${reviewDueAt.toISOString()}.`
      );
    } catch (e) {
      /* optional */
    }

    return { ...updated, slo: this.computeSloMeta(updated) };
  }
}
