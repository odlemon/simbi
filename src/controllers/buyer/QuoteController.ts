import { Request, Response } from 'express';
import QuoteService from '../../services/buyer/quote/QuoteService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

class QuoteController {
  private quoteService: QuoteService;

  constructor() {
    this.quoteService = new QuoteService();
  }

  /**
   * Create a quote request
   * POST /api/buyer/quotes
   */
  async createQuoteRequest(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.quoteService.createQuoteRequest(buyerId, req.body);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create quote request',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create quote request controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get quote requests for buyer
   * GET /api/buyer/quotes
   */
  async getBuyerQuoteRequests(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.quoteService.getBuyerQuoteRequests(buyerId, page, limit);
      
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
          message: 'Failed to get quote requests',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get buyer quote requests controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get quote requests for seller
   * GET /api/seller/quotes
   */
  async getSellerQuoteRequests(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = req.user?.sellerId; // TODO: Get from seller auth
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID'
        });
        return;
      }

      const result = await this.quoteService.getSellerQuoteRequests(sellerId, page, limit);
      
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
          message: 'Failed to get quote requests',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get seller quote requests controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Respond to quote request (seller)
   * POST /api/seller/quotes/:id/respond
   */
  async respondToQuote(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = req.user?.sellerId; // TODO: Get from seller auth
      
      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_SELLER_ID'
        });
        return;
      }

      const result = await this.quoteService.respondToQuote(sellerId, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to respond to quote',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Respond to quote controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Accept quote (buyer)
   * POST /api/buyer/quotes/:id/accept
   */
  async acceptQuote(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.quoteService.acceptQuote(buyerId, req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to accept quote',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Accept quote controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get quote statistics
   * GET /api/admin/quotes/stats
   */
  async getQuoteStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.quoteService.getQuoteStats();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get quote statistics',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get quote stats controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default QuoteController;
