// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { SellerManagementService } from "../../../services/admin/sellers/SellerManagementService";
import { SRICalculationService } from "../../../services/admin/sellers/SRICalculationService";
import { DocumentManagementService } from "../../../services/admin/sellers/DocumentManagementService";
import { logger } from "../../../utils/logger";

export class SellerController {
  private sellerService: SellerManagementService;
  private sriService: SRICalculationService;
  private documentService: DocumentManagementService;

  constructor() {
    this.sellerService = new SellerManagementService();
    this.sriService = new SRICalculationService();
    this.documentService = new DocumentManagementService();
  }

  // GET /api/admin/sellers/comprehensive - All seller data in one endpoint
  getComprehensiveSellerData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        status,
        minSRI,
        maxSRI,
        isEligible,
        isShadowBanned,
      } = req.query;

      const pagination = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const filters = {
        search: search as string | undefined,
        status: status as any,
        minSRI: minSRI ? Number(minSRI) : undefined,
        maxSRI: maxSRI ? Number(maxSRI) : undefined,
        isEligible: isEligible === "true" ? true : isEligible === "false" ? false : undefined,
        isShadowBanned: isShadowBanned === "true" ? true : isShadowBanned === "false" ? false : undefined,
      };

      // Fetch all seller data in parallel
      const [
        sellersResult,
        statsResult,
        pendingDocuments,
        expiringDocuments,
        expiredDocuments,
        sriViolations,
      ] = await Promise.all([
        // Sellers with pagination
        this.sellerService.getAllSellers(pagination, filters),
        
        // Seller statistics
        this.sellerService.getSellerStats(),
        
        // Pending documents
        this.documentService.getPendingDocuments(),
        
        // Expiring documents
        this.documentService.getExpiringDocuments(),
        
        // Expired documents
        this.documentService.getExpiredDocuments(),
        
        // SRI violations
        this.sriService.getSRIViolations(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          sellers: sellersResult.data,
          pagination: sellersResult.pagination,
          statistics: statsResult.data,
          documents: {
            pending: pendingDocuments.data,
            expiring: expiringDocuments.data,
            expired: expiredDocuments.data,
          },
          compliance: {
            sriViolations: sriViolations.data,
          },
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getComprehensiveSellerData", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive seller data",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers
  getAllSellers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        status,
        minSRI,
        maxSRI,
        isEligible,
        isShadowBanned,
      } = req.query;

      const pagination = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const filters = {
        search: search as string | undefined,
        status: status as any,
        minSRI: minSRI ? Number(minSRI) : undefined,
        maxSRI: maxSRI ? Number(maxSRI) : undefined,
        isEligible: isEligible === "true" ? true : isEligible === "false" ? false : undefined,
        isShadowBanned: isShadowBanned === "true" ? true : isShadowBanned === "false" ? false : undefined,
      };

      const result = await this.sellerService.getAllSellers(pagination, filters);

      res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllSellers", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch sellers",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/:id
  getSellerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const seller = await this.sellerService.getSellerById(id);

      if (!seller) {
        res.status(404).json({
          success: false,
          message: "Seller not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: seller,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSellerById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers
  createSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const seller = await this.sellerService.createSeller(req.body, req.admin.id);

      res.status(201).json({
        success: true,
        message: "Seller created successfully",
        data: seller,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/sellers/:id
  updateSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const seller = await this.sellerService.updateSeller(id, req.body, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Seller updated successfully",
        data: seller,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/:id/approve
  approveSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      await this.sellerService.approveSeller(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Seller approved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in approveSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/:id/suspend
  suspendSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          message: "Reason is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.sellerService.suspendSeller(id, reason, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Seller suspended successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in suspendSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to suspend seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/:id/ban
  banSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          message: "Reason is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.sellerService.banSeller(id, reason, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Seller banned successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in banSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to ban seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/:id/reactivate
  reactivateSeller = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      await this.sellerService.reactivateSeller(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Seller reactivated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in reactivateSeller", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reactivate seller",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/stats
  getSellerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.sellerService.getSellerStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSellerStats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch seller stats",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/:id/recalculate-sri
  recalculateSRI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      await this.sellerService.recalculateSRI(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "SRI recalculated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in recalculateSRI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to recalculate SRI",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/:id/sri-history
  getSRIHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 30 } = req.query;

      const history = await this.sriService.getSRIHistory(id, Number(limit));

      res.status(200).json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSRIHistory", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch SRI history",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/batch-sri-update
  batchUpdateSRI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Run in background
      this.sriService.batchUpdateAllSellers().then((result) => {
        logger.info("Batch SRI update completed", result);
      });

      res.status(202).json({
        success: true,
        message: "Batch SRI update started in background",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in batchUpdateSRI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to start batch SRI update",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/:id/documents
  getSellerDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const documents = await this.documentService.getSellerDocuments(id);

      res.status(200).json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSellerDocuments", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch documents",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/documents/:docId/approve
  approveDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { docId } = req.params;
      const document = await this.documentService.approveDocument(docId, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Document approved successfully",
        data: document,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in approveDocument", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to approve document",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/sellers/documents/:docId/reject
  rejectDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { docId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          message: "Rejection reason is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const document = await this.documentService.rejectDocument(docId, reason, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Document rejected successfully",
        data: document,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in rejectDocument", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to reject document",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/documents/pending
  getPendingDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documents = await this.documentService.getPendingDocuments();

      res.status(200).json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getPendingDocuments", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending documents",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/documents/expiring
  getExpiringDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;
      const documents = await this.documentService.getExpiringDocuments(Number(days));

      res.status(200).json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getExpiringDocuments", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch expiring documents",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/sellers/documents/expired
  getExpiredDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documents = await this.documentService.getExpiredDocuments();

      res.status(200).json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getExpiredDocuments", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch expired documents",
        timestamp: new Date().toISOString(),
      });
    }
  };
}


