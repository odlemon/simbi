// @ts-nocheck
import { Request, Response } from 'express';
import { IndividualBuyerOrderService } from '../../services/guest/IndividualBuyerOrderService';
import { logger } from '../../utils/logger';

export class IndividualBuyerOrderController {
  private orderService: IndividualBuyerOrderService;

  constructor() {
    this.orderService = new IndividualBuyerOrderService();
  }

  /**
   * Create order for individual buyer (unauthenticated endpoint)
   * POST /api/guest/orders
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      // Log the request (without sensitive data)
      logger.info('Individual buyer order creation request', {
        email: req.body?.email,
        itemCount: req.body?.items?.length || 0,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      const result = await this.orderService.createOrder(req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message || 'Order placed successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create order',
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error('Error in individual buyer order controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message || 'An unexpected error occurred',
      });
    }
  }
}
