// @ts-nocheck
import { Router } from "express";
import { SellerAuthController } from "../../controllers/seller/auth/SellerAuthController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new SellerAuthController();

/**
 * @swagger
 * /api/seller/auth/register:
 *   post:
 *     summary: Register a new seller
 *     tags: [Seller - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - businessName
 *               - tin
 *               - phone
 *               - address
 *               - city
 *               - contactPerson
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               businessName:
 *                 type: string
 *               tin:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *     responses:
 *       201:
 *         description: Seller registered successfully
 */
router.post("/register", (req, res) => controller.register(req, res));

/**
 * @swagger
 * /api/seller/auth/login:
 *   post:
 *     summary: Login seller
 *     tags: [Seller - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", (req, res) => controller.login(req, res));

// Refresh token removed - using single token like admin

/**
 * @swagger
 * /api/seller/auth/profile:
 *   get:
 *     summary: Get seller profile
 *     tags: [Seller - Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get("/profile", authenticateSeller, (req, res) =>
  controller.getProfile(req, res)
);

/**
 * @swagger
 * /api/seller/auth/profile:
 *   patch:
 *     summary: Update seller profile
 *     tags: [Seller - Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch("/profile", authenticateSeller, (req, res) =>
  controller.updateProfile(req, res)
);

export default router;

