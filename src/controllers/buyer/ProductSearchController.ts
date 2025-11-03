// @ts-nocheck
import { Request, Response } from 'express';
import { FastProductSearchService } from '../../services/buyer/product/FastProductSearchService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

export class ProductSearchController {
  private fastSearchService: FastProductSearchService;

  constructor() {
    this.fastSearchService = new FastProductSearchService();
  }

  /**
   * Get all marketplace products (public endpoint - no authentication required)
   * GET /api/buyer/products/marketplace
   */
  async getMarketplaceProducts(req: Request, res: Response): Promise<void> {
    try {
      const {
        // Text search - support both q and search
        q,
        search,
        // Category filters - support both category/categories
        category,
        categories,
        // Brand/Manufacturer filters - support brands/brand/manufacturer
        brands,
        brand,
        manufacturer,
        // Subcategory
        subcategory,
        // Price range
        minPrice,
        maxPrice,
        // Vehicle compatibility
        make,
        model,
        year,
        yearFrom,
        yearTo,
        // Other filters
        inStock,
        productType,
        // Pagination
        page = 1,
        limit = 20,
        // Sorting - support both sortBy and sort
        sortBy,
        sort
      } = req.query;

      const criteria: any = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      // Text search - prioritize q, fallback to search
      if (q) {
        criteria.q = q;
      } else if (search) {
        criteria.q = search;
      }

      // Category filters - support both singular and plural
      if (categories) {
        criteria.categories = categories;
      } else if (category) {
        criteria.category = category;
      }

      // Brand/Manufacturer filters - support brands/brand/manufacturer
      if (brands) {
        criteria.brands = brands;
      } else if (brand) {
        criteria.brand = brand;
      } else if (manufacturer) {
        criteria.manufacturer = manufacturer;
      }

      // Subcategory filter
      if (subcategory) {
        criteria.subcategory = subcategory;
      }

      // Price range filters
      if (minPrice) criteria.minPrice = parseFloat(minPrice as string);
      if (maxPrice) criteria.maxPrice = parseFloat(maxPrice as string);
      
      // Vehicle fitment filters
      if (make) criteria.make = make;
      if (model) criteria.model = model;
      if (year) criteria.year = parseInt(year as string);
      if (yearFrom) criteria.yearFrom = parseInt(yearFrom as string);
      if (yearTo) criteria.yearTo = parseInt(yearTo as string);
      
      // Stock filter - parse string to boolean
      if (inStock !== undefined) {
        criteria.inStock = inStock === 'true' || inStock === true || inStock === '1';
      }
      
      // Product type filter (for future implementation)
      if (productType) criteria.productType = productType;
      
      // Sorting - support both sortBy and sort parameters
      if (sortBy) {
        criteria.sortBy = sortBy;
      } else if (sort) {
        criteria.sortBy = sort;
      }

      // For marketplace, only show cheapest product per master product
      criteria.onlyCheapest = true;

      // Use FAST search service for marketplace products
      const result = await this.fastSearchService.fastSearch(criteria);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Marketplace products retrieved successfully',
          data: result.data,
          pagination: result.pagination || {
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 20
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to fetch marketplace products',
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Get marketplace products controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Decode VIN and get vehicle information
   * POST /api/buyer/products/vin-decode
   */
  async decodeVin(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const { vin } = req.body;

      if (!vin) {
        res.status(400).json({
          success: false,
          message: 'VIN is required',
          error: 'MISSING_VIN'
        });
        return;
      }

      // Use FAST search service for VIN decode (no MySQL mode errors!)
      const result = await this.fastSearchService.decodeVin(vin);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'VIN decode failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('VIN decode controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Search products by vehicle information
   * POST /api/buyer/products/search-by-vehicle
   */
  async searchByVehicle(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const vehicleInfo = req.body;

      const result = await this.fastSearchService.fastSearch({ q: vehicleInfo.make + ' ' + vehicleInfo.model });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Vehicle search failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Vehicle search controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get all products (with optional filters)
   * GET /api/buyer/products
   */
  async getAllProducts(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        manufacturer,
        inStock
      } = req.query;

      const criteria: any = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      if (category) criteria.category = category;
      if (manufacturer) criteria.manufacturer = manufacturer;
      if (inStock) criteria.inStock = inStock === 'true';

      // Use FAST search service (single query, no N+1 problems!)
      const result = await this.fastSearchService.fastSearch(criteria);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to fetch products',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get all products controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Search products with query parameters
   * GET /api/buyer/products/search
   */
  async searchProducts(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const {
        q,                    // Search query
        make,                 // Vehicle make
        model,                // Vehicle model
        year,                 // Vehicle year
        yearFrom,             // Year range from
        yearTo,               // Year range to
        category,              // Product category
        subcategory,          // Product subcategory
        manufacturer,        // Product manufacturer
        priceMin,            // Minimum price
        priceMax,             // Maximum price
        inStock,              // Only in-stock items
        page = 1,             // Page number
        limit = 20            // Items per page
      } = req.query;

      // Build search criteria from query parameters
      const criteria: any = {};
      
      if (q) criteria.q = q;
      if (make) criteria.make = make;
      if (model) criteria.model = model;
      if (year) criteria.year = parseInt(year as string);
      if (yearFrom) criteria.yearFrom = parseInt(yearFrom as string);
      if (yearTo) criteria.yearTo = parseInt(yearTo as string);
      if (category) criteria.category = category;
      if (subcategory) criteria.subcategory = subcategory;
      if (manufacturer) criteria.manufacturer = manufacturer;
      if (priceMin) criteria.priceMin = parseFloat(priceMin as string);
      if (priceMax) criteria.priceMax = parseFloat(priceMax as string);
      if (inStock) criteria.inStock = inStock === 'true';
      
      criteria.page = parseInt(page as string) || 1;
      criteria.limit = parseInt(limit as string) || 20;

      // Use FAST search service (single query, no N+1 problems!)
      const result = await this.fastSearchService.fastSearch(criteria);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Product search failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Product search controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Bulk search by part numbers
   * POST /api/buyer/products/bulk-search
   */
  async bulkSearch(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const { partNumbers } = req.body;

      if (!partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Part numbers array is required',
          error: 'MISSING_PART_NUMBERS'
        });
        return;
      }

      const result = await this.fastSearchService.fastSearch({ q: partNumbers.join(' ') });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Bulk search failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Bulk search controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/buyer/products/:id
   */
  async getProductById(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      // Use the new getProductById method that searches seller listings
      const result = await this.fastSearchService.getProductById(productId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Product not found in seller listings',
          error: 'PRODUCT_NOT_FOUND'
        });
      }
    } catch (error) {
      console.error('Get product by ID controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Save search criteria
   * POST /api/buyer/products/saved-searches
   */
  async saveSearch(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.fastSearchService.saveSearch(buyerId, req.body);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Save search failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Save search controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get saved searches for buyer
   * GET /api/buyer/products/saved-searches
   */
  async getSavedSearches(req: BuyerAuthRequest, res: Response): Promise<void> {
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

      const result = await this.fastSearchService.getSavedSearches(buyerId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Get saved searches failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get saved searches controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Calculate display price for product
   * GET /api/buyer/products/:id/price
   */
  async getProductPrice(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      const result = await this.fastSearchService.calculateDisplayPrice(productId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get product price controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default ProductSearchController;
