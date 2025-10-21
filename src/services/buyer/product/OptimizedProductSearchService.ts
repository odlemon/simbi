// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../../utils/database';

// Optimized search criteria schema
const searchCriteriaSchema = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  engineType: z.string().optional(),
  oemPartNumber: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  page: z.number().default(1),
  limit: z.number().default(20)
});

interface OptimizedProductResult {
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

export class OptimizedProductSearchService {
  
  /**
   * OPTIMIZED: Single query with all pricing calculated in one go
   */
  async advancedSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: OptimizedProductResult[]; error?: string }> {
    try {
      const validatedCriteria = searchCriteriaSchema.parse(criteria);
      const { page = 1, limit = 20 } = validatedCriteria;
      const skip = (page - 1) * limit;

      // Build optimized where clause
      const whereClause = this.buildWhereClause(validatedCriteria);

      // SINGLE OPTIMIZED QUERY - Get products with pricing in one go
      const products = await prisma.masterProduct.findMany({
        where: whereClause,
        include: {
          sellerInventory: {
            where: {
              quantity: { gt: 0 },
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
            },
            select: {
              priceUsd: true,
              currency: true,
              quantity: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      });

      // Calculate pricing efficiently in memory (no more database queries!)
      const results = products.map(product => this.calculateOptimizedPricing(product));

      // Apply price filters in memory
      const filteredResults = this.applyPriceFilters(results, validatedCriteria);

      return {
        success: true,
        data: filteredResults
      };

    } catch (error) {
      console.error('Optimized search error:', error);
      return {
        success: false,
        error: 'Search failed'
      };
    }
  }

  /**
   * Build optimized where clause
   */
  private buildWhereClause(criteria: any): any {
    const whereClause: any = {};

    // Use exact matches where possible (faster than contains)
    if (criteria.make) {
      whereClause.make = { equals: criteria.make, mode: 'insensitive' };
    }
    if (criteria.model) {
      whereClause.model = { equals: criteria.model, mode: 'insensitive' };
    }
    if (criteria.year) {
      whereClause.year = criteria.year;
    }
    if (criteria.category) {
      whereClause.category = { equals: criteria.category, mode: 'insensitive' };
    }

    // Use contains only for search terms
    if (criteria.q) {
      whereClause.OR = [
        { name: { contains: criteria.q, mode: 'insensitive' } },
        { oemPartNumber: { contains: criteria.q, mode: 'insensitive' } },
        { description: { contains: criteria.q, mode: 'insensitive' } }
      ];
    }

    // Year range
    if (criteria.yearFrom || criteria.yearTo) {
      whereClause.year = {};
      if (criteria.yearFrom) whereClause.year.gte = criteria.yearFrom;
      if (criteria.yearTo) whereClause.year.lte = criteria.yearTo;
    }

    return whereClause;
  }

  /**
   * Calculate pricing in memory (NO DATABASE QUERIES!)
   */
  private calculateOptimizedPricing(product: any): OptimizedProductResult {
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
    const prices = offers.map(offer => offer.priceUsd);
    const lowestPrice = Math.min(...prices);
    
    // Calculate commission (in memory - no database query!)
    const commissionRate = this.getCommissionRateInMemory(product.category);
    const commission = lowestPrice * commissionRate;
    const displayPrice = lowestPrice + commission;

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
   * Get commission rate in memory (NO DATABASE QUERY!)
   */
  private getCommissionRateInMemory(category: string): number {
    const commissionRates: { [key: string]: number } = {
      'Engine': 0.08,
      'Transmission': 0.10,
      'Brakes': 0.12,
      'Suspension': 0.10,
      'Electrical': 0.15,
      'Body': 0.12,
      'Interior': 0.15,
      'Exhaust': 0.10,
      'default': 0.10
    };
    
    return commissionRates[category] || commissionRates.default;
  }

  /**
   * Apply price filters in memory
   */
  private applyPriceFilters(results: OptimizedProductResult[], criteria: any): OptimizedProductResult[] {
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
   * Optimized VIN search
   */
  async searchByVIN(vin: string): Promise<{ success: boolean; data?: OptimizedProductResult[]; error?: string }> {
    try {
      // Use VIN decoding cache if available
      const cachedDecode = await prisma.vinDecodeCache.findUnique({
        where: { vin },
        include: {
          masterProduct: {
            include: {
              sellerInventory: {
                where: {
                  quantity: { gt: 0 },
                  seller: { isEligible: true, sriScore: { gte: 70 } }
                },
                select: {
                  priceUsd: true,
                  currency: true,
                  quantity: true,
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                      sriScore: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (cachedDecode?.masterProduct) {
        const result = this.calculateOptimizedPricing(cachedDecode.masterProduct);
        return { success: true, data: [result] };
      }

      // If no cache, return empty (VIN decoding would be external service)
      return { success: true, data: [] };

    } catch (error) {
      console.error('VIN search error:', error);
      return { success: false, error: 'VIN search failed' };
    }
  }
}
