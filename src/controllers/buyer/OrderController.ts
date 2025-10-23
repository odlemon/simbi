// @ts-nocheck
import { Request, Response } from 'express';
import OrderService from '../../services/buyer/order/OrderService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create a new order
   * POST /api/buyer/orders
   */
  async createOrder(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const orderData = {
        buyerId,
        ...req.body
      };

      const result = await this.orderService.createOrder(orderData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create order controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get order by ID
   * GET /api/buyer/orders/:id
   */
  async getOrderById(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const orderId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.orderService.getOrderWithPaymentStatus(orderId, buyerId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get order by ID controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get orders for buyer
   * GET /api/buyer/orders
   */
  async getBuyerOrders(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.orderService.getBuyerOrders(buyerId, page, limit);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil((result.total || 0) / limit)
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get orders',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get buyer orders controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Update order status
   * PUT /api/buyer/orders/:id/status
   */
  async updateOrderStatus(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const orderId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.orderService.updateOrderStatus(orderId, buyerId, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Update order status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Track order
   * GET /api/buyer/orders/:id/tracking
   */
  async trackOrder(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const orderId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.orderService.trackOrder(orderId, buyerId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Track order controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Cancel order
   * POST /api/buyer/orders/:id/cancel
   */
  async cancelOrder(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const orderId = req.params.id;
      const { reason } = req.body;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.orderService.cancelOrder(orderId, buyerId, reason);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Cancel order controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Calculate commission for order items
   * POST /api/buyer/orders/calculate-commission
   */
  async calculateCommission(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        res.status(400).json({
          success: false,
          message: 'Items array is required',
          error: 'MISSING_ITEMS'
        });
        return;
      }

      const result = await this.orderService.calculateCommission(items);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Calculate commission controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default OrderController;
