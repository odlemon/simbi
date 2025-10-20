// @ts-nocheck
import { Router } from "express";
import { MasterProductController } from "../../controllers/admin/catalog/MasterProductController";
import { authenticateAdmin } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/rbac";
import { UserRole } from "@prisma/client";

const router = Router();
const controller = new MasterProductController();

/**
 * @swagger
 * /api/admin/catalog/products:
 *   get:
 *     summary: Get all master products
 *     tags: [Admin - Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  "/products",
  authenticateAdmin,
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINOPS_ANALYST),
  (req, res) => controller.getProducts(req, res)
);

/**
 * @swagger
 * /api/admin/catalog/products/{id}:
 *   get:
 *     summary: Get single master product
 *     tags: [Admin - Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 */
router.get(
  "/products/:id",
  authenticateAdmin,
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINOPS_ANALYST),
  (req, res) => controller.getProduct(req, res)
);

/**
 * @swagger
 * /api/admin/catalog/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin - Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get(
  "/categories",
  authenticateAdmin,
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINOPS_ANALYST),
  (req, res) => controller.getCategories(req, res)
);

/**
 * @swagger
 * /api/admin/catalog/stats:
 *   get:
 *     summary: Get catalog statistics
 *     tags: [Admin - Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get(
  "/stats",
  authenticateAdmin,
  requireRole(UserRole.SUPER_ADMIN, UserRole.FINOPS_ANALYST),
  (req, res) => controller.getStats(req, res)
);

export default router;

