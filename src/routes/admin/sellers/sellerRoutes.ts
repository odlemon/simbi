// @ts-nocheck
import { Router } from "express";
import { SellerController } from "../../../controllers/admin/sellers/SellerController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireSuperAdmin, requireCompliance, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new SellerController();

// Seller CRUD operations
router.get("/", authenticateAdmin, requireAnyAdmin, controller.getAllSellers);
router.get("/stats", authenticateAdmin, requireAnyAdmin, controller.getSellerStats);
router.get("/:id", authenticateAdmin, requireAnyAdmin, controller.getSellerById);
router.post("/", authenticateAdmin, requireSuperAdmin, controller.createSeller);
router.put("/:id", authenticateAdmin, requireSuperAdmin, controller.updateSeller);

// Seller status management
router.post("/:id/approve", authenticateAdmin, requireCompliance, controller.approveSeller);
router.post("/:id/suspend", authenticateAdmin, requireCompliance, controller.suspendSeller);
router.post("/:id/ban", authenticateAdmin, requireSuperAdmin, controller.banSeller);
router.post("/:id/reactivate", authenticateAdmin, requireCompliance, controller.reactivateSeller);

// SRI Management
router.post("/:id/recalculate-sri", authenticateAdmin, requireAnyAdmin, controller.recalculateSRI);
router.get("/:id/sri-history", authenticateAdmin, requireAnyAdmin, controller.getSRIHistory);
router.post("/batch-sri-update", authenticateAdmin, requireSuperAdmin, controller.batchUpdateSRI);

// Document Management
router.get("/:id/documents", authenticateAdmin, requireAnyAdmin, controller.getSellerDocuments);
router.post("/documents/:docId/approve", authenticateAdmin, requireCompliance, controller.approveDocument);
router.post("/documents/:docId/reject", authenticateAdmin, requireCompliance, controller.rejectDocument);
router.get("/documents/pending", authenticateAdmin, requireCompliance, controller.getPendingDocuments);
router.get("/documents/expiring", authenticateAdmin, requireCompliance, controller.getExpiringDocuments);
router.get("/documents/expired", authenticateAdmin, requireCompliance, controller.getExpiredDocuments);

export default router;


