import { Request, Response } from 'express';
import DisputeService from '../../services/buyer/dispute/DisputeService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

class DisputeController {
  private disputeService: DisputeService;

  constructor() {
    this.disputeService = new DisputeService();
  }

  /**
   * Create a new dispute
   * POST /api/buyer/disputes
   */
  async createDispute(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.disputeService.createDispute(buyerId, req.body);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create dispute',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create dispute controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get disputes for buyer
   * GET /api/buyer/disputes
   */
  async getBuyerDisputes(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.disputeService.getBuyerDisputes(buyerId, page, limit);
      
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
          message: 'Failed to get disputes',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get buyer disputes controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get dispute by ID
   * GET /api/buyer/disputes/:id
   */
  async getDisputeById(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const disputeId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.disputeService.getDisputeById(disputeId, buyerId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Dispute not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get dispute by ID controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Update dispute (add evidence)
   * PUT /api/buyer/disputes/:id
   */
  async updateDispute(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      const disputeId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.disputeService.updateDispute(disputeId, buyerId, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update dispute',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Update dispute controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get all disputes (admin only)
   * GET /api/admin/disputes
   */
  async getAllDisputes(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
        disputeType: req.query.disputeType as string,
        priority: req.query.priority as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };

      const result = await this.disputeService.getAllDisputes(page, limit, filters);
      
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
          message: 'Failed to get disputes',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get all disputes controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Resolve dispute (admin only)
   * POST /api/admin/disputes/:id/resolve
   */
  async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const disputeId = req.params.id;
      const adminId = req.user?.adminId || 'system'; // TODO: Get from admin auth

      const result = await this.disputeService.resolveDispute(disputeId, adminId, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to resolve dispute',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Resolve dispute controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get dispute statistics (admin only)
   * GET /api/admin/disputes/stats
   */
  async getDisputeStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.disputeService.getDisputeStats();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get dispute statistics',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get dispute stats controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default DisputeController;
