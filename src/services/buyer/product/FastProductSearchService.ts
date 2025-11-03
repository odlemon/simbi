// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../../utils/database';
import { MoneyUtils } from '../../../utils/money';

// Fast search criteria schema
const searchCriteriaSchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(), // Alternative to 'q'
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  categories: z.union([z.string(), z.array(z.string())]).optional(),
  subcategory: z.union([z.string(), z.array(z.string())]).optional(),
  manufacturer: z.union([z.string(), z.array(z.string())]).optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  brands: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.union([z.boolean(), z.string()]).optional().transform(val => {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return undefined;
  }),
  productType: z.string().optional(),
  sortBy: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  onlyCheapest: z.boolean().optional() // When true, return only cheapest product per master product
});

interface FastProductResult {
  id: string; // Master product ID
  inventoryId: string; // Seller inventory ID (required for adding to cart)
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
  imageUrls: string[];
  oemPartNumber: string;
  manufacturer: string;
  description: string;
  sellerId: string; // Seller ID
  sellerName: string; // Seller business name
  sku?: string; // Seller SKU
}

export class FastProductSearchService {
  
  /**
   * ULTRA-FAST: Single query with all pricing calculated in memory
   */
  async fastSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: FastProductResult[]; pagination?: any; error?: string }> {
    try {
      const validatedCriteria = searchCriteriaSchema.parse(criteria);
      const { page = 1, limit = 20, onlyCheapest = false } = validatedCriteria;
      
      // Build optimized where clause
      const whereClause = this.buildWhereClause(validatedCriteria);

      // If onlyCheapest is true, we need to fetch more listings to ensure we have
      // all products for deduplication, then group and paginate in memory
      const fetchLimit = onlyCheapest ? limit * 50 : limit; // Fetch more when deduplicating
      const skip = onlyCheapest ? 0 : (page - 1) * limit; // Don't skip initially if deduplicating

      // Build inventory where clause
      // SKU search is handled separately since it's in SellerInventory, not MasterProduct
      const searchTerm = criteria.q || criteria.search;
      const inventoryWhereClause: any = {
        isActive: true,
        seller: {
          isEligible: true,
          sriScore: { gte: 70 }
        }
      };

      // Handle stock filter - if inStock is explicitly provided, use it; otherwise default to in-stock only
      if (criteria.inStock !== undefined) {
        if (criteria.inStock === true) {
          inventoryWhereClause.quantity = { gte: 1 }; // inStock=true: stock >= 1
        } else if (criteria.inStock === false) {
          inventoryWhereClause.quantity = { lte: 0 }; // inStock=false: stock <= 0
        }
      } else {
        // Default: only show in-stock items (quantity > 0)
        inventoryWhereClause.quantity = { gt: 0 };
      }

      // If search term exists, combine masterProduct search with SKU search using OR
      // Otherwise, just use masterProduct where clause
      if (searchTerm) {
        inventoryWhereClause.OR = [
          { 
            masterProduct: whereClause 
          },
          { 
            sellerSku: { contains: searchTerm } 
          }
        ];
      } else {
        // No search term, just use masterProduct filters
        inventoryWhereClause.masterProduct = whereClause;
      }

      // SINGLE QUERY - Get seller listings directly (not master products)
      const sellerListings = await prisma.sellerInventory.findMany({
        where: inventoryWhereClause,
        include: {
          masterProduct: {
            select: {
              id: true,
              name: true,
              oemPartNumber: true,
              manufacturer: true,
              description: true,
              vehicleCompatibility: true,
              imageUrls: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
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
        take: fetchLimit,
        orderBy: onlyCheapest 
          ? { sellerPrice: 'asc' } // Order by price ascending to get cheapest first
          : { createdAt: 'desc' }
      });

      // Calculate pricing in memory (NO DATABASE QUERIES!)
      let results = sellerListings.map(listing => this.calculateFastPricingFromListing(listing));

      // Apply filters in memory
      let filteredResults = this.applyFilters(results, validatedCriteria);

      // If onlyCheapest is true, deduplicate by master product ID and keep only cheapest
      if (onlyCheapest) {
        filteredResults = this.deduplicateProducts(filteredResults);
        
        // Apply pagination after deduplication
        const paginatedResults = filteredResults.slice((page - 1) * limit, page * limit);
        
        return {
          success: true,
          data: paginatedResults,
          pagination: {
            page,
            limit,
            total: filteredResults.length,
            totalPages: Math.ceil(filteredResults.length / limit),
            hasNext: page * limit < filteredResults.length,
            hasPrev: page > 1
          }
        };
      }

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

    // Search in name, OEM part number, description, manufacturer (MySQL compatible)
    // Note: SKU search will be handled at the SellerInventory level
    const searchTerm = criteria.q || criteria.search;
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm } },
        { oemPartNumber: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { manufacturer: { contains: searchTerm } },
        { category: { name: { contains: searchTerm } } }
      ];
    }

    // Manufacturer/Brand filters - support single and comma-separated values
    // Multiple brands use OR (any of the brands)
    const brandValues = this.parseCommaSeparated(criteria.brands || criteria.brand || criteria.manufacturer);
    if (brandValues.length > 0) {
      if (brandValues.length === 1) {
        // Single brand - use contains
        whereClause.manufacturer = { contains: brandValues[0] };
      } else {
        // Multiple brands - use OR with contains for each brand
        const brandOrConditions = brandValues.map(brand => ({
          manufacturer: { contains: brand }
        }));
        
        // If we already have an OR clause from search, combine using AND
        if (whereClause.OR && !whereClause.AND) {
          whereClause.AND = [
            { OR: whereClause.OR },
            { OR: brandOrConditions }
          ];
          delete whereClause.OR;
        } else if (whereClause.AND) {
          // Already using AND, add brand OR to it
          whereClause.AND.push({ OR: brandOrConditions });
        } else {
          // No search term, just brand filter
          whereClause.OR = brandOrConditions;
        }
      }
    }

    // Category filters - support single and comma-separated values
    // Multiple categories use OR (any of the categories)
    const categoryValues = this.parseCommaSeparated(criteria.categories || criteria.category);
    if (categoryValues.length > 0) {
      if (categoryValues.length === 1) {
        // Single category - use contains
        whereClause.category = { name: { contains: categoryValues[0] } };
      } else {
        // Multiple categories - use OR with contains for each category
        const categoryOrConditions = categoryValues.map(cat => ({
          category: { name: { contains: cat } }
        }));
        
        // Combine with existing conditions using AND
        if (whereClause.AND) {
          whereClause.AND.push({ OR: categoryOrConditions });
        } else if (whereClause.OR && !whereClause.manufacturer) {
          // We have search OR, combine with category OR using AND
          whereClause.AND = [
            { OR: whereClause.OR },
            { OR: categoryOrConditions }
          ];
          delete whereClause.OR;
        } else if (whereClause.manufacturer || whereClause.OR) {
          // We have brand filter, combine with category OR using AND
          const existingConditions: any[] = [];
          if (whereClause.OR) {
            existingConditions.push({ OR: whereClause.OR });
            delete whereClause.OR;
          }
          if (whereClause.manufacturer) {
            existingConditions.push({ manufacturer: whereClause.manufacturer });
            delete whereClause.manufacturer;
          }
          existingConditions.push({ OR: categoryOrConditions });
          whereClause.AND = existingConditions;
        } else {
          // Standalone category filter
          whereClause.OR = categoryOrConditions;
        }
      }
    }

    // Subcategory filter - support comma-separated values
    const subcategoryValues = this.parseCommaSeparated(criteria.subcategory);
    if (subcategoryValues.length > 0) {
      // Subcategory is stored in vehicleCompatibility JSON, will be filtered in memory
      // We'll handle this in applyFilters method
    }

    // Vehicle compatibility filters will be handled in-memory
    // Note: For now, we'll filter vehicle compatibility in the applyFilters method
    // This avoids complex JSON path queries that might not work with all database setups

    return whereClause;
  }

  /**
   * Parse comma-separated string or array into array of trimmed values
   * Supports both comma-separated strings and arrays
   */
  private parseCommaSeparated(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      // Flatten and process array values
      return value.flatMap(v => 
        String(v).split(',').map(item => item.trim())
      ).filter(v => v.length > 0);
    }
    // Handle comma-separated string
    return String(value).split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  /**
   * Calculate pricing from seller listing (NO DATABASE QUERIES!)
   */
  private calculateFastPricingFromListing(listing: any): FastProductResult {
    const product = listing.masterProduct;
    const sellerPrice = listing.sellerPrice;
    const currency = listing.currency;
    const quantity = listing.quantity;
    const inventoryId = listing.id; // Seller inventory ID
    const seller = listing.seller;
    const sellerSku = listing.sellerSku || '';
    
    // Extract vehicle compatibility info
    const compatibility = product.vehicleCompatibility || {};
    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const year = compatibility.year || 0;
    // Use category from relationship if available, otherwise fallback to compatibility JSON
    const category = product.category?.name || compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';
    
    // Calculate commission (in memory - no database query!)
    const commissionRate = MoneyUtils.getCommissionRate(category);
    const commission = MoneyUtils.calculateCommission(sellerPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(sellerPrice, commission);

    // Handle imageUrls - parse if it's JSON string, otherwise use as-is
    let imageUrlsArray: string[] = [];
    if (product.imageUrls) {
      if (typeof product.imageUrls === 'string') {
        try {
          imageUrlsArray = JSON.parse(product.imageUrls);
        } catch {
          imageUrlsArray = [product.imageUrls];
        }
      } else if (Array.isArray(product.imageUrls)) {
        imageUrlsArray = product.imageUrls;
      } else {
        imageUrlsArray = [];
      }
    }

    return {
      id: product.id, // Master product ID
      inventoryId: inventoryId, // Seller inventory ID - REQUIRED for adding to cart
      name: product.name,
      make: make,
      model: model,
      year: typeof year === 'string' ? parseInt(year) : year,
      category: category,
      subcategory: subcategory,
      displayPrice,
      currency: currency,
      inStock: quantity > 0,
      sellerCount: 1, // This is a single seller listing
      lowestPrice: sellerPrice,
      commission,
      imageUrls: imageUrlsArray,
      oemPartNumber: product.oemPartNumber || '',
      manufacturer: product.manufacturer || '',
      description: product.description || '',
      sellerId: seller.id,
      sellerName: seller.businessName,
      sku: sellerSku // Include SKU for search
    };
  }

  /**
   * Calculate pricing in memory (NO DATABASE QUERIES!) - Legacy method
   */
  private calculateFastPricing(product: any): FastProductResult {
    const offers = product.sellerInventory || [];
    
    if (offers.length === 0) {
      const compatibility = product.vehicleCompatibility || {};
      const make = compatibility.make || 'Unknown';
      const model = compatibility.model || 'Unknown';
      const year = compatibility.year || 0;
      const category = compatibility.category || 'General';
      const subcategory = compatibility.subcategory || 'General';
      
      return {
        id: product.id,
        inventoryId: '', // No inventory available
        name: product.name,
        make: make,
        model: model,
        year: year,
        category: category,
        subcategory: subcategory,
        displayPrice: 0,
        currency: 'USD',
        inStock: false,
        sellerCount: 0,
        lowestPrice: 0,
        commission: 0,
        imageUrls: product.imageUrls || [],
        oemPartNumber: product.oemPartNumber || '',
        manufacturer: product.manufacturer || '',
        description: product.description || '',
        sellerId: '',
        sellerName: ''
      };
    }

    // Find lowest price offer
    const lowestOffer = offers.reduce((lowest: any, offer: any) => {
      return offer.sellerPrice < lowest.sellerPrice ? offer : lowest;
    }, offers[0]);
    
    const lowestPrice = lowestOffer.sellerPrice;
    const compatibility = product.vehicleCompatibility || {};
    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const year = compatibility.year || 0;
    const category = compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';
    
    // Calculate commission (in memory - no database query!)
    const commissionRate = MoneyUtils.getCommissionRate(category);
    const commission = MoneyUtils.calculateCommission(lowestPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(lowestPrice, commission);

    return {
      id: product.id,
      inventoryId: lowestOffer.id || '', // Use the lowest price inventory ID
      name: product.name,
      make: make,
      model: model,
      year: year,
      category: category,
      subcategory: subcategory,
      displayPrice,
      currency: lowestOffer.currency || 'USD',
      inStock: true,
      sellerCount: offers.length,
      lowestPrice,
      commission,
      imageUrls: product.imageUrls || [],
      oemPartNumber: product.oemPartNumber || '',
      manufacturer: product.manufacturer || '',
      description: product.description || '',
      sellerId: lowestOffer.seller?.id || '',
      sellerName: lowestOffer.seller?.businessName || ''
    };
  }


  /**
   * Deduplicate products by master product ID, keeping only the cheapest one
   */
  private deduplicateProducts(results: FastProductResult[]): FastProductResult[] {
    const productMap = new Map<string, FastProductResult>();

    // Group by master product ID and keep only the cheapest
    for (const product of results) {
      const masterProductId = product.id;
      const existing = productMap.get(masterProductId);

      // If no existing product or this one is cheaper, keep this one
      if (!existing || product.displayPrice < existing.displayPrice) {
        productMap.set(masterProductId, product);
      }
    }

    // Return array of deduplicated products (already sorted by price from query)
    return Array.from(productMap.values());
  }

  /**
   * Apply filters in memory
   */
  private applyFilters(results: FastProductResult[], criteria: any): FastProductResult[] {
    let filtered = results;

    // Text search in SKU (handled in-memory since SKU is in SellerInventory)
    const searchTerm = criteria.q || criteria.search;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        // Already filtered at DB level, but also check SKU here
        if (r.sku && r.sku.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Check if it matches other fields (should already be in results, but double-check)
        return r.name.toLowerCase().includes(searchLower) ||
               r.oemPartNumber.toLowerCase().includes(searchLower) ||
               r.manufacturer.toLowerCase().includes(searchLower) ||
               r.description.toLowerCase().includes(searchLower) ||
               r.category.toLowerCase().includes(searchLower);
      });
    }

    // Subcategory filter (stored in vehicleCompatibility JSON)
    const subcategoryValues = this.parseCommaSeparated(criteria.subcategory);
    if (subcategoryValues.length > 0) {
      filtered = filtered.filter(r => {
        const subcategoryLower = r.subcategory.toLowerCase();
        return subcategoryValues.some(val => 
          subcategoryLower.includes(val.toLowerCase())
        );
      });
    }

    // Price range filters
    if (criteria.minPrice) {
      filtered = filtered.filter(r => r.displayPrice >= criteria.minPrice);
    }
    if (criteria.maxPrice) {
      filtered = filtered.filter(r => r.displayPrice <= criteria.maxPrice);
    }
    
    // Stock filter - handled at database level, but also double-check here for consistency
    if (criteria.inStock !== undefined) {
      if (criteria.inStock === true) {
        filtered = filtered.filter(r => r.inStock && r.inStock === true);
      } else if (criteria.inStock === false) {
        filtered = filtered.filter(r => !r.inStock || r.inStock === false);
      }
    }

    // Vehicle compatibility filters (in-memory filtering)
    if (criteria.make) {
      filtered = filtered.filter(r => r.make.toLowerCase().includes(criteria.make.toLowerCase()));
    }
    if (criteria.model) {
      filtered = filtered.filter(r => r.model.toLowerCase().includes(criteria.model.toLowerCase()));
    }
    if (criteria.year) {
      filtered = filtered.filter(r => r.year === criteria.year);
    }
    if (criteria.yearFrom) {
      filtered = filtered.filter(r => r.year >= criteria.yearFrom);
    }
    if (criteria.yearTo) {
      filtered = filtered.filter(r => r.year <= criteria.yearTo);
    }

    // Sorting - support both sortBy and sort parameters
    const sortValue = criteria.sortBy || criteria.sort || 'featured';
    switch (sortValue.toLowerCase()) {
      case 'price-asc':
      case 'price_low':
      case 'price_low_to_high':
        filtered = filtered.sort((a, b) => a.displayPrice - b.displayPrice);
        break;
      case 'price-desc':
      case 'price_high':
      case 'price_high_to_low':
        filtered = filtered.sort((a, b) => b.displayPrice - a.displayPrice);
        break;
      case 'name-asc':
      case 'name':
      case 'name_a_to_z':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
      case 'name_z_to_a':
        filtered = filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        filtered = filtered.sort((a, b) => b.year - a.year);
        break;
      case 'oldest':
        // Note: oldest products by year
        filtered = filtered.sort((a, b) => a.year - b.year);
        break;
      case 'rating-desc':
      case 'popularity':
      case 'popular':
      case 'top':
      case 'featured':
      default:
        // Default sorting by display price (low to high) for featured/popular
        filtered = filtered.sort((a, b) => a.displayPrice - b.displayPrice);
        break;
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

      // Calculate pricing and format result - includes inventoryId
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
