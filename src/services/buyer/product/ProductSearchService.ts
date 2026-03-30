// @ts-nocheck
import { MasterProduct, SellerInventory, Seller } from '@prisma/client';
import { z } from 'zod';

import { prisma } from "../../../utils/database";
import { CommercePricingService } from "../../admin/settings/CommercePricingService";



// Validation schemas
const vinDecodeSchema = z.object({
  vin: z.string().min(17).max(17)
});

const searchCriteriaSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  engineType: z.string().optional(),
  oemPartNumber: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  sellerId: z.string().optional()
});

const bulkSearchSchema = z.object({
  partNumbers: z.array(z.string()).min(1).max(1000)
});

const savedSearchSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.any(), // Search criteria object
  isPublic: z.boolean().optional().default(false)
});

export interface VehicleInfo {
  vin: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  transmission: string;
  bodyStyle: string;
  fuelType: string;
  confidence: number;
}

export interface ProductSearchResult {
  id: string;
  oemPartNumber: string;
  make: string;
  model: string;
  year: number;
  category: string;
  subcategory: string;
  description: string;
  compatibility: string[];
  images: string[];
  sellerOffers: SellerOffer[];
  displayPrice: number;
  currency: string;
  inStock: boolean;
  totalStock: number;
}

export interface SellerOffer {
  sellerId: string;
  sellerName: string;
  price: number;
  quantity: number;
  sriScore: number;
  isEligible: boolean;
  condition: string;
  sellerSku: string;
}

