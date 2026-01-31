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
  limit: z.number().default(30),
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
  averageRating?: number; // Average rating (1-5 stars)
  reviewCount?: number; // Total number of reviews
}

export class FastProductSearchService {
  
  /**
   * ULTRA-FAST: Returns all master products with inventory status
   * Merges master products with seller inventory, doesn't duplicate
   */
  async fastSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: FastProductResult[]; pagination?: any; error?: string }> {
    try {
      const validatedCriteria = searchCriteriaSchema.parse(criteria);
      const { page = 1, limit = 20, onlyCheapest = false } = validatedCriteria;
      
      // Build optimized where clause for master products
      const whereClause = this.buildWhereClause(validatedCriteria);
      whereClause.isActive = true; // Only active master products

      // Build inventory where clause
      const searchTerm = criteria.q || criteria.search;
      const inventoryWhereClause: any = {
        isActive: true,
        seller: {
          isEligible: true,
          sriScore: { gte: 70 }
        }
      };
      
      // DEBUG: Log the filters being applied
      console.log(`[Marketplace] Query filters:`, {
        searchTerm: searchTerm || '(none)',
        inStock: criteria.inStock,
        onlyCheapest,
        masterProductFilters: Object.keys(whereClause).length > 1 ? 'Applied' : 'None',
        sellerFilters: 'isEligible=true, sriScore>=70'
      });

      // Handle stock filter for inventory items only
      // Note: Master products will always be included, but marked as inStock: false if not in inventory
      // IMPORTANT: We always fetch master products separately, so the inStock filter only affects inventory items
      if (criteria.inStock !== undefined && criteria.inStock === true) {
        // When inStock=true, only get inventory items that are actually in stock
        // But we'll still fetch master products (which will be marked as inStock: false)
        inventoryWhereClause.quantity = { gte: 1 };
      } else if (criteria.inStock === false) {
        // When inStock=false, only get inventory items that are out of stock
        inventoryWhereClause.quantity = { lte: 0 };
      }
      // If inStock is not specified, get all inventory items (both in stock and out of stock)

      // If search term exists, combine masterProduct search with SKU search using OR
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
        inventoryWhereClause.masterProduct = whereClause;
      }

      // OPTIMIZED APPROACH: Fetch inventory items first, then fetch master products not in inventory
      // This avoids fetching all 3M+ master products at once
      
      // DEBUG: Check how many inventory items exist without master product filters
      const baseInventoryWhereClause: any = {
        isActive: true,
        seller: {
          isEligible: true,
          sriScore: { gte: 70 }
        }
      };
      if (criteria.inStock !== undefined && criteria.inStock === true) {
        baseInventoryWhereClause.quantity = { gte: 1 };
      } else if (criteria.inStock === false) {
        baseInventoryWhereClause.quantity = { lte: 0 };
      }
      const totalInventoryCount = await prisma.sellerInventory.count({
        where: baseInventoryWhereClause
      });
      console.log(`[Marketplace] Total inventory items (before master product filters): ${totalInventoryCount}`);

      // Step 1: Get ALL seller inventory items (these have pricing and stock info)
      // IMPORTANT: Fetch ALL inventory items, not just a limited set
      // We'll deduplicate later if onlyCheapest is true
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
        // Don't limit here - fetch all matching inventory items
        // Order by price if onlyCheapest, otherwise by creation date
        orderBy: onlyCheapest 
          ? { sellerPrice: 'asc' } // Order by price ascending to get cheapest first
          : { createdAt: 'desc' }
      });
      
      console.log(`[Marketplace] Fetched ${sellerListings.length} inventory items from database (after master product filters)`);
      if (totalInventoryCount > sellerListings.length) {
        console.log(`[Marketplace] ⚠️ ${totalInventoryCount - sellerListings.length} inventory items filtered out by master product criteria`);
      }
      
      // Log details of fetched items for debugging
      if (sellerListings.length > 0) {
        console.log(`[Marketplace] Sample inventory items:`, sellerListings.slice(0, 3).map(l => ({
          id: l.id,
          masterProductId: l.masterProductId,
          masterProductName: l.masterProduct?.name,
          quantity: l.quantity,
          sellerId: l.sellerId,
          sellerName: l.seller?.businessName,
          sellerEligible: l.seller?.isEligible,
          sellerSRI: l.seller?.sriScore
        })));
      }

      // Step 2: Create a set of master product IDs that are in inventory
      const inventoryProductIds = new Set<string>();
      sellerListings.forEach(listing => {
        inventoryProductIds.add(listing.masterProductId);
      });

      // Step 3: Fetch master products NOT in inventory in batches
      // We'll fetch enough to fill the page alongside inventory items
      // If we have fewer inventory items than the limit, fetch more master products to fill the gap
      const masterProductBatchSize = 30; // Fetch 30 at a time
      const inventoryCount = sellerListings.length;
      // Calculate how many master products we need: if we have 6 inventory items and limit is 100, fetch 94 more
      const masterProductsNeeded = Math.max(0, limit - inventoryCount);
      const maxMasterProductsToFetch = Math.max(masterProductsNeeded, limit); // At least fetch 'limit' amount
      let masterProducts: any[] = [];
      let skip = 0;
      let hasMore = true;

      // Build where clause for master products NOT in inventory
      const masterProductWhereClause: any = {
        ...whereClause
      };
      
      // Only exclude inventory products if we have any (to avoid fetching all 3M+ products)
      // If no inventory items, we'll fetch master products directly (but limited by maxMasterProductsToFetch)
      if (inventoryProductIds.size > 0) {
        masterProductWhereClause.id = {
          notIn: Array.from(inventoryProductIds)
        };
      }

      // Fetch master products in batches until we have enough or run out
      // Use a timeout to avoid hanging if the query is too slow
      const fetchStartTime = Date.now();
      const maxFetchTime = 5000; // 5 seconds max for fetching master products
      
      while (masterProducts.length < maxMasterProductsToFetch && hasMore) {
        // Check if we've exceeded the time limit
        if (Date.now() - fetchStartTime > maxFetchTime) {
          console.log(`[Marketplace] Master products fetch timeout after ${maxMasterProductsToFetch} products`);
          break;
        }
        
        try {
          const batch = await prisma.masterProduct.findMany({
            where: masterProductWhereClause,
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            },
            skip: skip,
            take: masterProductBatchSize,
            orderBy: { createdAt: 'desc' }
          });

          if (batch.length === 0) {
            hasMore = false;
          } else {
            masterProducts = [...masterProducts, ...batch];
            skip += masterProductBatchSize;
            
            // If we got fewer than batch size, we've reached the end
            if (batch.length < masterProductBatchSize) {
              hasMore = false;
            }
          }
        } catch (error: any) {
          console.error('[Marketplace] Error fetching master products batch:', error.message);
          // If query fails, stop trying to fetch more
          hasMore = false;
          break;
        }
      }
      
      console.log(`[Marketplace] Fetched ${masterProducts.length} master products (needed: ${maxMasterProductsToFetch})`);

      // Process inventory items (these have stock info and pricing)
      const inventoryResults = sellerListings.map(listing => {
        const result = this.calculateFastPricingFromListing(listing);
        result.inStock = listing.quantity > 0; // Mark as in stock if quantity > 0
        return result;
      });

      // Process master products that are NOT in inventory (these are out of stock)
      // These will have inStock: false
      // Note: We already filtered them in the query (id: { notIn: inventoryProductIds })
      const masterProductResults = masterProducts.map(masterProduct => 
        this.calculateFastPricingFromMasterProduct(masterProduct)
      );

      // Debug: Log counts
      const inStockInventoryCount = inventoryResults.filter(r => r.inStock === true).length;
      const outOfStockInventoryCount = inventoryResults.filter(r => r.inStock === false).length;
      console.log(`[Marketplace] Inventory items: ${inventoryResults.length} (${inStockInventoryCount} in-stock, ${outOfStockInventoryCount} out-of-stock), Master products: ${masterProductResults.length}`);

      // IMPORTANT: Separate in-stock and out-of-stock items
      // In-stock inventory items should ALWAYS appear first
      const inStockItems = inventoryResults.filter(r => r.inStock === true);
      const outOfStockInventoryItems = inventoryResults.filter(r => r.inStock === false);
      
      // Combine results with explicit ordering: in-stock items FIRST, then out-of-stock inventory, then master products
      let allResults = [
        ...inStockItems,           // In-stock inventory items (highest priority)
        ...outOfStockInventoryItems, // Out-of-stock inventory items
        ...masterProductResults     // Master products not in inventory (lowest priority)
      ];
      
      console.log(`[Marketplace] Combined results: ${allResults.length} total (${inStockItems.length} in-stock, ${outOfStockInventoryItems.length} out-of-stock inventory, ${masterProductResults.length} master products)`);

      // Apply filters in memory
      let filteredResults = this.applyFilters(allResults, validatedCriteria);

      // Apply inStock filter if specified
      // IMPORTANT: Always include ALL master products (not in inventory)
      // The inStock filter should only affect inventory items
      if (criteria.inStock !== undefined) {
        filteredResults = filteredResults.filter(result => {
          // If it's a master product (no inventoryId or empty inventoryId), always include it
          // Master products are always shown regardless of inStock filter
          if (!result.inventoryId || result.inventoryId === '') {
            return true;
          }
          // For inventory items, filter based on inStock parameter
          return result.inStock === criteria.inStock;
        });
      }

      // CRITICAL: Re-sort to ensure in-stock items are ALWAYS first
      // This must happen AFTER all other sorting/filtering to maintain priority
      filteredResults.sort((a, b) => {
        // In-stock items (inStock: true) ALWAYS come first
        if (a.inStock === true && b.inStock !== true) return -1;
        if (a.inStock !== true && b.inStock === true) return 1;
        // If both have same stock status, maintain their current order (from previous sorting)
        return 0;
      });

      // If onlyCheapest is true, deduplicate by master product ID and keep only cheapest
      // IMPORTANT: Deduplication prioritizes in-stock items
      if (onlyCheapest) {
        const beforeDedupCount = filteredResults.length;
        const beforeDedupInStock = filteredResults.filter(r => r.inStock === true).length;
        
        // Deduplicate, prioritizing in-stock items
        filteredResults = this.deduplicateProducts(filteredResults);
        
        const afterDedupCount = filteredResults.length;
        const afterDedupInStock = filteredResults.filter(r => r.inStock === true).length;
        
        console.log(`[Marketplace] Deduplication: ${beforeDedupCount} -> ${afterDedupCount} (in-stock: ${beforeDedupInStock} -> ${afterDedupInStock})`);
        
        // Re-sort after deduplication to ensure in-stock items are still first
        filteredResults.sort((a, b) => {
          if (a.inStock === true && b.inStock !== true) return -1;
          if (a.inStock !== true && b.inStock === true) return 1;
          return 0;
        });
        
        // Apply pagination after deduplication
        const paginatedResults = filteredResults.slice((page - 1) * limit, page * limit);
        
        console.log(`[Marketplace] After pagination (page ${page}, limit ${limit}): ${paginatedResults.length} items (${paginatedResults.filter(r => r.inStock === true).length} in-stock)`);
        
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

      // Apply pagination
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
      sku: sellerSku, // Include SKU for search
      averageRating: listing.averageRating || 0, // Average rating from reviews
      reviewCount: listing.reviewCount || 0 // Total number of reviews
    };
  }

  /**
   * Calculate pricing from master product (when not in inventory)
   */
  private calculateFastPricingFromMasterProduct(masterProduct: any): FastProductResult {
    const product = masterProduct;
    
    // Extract vehicle compatibility info
    const compatibility = product.vehicleCompatibility || {};
    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const year = compatibility.year || 0;
    // Use category from relationship if available, otherwise fallback to compatibility JSON
    const category = product.category?.name || compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';
    
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
      inventoryId: '', // No inventory available - product is not in stock
      name: product.name,
      make: make,
      model: model,
      year: typeof year === 'string' ? parseInt(year) : year,
      category: category,
      subcategory: subcategory,
      displayPrice: 0, // No price available (not in inventory)
      currency: 'USD',
      inStock: false, // Not in stock - product is not in any seller inventory
      sellerCount: 0, // No sellers have this product
      lowestPrice: 0, // No price available
      commission: 0, // No commission (no price)
      imageUrls: imageUrlsArray,
      oemPartNumber: product.oemPartNumber || '',
      manufacturer: product.manufacturer || '',
      description: product.description || '',
      sellerId: '', // No seller
      sellerName: '', // No seller
      sku: '', // No SKU
      averageRating: 0, // No reviews
      reviewCount: 0 // No reviews
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
   * Deduplicate products by master product ID, keeping only the best one
   * IMPORTANT: Prioritizes in-stock items over out-of-stock items
   */
  private deduplicateProducts(results: FastProductResult[]): FastProductResult[] {
    const productMap = new Map<string, FastProductResult>();

    // Group by master product ID and keep only the best one
    // Priority: 1) In-stock items, 2) Cheapest price
    for (const product of results) {
      const masterProductId = product.id;
      const existing = productMap.get(masterProductId);

      if (!existing) {
        // No existing product, add this one
        productMap.set(masterProductId, product);
      } else {
        // We have an existing product, decide which to keep
        // Priority 1: In-stock items over out-of-stock items
        if (product.inStock === true && existing.inStock !== true) {
          // New product is in-stock, existing is not - keep the new one
          productMap.set(masterProductId, product);
        } else if (product.inStock !== true && existing.inStock === true) {
          // Existing is in-stock, new is not - keep existing (do nothing)
          // Don't replace
        } else {
          // Both have same stock status, keep the cheaper one
          if (product.displayPrice < existing.displayPrice) {
            productMap.set(masterProductId, product);
          }
          // If prices are equal or existing is cheaper, keep existing (do nothing)
        }
      }
    }

    // Return array of deduplicated products
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
    
    // NOTE: inStock filter is handled separately in the main method
    // to ensure master products (not in inventory) are always included
    // DO NOT filter by inStock here - it will remove master products

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
