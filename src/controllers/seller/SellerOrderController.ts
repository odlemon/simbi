import { Request, Response } from 'express';
import { SellerOrderService } from '../../services/seller/orders/SellerOrderService';
import { SellerAuthRequest } from '../../middleware/sellerAuth';

export class SellerOrderController {
  private orderService: SellerOrderService;

  constructor() {
    this.orderService = new SellerOrderService();
  }

  /**
   * Get all orders for a seller
   * GET /api/seller/orders
   */
  async getOrders(req: SellerAuthRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Seller not authenticated',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.orderService.getSellerOrders(sellerId, page, limit);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.data?.length || 0
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get orders controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get order details by ID
   * GET /api/seller/orders/:id
   */
  async getOrderDetails(req: SellerAuthRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Seller not authenticated',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const orderId = req.params.id;
      const result = await this.orderService.getOrderDetails(sellerId, orderId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        const statusCode = result.error === 'ORDER_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get order details controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Update order status (accept/reject)
   * PATCH /api/seller/orders/:id/status
   */
  async updateOrderStatus(req: SellerAuthRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Seller not authenticated',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const orderId = req.params.id;
      const { status, rejectionReason } = req.body;

      if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be ACCEPTED or REJECTED',
          error: 'INVALID_STATUS'
        });
        return;
      }

      if (status === 'REJECTED' && !rejectionReason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting an order',
          error: 'MISSING_REJECTION_REASON'
        });
        return;
      }

      const result = await this.orderService.updateOrderStatus(
        sellerId,
        orderId,
        status,
        rejectionReason
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        const statusCode = result.error === 'ORDER_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
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
   * Update fulfillment status
   * PATCH /api/seller/orders/:id/fulfillment
   */
  async updateFulfillmentStatus(req: SellerAuthRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Seller not authenticated',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const orderId = req.params.id;
      const { status, trackingNumber, estimatedDeliveryDate } = req.body;

      if (!status || !['SHIPPED', 'DELIVERED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be SHIPPED or DELIVERED',
          error: 'INVALID_STATUS'
        });
        return;
      }

      const result = await this.orderService.updateFulfillmentStatus(
        sellerId,
        orderId,
        status,
        trackingNumber,
        estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        const statusCode = result.error === 'ORDER_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Update fulfillment status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get order statistics
   * GET /api/seller/orders/statistics
   */
  async getOrderStatistics(req: SellerAuthRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Seller not authenticated',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const result = await this.orderService.getOrderStatistics(sellerId);

      if (result.success) {
        res.status(200).json({
          success: true,
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
      console.error('Get order statistics controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default SellerOrderController;