export interface BulkSearchResult {
  found: ProductSearchResult[];
  notFound: string[];
  totalFound: number;
  totalNotFound: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description: string;
  criteria: any;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductSearchService {
  private commercePricing = new CommercePricingService();

  /**
   * Decode VIN and get vehicle information
   */
  async decodeVin(vin: string): Promise<{ success: boolean; data?: VehicleInfo; error?: string }> {
    try {
      const validatedVin = vinDecodeSchema.parse({ vin }).vin;

      // Check cache first
      const cached = await prisma.vinDecodeCache.findUnique({
        where: { vin: validatedVin }
      });

      if (cached && cached.expiresAt > new Date()) {
        return {
          success: true,
          data: {
            vin: cached.vin,
            make: cached.make,
            model: cached.model,
            year: cached.year,
            engine: cached.engine || '',
            transmission: cached.transmission || '',
            bodyStyle: cached.bodyStyle || '',
            fuelType: cached.fuelType || '',
            confidence: cached.confidence
          }
        };
      }

      // TODO: Integrate with external VIN decoder API
      // For now, return mock data
      const vehicleInfo: VehicleInfo = {
        vin: validatedVin,
        make: 'Toyota',
        model: 'Hilux',
        year: 2020,
        engine: '2.8L Diesel',
        transmission: 'Manual',
        bodyStyle: 'Double Cab',
        fuelType: 'Diesel',
        confidence: 0.95
      };

      // Cache the result
      await prisma.vinDecodeCache.upsert({
        where: { vin: validatedVin },
        update: {
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          year: vehicleInfo.year,
          engine: vehicleInfo.engine,
          transmission: vehicleInfo.transmission,
          bodyStyle: vehicleInfo.bodyStyle,
          fuelType: vehicleInfo.fuelType,
          confidence: vehicleInfo.confidence,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        create: {
          vin: validatedVin,
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          year: vehicleInfo.year,
          engine: vehicleInfo.engine,
          transmission: vehicleInfo.transmission,
          bodyStyle: vehicleInfo.bodyStyle,
          fuelType: vehicleInfo.fuelType,
          confidence: vehicleInfo.confidence,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return {
        success: true,
        data: vehicleInfo
      };

    } catch (error) {
      console.error('VIN decode error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'VIN decode failed'
      };
    }
  }

  /**
   * Search products by vehicle information
   */
  async searchByVehicle(vehicleInfo: VehicleInfo): Promise<{ success: boolean; data?: ProductSearchResult[]; error?: string }> {
    try {
      const products = await prisma.masterProduct.findMany({
        where: {
          make: { contains: vehicleInfo.make, mode: 'insensitive' },
          model: { contains: vehicleInfo.model, mode: 'insensitive' },
          year: vehicleInfo.year
        },
        include: {
          sellerInventory: {
            where: {
              quantity: { gt: 0 },
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
            },
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true,
                  isEligible: true
                }
              }
            }
          }
        }
      });

      const results = await Promise.all(
        products.map(async (product) => {
          const displayPrice = await this.calculateDisplayPrice(product.id);
          return this.formatProductResult(product, displayPrice);
        })
      );

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('Vehicle search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vehicle search failed'
      };
    }
  }

  /**
   * Advanced product search
   */
  async advancedSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: ProductSearchResult[]; error?: string }> {
    try {
      const validatedCriteria = searchCriteriaSchema.parse(criteria);

      const whereClause: any = {};

      if (validatedCriteria.make) {
        whereClause.make = { contains: validatedCriteria.make, mode: 'insensitive' };
      }
      if (validatedCriteria.model) {
        whereClause.model = { contains: validatedCriteria.model, mode: 'insensitive' };
      }
      if (validatedCriteria.year) {
        whereClause.year = validatedCriteria.year;
      }
      if (validatedCriteria.engineType) {
        whereClause.engineType = { contains: validatedCriteria.engineType, mode: 'insensitive' };
      }
      if (validatedCriteria.oemPartNumber) {
        whereClause.oemPartNumber = { contains: validatedCriteria.oemPartNumber, mode: 'insensitive' };
      }
      if (validatedCriteria.category) {
        whereClause.category = { contains: validatedCriteria.category, mode: 'insensitive' };
      }
      if (validatedCriteria.subcategory) {
        whereClause.subcategory = { contains: validatedCriteria.subcategory, mode: 'insensitive' };
      }

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
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true,
                  isEligible: true
                }
              }
            }
          }
        }
      });

      const results = await Promise.all(
        products.map(async (product) => {
          const displayPrice = await this.calculateDisplayPrice(product.id);
          return this.formatProductResult(product, displayPrice);
        })
      );

      // Apply price filters
      let filteredResults = results;
      if (validatedCriteria.minPrice) {
        filteredResults = filteredResults.filter(r => r.displayPrice >= validatedCriteria.minPrice!);
      }
      if (validatedCriteria.maxPrice) {
        filteredResults = filteredResults.filter(r => r.displayPrice <= validatedCriteria.maxPrice!);
      }
      if (validatedCriteria.inStock) {
        filteredResults = filteredResults.filter(r => r.inStock);
      }

      return {
        success: true,
        data: filteredResults
      };

    } catch (error) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Advanced search failed'
      };
    }
  }

  /**
   * Bulk search by part numbers
   */
  async bulkSearch(partNumbers: string[]): Promise<{ success: boolean; data?: BulkSearchResult; error?: string }> {
    try {
      const validatedData = bulkSearchSchema.parse({ partNumbers });

      const products = await prisma.masterProduct.findMany({
        where: {
          oemPartNumber: { in: validatedData.partNumbers }
        },
        include: {
          sellerInventory: {
            where: {
              quantity: { gt: 0 },
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
            },
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true,
                  isEligible: true
                }
              }
            }
          }
        }
      });

      const foundPartNumbers = new Set(products.map(p => p.oemPartNumber));
      const notFound = validatedData.partNumbers.filter(pn => !foundPartNumbers.has(pn));

      const results = await Promise.all(
        products.map(async (product) => {
          const displayPrice = await this.calculateDisplayPrice(product.id);
          return this.formatProductResult(product, displayPrice);
        })
      );

      return {
        success: true,
        data: {
          found: results,
          notFound,
          totalFound: results.length,
          totalNotFound: notFound.length
        }
      };

    } catch (error) {
      console.error('Bulk search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk search failed'
      };
    }
  }

  /**
   * Calculate display price using dynamic pricing algorithm
   */
  async calculateDisplayPrice(masterProductId: string): Promise<{ displayPrice: number; currency: string; commission: number }> {
    try {
      // Get all eligible seller offers for this product
      const offers = await prisma.sellerInventory.findMany({
        where: {
          masterProductId,
          quantity: { gt: 0 },
          seller: {
            isEligible: true,
            sriScore: { gte: 70 }
          }
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              sriScore: true
            }
          }
        }
      });

      if (offers.length === 0) {
        return { displayPrice: 0, currency: 'USD', commission: 0 };
      }

      // Find the lowest price
      const lowestPrice = Math.min(...offers.map(offer => offer.priceUsd));
      const selectedOffer = offers.find(offer => offer.priceUsd === lowestPrice);

      if (!selectedOffer) {
        return { displayPrice: 0, currency: 'USD', commission: 0 };
      }

      // Calculate commission rate based on category
      const commissionRate = await this.getCommissionRate(selectedOffer.masterProduct.category);
      const commission = lowestPrice * commissionRate;
      const displayPrice = lowestPrice + commission;

      return {
        displayPrice,
        currency: 'USD',
        commission
      };

    } catch (error) {
      console.error('Price calculation error:', error);
      return { displayPrice: 0, currency: 'USD', commission: 0 };
    }
  }

  /**
   * Get commission rate for product category (admin commerce settings)
   */
  private async getCommissionRate(category: string): Promise<number> {
    const snap = await this.commercePricing.getSnapshot();
    return this.commercePricing.getEffectiveCategoryDisplayRate(category, snap);
  }

  /**
   * Format product search result
   */
  private async formatProductResult(product: any, pricing: { displayPrice: number; currency: string; commission: number }): Promise<ProductSearchResult> {
    const sellerOffers: SellerOffer[] = product.sellerInventory.map((inventory: any) => ({
      sellerId: inventory.seller.id,
      sellerName: inventory.seller.businessName,
      price: inventory.priceUsd,
      quantity: inventory.quantity,
      sriScore: inventory.seller.sriScore,
      isEligible: inventory.seller.sriScore >= 70,
      condition: inventory.condition,
      sellerSku: inventory.sellerSku
    }));

    const totalStock = sellerOffers.reduce((sum, offer) => sum + offer.quantity, 0);

    return {
      id: product.id,
      oemPartNumber: product.oemPartNumber,
      make: product.make,
      model: product.model,
      year: product.year,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      compatibility: product.compatibility || [],
      images: product.images || [],
      sellerOffers,
      displayPrice: pricing.displayPrice,
      currency: pricing.currency,
      inStock: totalStock > 0,
      totalStock
    };
  }

  /**
   * Save search criteria
   */
  async saveSearch(buyerId: string, searchData: z.infer<typeof savedSearchSchema>): Promise<{ success: boolean; data?: SavedSearch; error?: string }> {
    try {
      const validatedData = savedSearchSchema.parse(searchData);

      const savedSearch = await prisma.savedSearch.create({
        data: {
          buyerId,
          name: validatedData.name,
          description: validatedData.description,
          criteria: validatedData.criteria,
          isPublic: validatedData.isPublic
        }
      });

      return {
        success: true,
        data: {
          id: savedSearch.id,
          name: savedSearch.name,
          description: savedSearch.description || '',
          criteria: savedSearch.criteria,
          isPublic: savedSearch.isPublic,
          createdAt: savedSearch.createdAt,
          updatedAt: savedSearch.updatedAt
        }
      };

    } catch (error) {
      console.error('Save search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save search failed'
      };
    }
  }

  /**
   * Get saved searches for buyer
   */
  async getSavedSearches(buyerId: string): Promise<{ success: boolean; data?: SavedSearch[]; error?: string }> {
    try {
      const savedSearches = await prisma.savedSearch.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'desc' }
      });

      const results = savedSearches.map(search => ({
        id: search.id,
        name: search.name,
        description: search.description || '',
        criteria: search.criteria,
        isPublic: search.isPublic,
        createdAt: search.createdAt,
        updatedAt: search.updatedAt
      }));

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('Get saved searches error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get saved searches failed'
      };
    }
  }
}

export default ProductSearchService;
