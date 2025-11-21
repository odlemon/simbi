// @ts-nocheck

import { Router } from 'express';
import CartController from '../../controllers/buyer/CartController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const controller = new CartController();

/**
 * @swagger
 * tags:
 *   name: Buyer - Cart
 *   description: Shopping cart management for buyers
 */

/**
 * @swagger
 * /api/buyer/cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Buyer - Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inventoryId
 *               - quantity
 *             properties:
 *               inventoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Seller inventory ID
 *                 example: "35930667-1300-4773-8827-02fc9781ca4a"
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to add
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/add', authenticateBuyer, (req, res) => controller.addToCart(req, res));

/**
 * @swagger
 * /api/buyer/cart:
 *   get:
 *     summary: Get cart with all items
 *     tags: [Buyer - Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     buyerId:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           inventoryId:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               oemPartNumber:
 *                                 type: string
 *                               manufacturer:
 *                                 type: string
 *                               imageUrls:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               category:
 *                                 type: string
 *                               subcategory:
 *                                 type: string
 *                           seller:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               businessName:
 *                                 type: string
 *                           pricing:
 *                             type: object
 *                             properties:
 *                               sellerPrice:
 *                                 type: number
 *                               currency:
 *                                 type: string
 *                               commission:
 *                                 type: number
 *                               displayPrice:
 *                                 type: number
 *                               totalPrice:
 *                                 type: number
 *                           stock:
 *                             type: object
 *                             properties:
 *                               available:
 *                                 type: integer
 *                               inStock:
 *                                 type: boolean
 *                     summary:
 *                       type: object
 *                       properties:
 *                         itemCount:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         subtotal:
 *                           type: number
 *                         totalCommission:
 *                           type: number
 *                         totalAmount:
 *                           type: number
 *                         currency:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateBuyer, (req, res) => controller.getCart(req, res));

/**
 * @swagger
 * /api/buyer/cart/item/{cartItemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Buyer - Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.put('/item/:cartItemId', authenticateBuyer, (req, res) => controller.updateCartItem(req, res));

/**
 * @swagger
 * /api/buyer/cart/item/{cartItemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Buyer - Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       400:
 *         description: Cart item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/item/:cartItemId', authenticateBuyer, (req, res) => controller.removeFromCart(req, res));

/**
 * @swagger
 * /api/buyer/cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Buyer - Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/', authenticateBuyer, (req, res) => controller.clearCart(req, res));

export default router;





