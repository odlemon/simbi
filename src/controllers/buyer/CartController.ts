// @ts-nocheck

import { Request, Response } from 'express';
import CartService from '../../services/buyer/cart/CartService';
import { AuthenticatedRequest } from '../../middleware/buyerAuth';

const cartService = new CartService();

export class CartController {
  /**
   * Add item to cart
   * POST /api/buyer/cart/add
   */
  async addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No buyer ID found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await cartService.addToCart(buyerId, req.body);

      if (!result.success) {
        res.status(400).json({
          ...result,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Add to cart controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add item to cart',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get cart with all items
   * GET /api/buyer/cart
   */
  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No buyer ID found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await cartService.getCart(buyerId);

      if (!result.success) {
        res.status(400).json({
          ...result,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get cart controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cart',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update cart item quantity
   * PUT /api/buyer/cart/item/:cartItemId
   */
  async updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No buyer ID found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { cartItemId } = req.params;

      const result = await cartService.updateCartItem(buyerId, cartItemId, req.body);

      if (!result.success) {
        res.status(400).json({
          ...result,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update cart item controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cart item',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/buyer/cart/item/:cartItemId
   */
  async removeFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No buyer ID found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { cartItemId } = req.params;

      const result = await cartService.removeFromCart(buyerId, cartItemId);

      if (!result.success) {
        res.status(400).json({
          ...result,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Remove from cart controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove item from cart',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clear entire cart
   * DELETE /api/buyer/cart
   */
  async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No buyer ID found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await cartService.clearCart(buyerId);

      if (!result.success) {
        res.status(400).json({
          ...result,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Clear cart controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cart',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default CartController;





