// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../../utils/database';
import { MoneyUtils } from '../../../utils/money';

// Fast search criteria schema
const searchCriteriaSchema = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  page: z.number().default(1),
  limit: z.number().default(20)
});

interface FastProductResult {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  category: string;
  subcategory: string;
  displayPrice: number;
  currency: string;
  inStock: boolean;
  sellerCount: number;
  lowestPrice: number;
  commission: number;
}

export class FastProductSearchService {
  
  /**
   * ULTRA-FAST: Single query with all pricing calculated in memory
   */
  async fastSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: FastProductResult[]; error?: string }> {
    try {
      const validatedCriteria = searchCriteriaSchema.parse(criteria);
      const { page = 1, limit = 20 } = validatedCriteria;
      const skip = (page - 1) * limit;

      // Build optimized where clause
      const whereClause = this.buildWhereClause(validatedCriteria);

      // SINGLE QUERY - Get seller listings directly (not master products)
      const sellerListings = await prisma.sellerInventory.findMany({
        where: {
          quantity: { gt: 0 },
          isActive: true,
          seller: {
            isEligible: true,
            sriScore: { gte: 70 }
          },
          masterProduct: whereClause // Apply search criteria to the master product
        },
        include: {
          masterProduct: {
            select: {
              id: true,
              name: true,
              oemPartNumber: true,
              manufacturer: true,
              description: true,
              vehicleCompatibility: true,
              imageUrls: true
            }
          },
          seller: {
            select: {
              id: true,
              businessName: true,
              sriScore: true,
              isEligible: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      // Calculate pricing in memory (NO DATABASE QUERIES!)
      const results = sellerListings.map(listing => this.calculateFastPricingFromListing(listing));

      // Apply filters in memory
      const filteredResults = this.applyFilters(results, validatedCriteria);

      return {
        success: true,
        data: filteredResults
      };

    } catch (error) {
      console.error('Fast search error:', error);
      console.error('Error details:', error.message);
      return {
        success: false,
        error: `Search failed: ${error.message}`
      };
    }
  }

  /**
   * Build optimized where clause for master product (MySQL compatible)
   */
  private buildWhereClause(criteria: any): any {
    const whereClause: any = {};

    // Search in name and OEM part number (MySQL compatible - no mode option)
    if (criteria.q) {
      whereClause.OR = [
        { name: { contains: criteria.q } },
        { oemPartNumber: { contains: criteria.q } },
        { description: { contains: criteria.q } }
      ];
    }

    // Search in manufacturer (MySQL compatible)
    if (criteria.manufacturer) {
      whereClause.manufacturer = { contains: criteria.manufacturer };
    }

    // For now, return basic where clause since vehicle compatibility is in JSON
    // TODO: Implement JSON path queries for vehicle compatibility
    return whereClause;
  }

  /**
   * Calculate pricing from seller listing (NO DATABASE QUERIES!)
   */
  private calculateFastPricingFromListing(listing: any): FastProductResult {
    const product = listing.masterProduct;
    const sellerPrice = listing.sellerPrice;
    const currency = listing.currency;
    const quantity = listing.quantity;
    
    // Extract vehicle compatibility info
    const compatibility = product.vehicleCompatibility || {};
    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const year = compatibility.year || 0;
    const category = compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';
    
    // Calculate commission (in memory - no database query!)
    const commissionRate = MoneyUtils.getCommissionRate(category);
    const commission = MoneyUtils.calculateCommission(sellerPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(sellerPrice, commission);

    return {
      id: product.id,
      name: product.name,
      make: make,
      model: model,
      year: year,
      category: category,
      subcategory: subcategory,
      displayPrice,
      currency: currency,
      inStock: quantity > 0,
      sellerCount: 1, // This is a single seller listing
      lowestPrice: sellerPrice,
      commission
    };
  }

  /**
   * Calculate pricing in memory (NO DATABASE QUERIES!) - Legacy method
   */
  private calculateFastPricing(product: any): FastProductResult {
    const offers = product.sellerInventory || [];
    
    if (offers.length === 0) {
      return {
        id: product.id,
        name: product.name,
        make: product.make,
        model: product.model,
        year: product.year,
        category: product.category,
        subcategory: product.subcategory,
        displayPrice: 0,
        currency: 'USD',
        inStock: false,
        sellerCount: 0,
        lowestPrice: 0,
        commission: 0
      };
    }

    // Find lowest price
    const prices = offers.map(offer => offer.sellerPrice);
    const lowestPrice = Math.min(...prices);
    
    // Calculate commission (in memory - no database query!)
    const commissionRate = MoneyUtils.getCommissionRate(product.category);
    const commission = MoneyUtils.calculateCommission(lowestPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(lowestPrice, commission);

    return {
      id: product.id,
      name: product.name,
      make: product.make,
      model: product.model,
      year: product.year,
      category: product.category,
      subcategory: product.subcategory,
      displayPrice,
      currency: 'USD',
      inStock: true,
      sellerCount: offers.length,
      lowestPrice,
      commission
    };
  }


  /**
   * Apply filters in memory
   */
  private applyFilters(results: FastProductResult[], criteria: any): FastProductResult[] {
    let filtered = results;

    if (criteria.minPrice) {
      filtered = filtered.filter(r => r.displayPrice >= criteria.minPrice);
    }
    if (criteria.maxPrice) {
      filtered = filtered.filter(r => r.displayPrice <= criteria.maxPrice);
    }
    if (criteria.inStock) {
      filtered = filtered.filter(r => r.inStock);
    }

    return filtered;
  }

  /**
   * VIN Decode - Find products compatible with a specific vehicle
   */
  async decodeVin(vin: string): Promise<{ success: boolean; data?: FastProductResult[]; error?: string }> {
    try {
      // For now, we'll do a basic search since we don't have a VIN decoding service
      // In a real implementation, you'd call an external VIN decoding API
      console.log(`🔍 VIN Decode requested for: ${vin}`);
      
      // Basic search for any products (since we don't have VIN decoding yet)
      const searchCriteria = {
        q: vin, // Use VIN as search term
        page: 1,
        limit: 20
      };

      const result = await this.fastSearch(searchCriteria);
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        return {
          success: false,
          error: 'VIN decode search failed'
        };
      }

    } catch (error) {
      console.error('VIN decode error:', error);
      return {
        success: false,
        error: 'VIN decode failed'
      };
    }
  }

  /**
   * Save a search for a buyer
   */
  async saveSearch(buyerId: string, searchData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // For now, return a simple success response
      // In a real implementation, you'd save this to the database
      return {
        success: true,
        data: { id: 'saved-search-' + Date.now(), ...searchData }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save search'
      };
    }
  }

  /**
   * Get saved searches for a buyer
   */
  async getSavedSearches(buyerId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // For now, return empty array
      // In a real implementation, you'd fetch from database
      return {
        success: true,
        data: []
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get saved searches'
      };
    }
  }

  /**
   * Calculate display price for a product
   */
  async calculateDisplayPrice(productId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Search for the product and return pricing info
      const result = await this.fastSearch({ q: productId, page: 1, limit: 1 });
      
      if (result.success && result.data && result.data.length > 0) {
        const product = result.data[0];
        return {
          success: true,
          data: {
            productId,
            displayPrice: product.displayPrice,
            currency: product.currency,
            commission: product.commission
          }
        };
      } else {
        return {
          success: false,
          error: 'Product not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to calculate price'
      };
    }
  }

  /**
   * Get product by ID from seller listings
   */
  async getProductById(productId: string): Promise<{ success: boolean; data?: FastProductResult; error?: string }> {
    try {
      // First try to find by seller inventory ID
      let sellerListing = await prisma.sellerInventory.findFirst({
        where: {
          id: productId,
          quantity: { gt: 0 },
          isActive: true,
          seller: {
            isEligible: true,
            sriScore: { gte: 70 }
          }
        },
        include: {
          masterProduct: {
            select: {
              id: true,
              name: true,
              oemPartNumber: true,
              manufacturer: true,
              description: true,
              vehicleCompatibility: true,
              imageUrls: true
            }
          },
          seller: {
            select: {
              id: true,
              businessName: true,
              sriScore: true,
              isEligible: true
            }
          }
        }
      });

      // If not found by inventory ID, try by master product ID
      if (!sellerListing) {
        sellerListing = await prisma.sellerInventory.findFirst({
          where: {
            masterProductId: productId,
            quantity: { gt: 0 },
            isActive: true,
            seller: {
              isEligible: true,
              sriScore: { gte: 70 }
            }
          },
          include: {
            masterProduct: {
              select: {
                id: true,
                name: true,
                oemPartNumber: true,
                manufacturer: true,
                description: true,
                vehicleCompatibility: true,
                imageUrls: true
              }
            },
            seller: {
              select: {
                id: true,
                businessName: true,
                sriScore: true,
                isEligible: true
              }
            }
          }
        });
      }

      if (!sellerListing) {
        return {
          success: false,
          error: 'Product not found in seller listings'
        };
      }

      // Calculate pricing and format result
      const result = this.calculateFastPricingFromListing(sellerListing);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Get product by ID error:', error);
      return {
        success: false,
        error: 'Failed to get product'
      };
    }
  }
}
