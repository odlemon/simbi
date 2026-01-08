// @ts-nocheck
import { Request, Response } from 'express';
import BuyerAddressService from '../../services/buyer/address/BuyerAddressService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

export class BuyerAddressController {
  private addressService: BuyerAddressService;

  constructor() {
    this.addressService = new BuyerAddressService();
  }

  /**
   * Create a new address
   * POST /api/buyer/addresses
   */
  async createAddress(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.createAddress(buyerId, req.body);
      
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
      console.error('Create address controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get all addresses for buyer
   * GET /api/buyer/addresses
   */
  async getAddresses(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.getAddresses(buyerId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get addresses',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get addresses controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get address by ID
   * GET /api/buyer/addresses/:id
   */
  async getAddressById(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const addressId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.getAddressById(buyerId, addressId);
      
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
      console.error('Get address by ID controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Update address
   * PUT /api/buyer/addresses/:id
   */
  async updateAddress(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const addressId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.updateAddress(buyerId, addressId, req.body);
      
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
      console.error('Update address controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Delete address
   * DELETE /api/buyer/addresses/:id
   */
  async deleteAddress(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const addressId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.deleteAddress(buyerId, addressId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Delete address controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Set default address
   * POST /api/buyer/addresses/:id/set-default
   */
  async setDefaultAddress(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const addressId = req.params.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.setDefaultAddress(buyerId, addressId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
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
      console.error('Set default address controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get default address
   * GET /api/buyer/addresses/default
   */
  async getDefaultAddress(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const result = await this.addressService.getDefaultAddress(buyerId);
      
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
      console.error('Get default address controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default BuyerAddressController;
