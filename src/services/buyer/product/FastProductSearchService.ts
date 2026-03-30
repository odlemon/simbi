// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../../utils/database';
import { MoneyUtils } from '../../../utils/money';
import {
  CommercePricingService,
  type CommercePricingSnapshot,
} from '../../admin/settings/CommercePricingService';

// ──────────────────────────────────────────────────────────
// In-memory LRU cache with TTL (no external dependencies)
// ──────────────────────────────────────────────────────────
class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 200, ttlSeconds = 30) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (LRU refresh)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: any): void {
    // Evict oldest if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expires: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton caches
const marketplaceCache = new QueryCache(200, 30);      // Full response cache: 30s TTL
const countCache = new QueryCache(50, 300);             // COUNT cache: 5-minute TTL (rarely changes)

// Fast search criteria schema
const searchCriteriaSchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  // Allow year filters as number or string (e.g. from query params)
  year: z.union([z.number(), z.string()]).optional(),
  yearFrom: z.union([z.number(), z.string()]).optional(),
  yearTo: z.union([z.number(), z.string()]).optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  categories: z.union([z.string(), z.array(z.string())]).optional(),
  subcategory: z.union([z.string(), z.array(z.string())]).optional(),
  manufacturer: z.union([z.string(), z.array(z.string())]).optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  brands: z.union([z.string(), z.array(z.string())]).optional(),
  // Allow price filters as number or string
  minPrice: z.union([z.number(), z.string()]).optional(),
  maxPrice: z.union([z.number(), z.string()]).optional(),
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
  // Page & limit can be number or string; normalize later
  page: z.union([z.number(), z.string()]).default(1),
  limit: z.union([z.number(), z.string()]).default(60),
  onlyCheapest: z.boolean().optional()
});

interface FastProductResult {
  id: string;
  inventoryId: string;
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
  sellerId: string;
  sellerName: string;
  sku?: string;
  averageRating?: number;
  reviewCount?: number;
}

export class FastProductSearchService {
  private commercePricing = new CommercePricingService();

  /**
   * HIGH-PERFORMANCE marketplace search using raw SQL
   * 
   * All 3 queries run in PARALLEL — no sequential waits:
   *   1. In-stock products (from seller_inventory — small table, fast)
   *   2. Out-of-stock products (from master_products with LIMIT — fast with index)
   *   3. Total count (cached for 5 min — usually instant)
   */
  async fastSearch(criteria: z.infer<typeof searchCriteriaSchema>): Promise<{ success: boolean; data?: FastProductResult[]; pagination?: any; error?: string }> {
    try {
      const startTime = Date.now();
      const validatedCriteria: any = searchCriteriaSchema.parse(criteria);

      // Normalize pagination (1-based page, enforce sensible max limit)
      let page = Number(validatedCriteria.page ?? 1);
      if (!Number.isFinite(page) || page < 1) page = 1;
      page = Math.floor(page);

      let limit = Number(validatedCriteria.limit ?? 60);
      if (!Number.isFinite(limit) || limit < 1) limit = 60;
      // Enforce an upper bound to avoid accidental huge pages
      limit = Math.min(100, Math.floor(limit));

      const offset = (page - 1) * limit;
      const searchTerm = (validatedCriteria.q || validatedCriteria.search || '').toString().trim();

      const pricingSnapshot = await this.commercePricing.getSnapshot();

      // ── Cache check ─────────────────────────────────────────
      const cacheKey = JSON.stringify({
        ...validatedCriteria,
        page,
        limit,
        q: searchTerm,
        _pricing: {
          shippingMode: pricingSnapshot.shippingMode,
          shippingFlatRate: pricingSnapshot.shippingFlatRate,
          shippingDynamicPrice: pricingSnapshot.shippingDynamicPrice,
          shippingDynamicDistanceKm: pricingSnapshot.shippingDynamicDistanceKm,
          commissionPercent: pricingSnapshot.commissionPercent,
          useAdvancedProductRules: pricingSnapshot.useAdvancedProductRules,
        },
      });
      const cached = marketplaceCache.get(cacheKey);
      if (cached) {
        console.log(`[Marketplace] CACHE HIT ${Date.now() - startTime}ms | page ${page}`);
        return cached;
      }

      // ── Build filter conditions ─────────────────────────────
      const { mpWhereSQL, mpParams } =
        this.buildFilterConditions(validatedCriteria, searchTerm);
      
      // Debug logging for search and filters
      if (
        searchTerm.length > 0 ||
        validatedCriteria.make ||
        validatedCriteria.model ||
        validatedCriteria.category ||
        validatedCriteria.categories ||
        validatedCriteria.year ||
        validatedCriteria.yearFrom ||
        validatedCriteria.yearTo
      ) {
        console.log(
          `[Marketplace] Search: "${searchTerm}" | Make: ${validatedCriteria.make || 'none'} | Model: ${validatedCriteria.model || 'none'} | Category: ${validatedCriteria.category || validatedCriteria.categories || 'none'} | Year: ${
            validatedCriteria.year || validatedCriteria.yearFrom
              ? `${validatedCriteria.yearFrom || ''}-${validatedCriteria.yearTo || ''}`
              : validatedCriteria.year || 'none'
          }`
        );
      }
      
      // inStock filter: when provided, always respect it
      const effectiveInStockFilter =
        typeof validatedCriteria.inStock === 'boolean' ? validatedCriteria.inStock : undefined;

      // ── Build sort clause ──────────────────────────────────
      const sortValue = ((validatedCriteria.sortBy || validatedCriteria.sort || 'featured') as string).toLowerCase();
      let orderByClause = 'best.sellerPrice IS NULL ASC, best.sellerPrice ASC';
      switch (sortValue) {
        case 'price-asc': case 'price_low': case 'price_low_to_high':
          orderByClause = 'best.sellerPrice IS NULL ASC, best.sellerPrice ASC'; break;
        case 'price-desc': case 'price_high': case 'price_high_to_low':
          orderByClause = 'best.sellerPrice IS NULL ASC, best.sellerPrice DESC'; break;
        case 'name-asc': case 'name': case 'name_a_to_z':
          orderByClause = 'mp.name ASC'; break;
        case 'name-desc': case 'name_z_to_a':
          orderByClause = 'mp.name DESC'; break;
        case 'newest':
          orderByClause = 'mp.createdAt DESC'; break;
        default:
          orderByClause = 'best.sellerPrice IS NULL ASC, best.sellerPrice ASC'; break;
      }

      // ── Build WHERE conditions for the unified query ────────
      // mpConditions apply to the outer master_products; they use mp.* and pc.*
      // Additional conditions that reference best.* (price, stock) are built here
      const outerConditions: string[] = ['mp.isActive = 1'];
      const outerParams: any[] = [];

      // Add all mp-level conditions from buildFilterConditions
      if (mpWhereSQL.length > 0) {
        outerConditions.push(mpWhereSQL.replace(/^AND\s+/i, ''));
        outerParams.push(...mpParams);
      }

      // Price filters reference the best-seller subquery
      if (validatedCriteria.minPrice) {
        const minP = Number(validatedCriteria.minPrice);
        if (Number.isFinite(minP)) { outerConditions.push('best.sellerPrice >= ?'); outerParams.push(minP); }
      }
      if (validatedCriteria.maxPrice) {
        const maxP = Number(validatedCriteria.maxPrice);
        if (Number.isFinite(maxP)) { outerConditions.push('best.sellerPrice <= ?'); outerParams.push(maxP); }
      }

      // inStock filter
      if (effectiveInStockFilter === true) {
        outerConditions.push('best.inventoryId IS NOT NULL AND best.quantity > 0');
      } else if (effectiveInStockFilter === false) {
        outerConditions.push('(best.inventoryId IS NULL OR best.quantity <= 0)');
      }

      const outerWhereSQL = outerConditions.join(' AND ');

      // ── Unified SQL: master_products LEFT JOIN best seller ──
      const countSQL = `
        SELECT COUNT(*) as total
        FROM master_products mp
        LEFT JOIN product_categories pc ON mp.categoryId = pc.id
        LEFT JOIN (
          SELECT
            si.masterProductId,
            si.id as inventoryId,
            si.sellerPrice,
            si.currency,
            si.quantity,
            si.sellerSku,
            COALESCE(si.averageRating, 0) as averageRating,
            COALESCE(si.reviewCount, 0) as reviewCount,
            s.id as sellerId,
            s.businessName as sellerName,
            ROW_NUMBER() OVER (PARTITION BY si.masterProductId ORDER BY si.sellerPrice ASC) as rn
          FROM seller_inventory si
          INNER JOIN sellers s ON si.sellerId = s.id
          WHERE si.isActive = 1 AND s.isEligible = 1 AND s.sriScore >= 70
        ) best ON best.masterProductId = mp.id AND best.rn = 1
        WHERE ${outerWhereSQL}
      `;

      const pageSQL = `
        SELECT
          mp.id as masterProductId,
          mp.name as mpName,
          mp.oemPartNumber,
          mp.manufacturer,
          mp.description,
          mp.vehicleCompatibility,
          mp.imageUrls,
          pc.name as categoryName,
          best.inventoryId,
          best.sellerPrice,
          best.currency,
          best.quantity,
          best.sellerSku,
          best.averageRating,
          best.reviewCount,
          best.sellerId,
          best.sellerName
        FROM master_products mp
        LEFT JOIN product_categories pc ON mp.categoryId = pc.id
        LEFT JOIN (
          SELECT
            si.masterProductId,
            si.id as inventoryId,
            si.sellerPrice,
            si.currency,
            si.quantity,
            si.sellerSku,
            COALESCE(si.averageRating, 0) as averageRating,
            COALESCE(si.reviewCount, 0) as reviewCount,
            s.id as sellerId,
            s.businessName as sellerName,
            ROW_NUMBER() OVER (PARTITION BY si.masterProductId ORDER BY si.sellerPrice ASC) as rn
          FROM seller_inventory si
          INNER JOIN sellers s ON si.sellerId = s.id
          WHERE si.isActive = 1 AND s.isEligible = 1 AND s.sriScore >= 70
        ) best ON best.masterProductId = mp.id AND best.rn = 1
        WHERE ${outerWhereSQL}
        ORDER BY ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      // ── Run COUNT + PAGE in parallel ────────────────────────
      const [countRows, pageRows] = await Promise.all([
        prisma.$queryRawUnsafe(countSQL, ...outerParams),
        prisma.$queryRawUnsafe(pageSQL, ...outerParams, limit, offset),
      ]) as [any[], any[]];

      const totalCount = Number((countRows as any[])[0]?.total ?? 0);

      // ── Transform rows ──────────────────────────────────────
      const resultData: FastProductResult[] = (pageRows as any[]).map((row: any) => {
        const hasInventory = row.inventoryId != null && Number(row.quantity) > 0;
        return this.transformRawRow(row, hasInventory, pricingSnapshot);
      });

      const duration = Date.now() - startTime;
      console.log(`[Marketplace] ${duration}ms | ${resultData.length} results | ${totalCount} total | page ${page} | search: "${searchTerm}"`);

      const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
      const result = {
        success: true,
        data: resultData,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      marketplaceCache.set(cacheKey, result);
      return result;

    } catch (error: any) {
      console.error('[Marketplace] Search error:', error.message);
      return { success: false, error: `Search failed: ${error.message}` };
    }
  }

  /**
   * Build filter conditions that apply to the master_products + category level.
   * Price and stock filters are handled separately in fastSearch since they
   * reference the best-seller subquery alias.
   */
  private buildFilterConditions(criteria: any, searchTerm: string) {
    const mpConditions: string[] = [];
    const mpParams: any[] = [];

    // Text search on mp.* columns
    if (searchTerm.length > 0) {
      const searchPattern = `%${searchTerm}%`;

      const likeCond = `(
        mp.name LIKE ? OR
        mp.oemPartNumber LIKE ? OR
        mp.description LIKE ? OR
        mp.manufacturer LIKE ?
      )`;

      const searchWords = searchTerm.split(/\s+/).filter((t: string) => t.length >= 3);
      if (searchWords.length > 0) {
        const ftTerms = searchWords.map((t: string) => `${t}*`).join(' ');
        mpConditions.push(`(${likeCond} OR MATCH(mp.name, mp.oemPartNumber, mp.description, mp.manufacturer) AGAINST(? IN BOOLEAN MODE))`);
        mpParams.push(searchPattern, searchPattern, searchPattern, searchPattern, ftTerms);
      } else {
        mpConditions.push(likeCond);
        mpParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }

    // Category
    const categoryValues = this.parseCommaSeparated(criteria.categories || criteria.category);
    if (categoryValues.length > 0) {
      const categoryClause = categoryValues.map(() => 'pc.name LIKE ?').join(' OR ');
      const categoryParams = categoryValues.map((cat: string) => `%${cat}%`);
      mpConditions.push(`(${categoryClause})`);
      mpParams.push(...categoryParams);
    }

    // Brand / Manufacturer
    const brandValues = this.parseCommaSeparated(criteria.brands || criteria.brand || criteria.manufacturer);
    if (brandValues.length > 0) {
      const clause = `(${brandValues.map(() => 'mp.manufacturer LIKE ?').join(' OR ')})`;
      const vals = brandValues.map((b: string) => `%${b}%`);
      mpConditions.push(clause);
      mpParams.push(...vals);
    }

    // Vehicle make
    if (criteria.make) {
      const makeValue = String(criteria.make).trim();
      if (makeValue.length > 0) {
        const c = `LOWER(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.make'))) LIKE LOWER(?)`;
        mpConditions.push(c);
        mpParams.push(`%${makeValue}%`);
      }
    }

    // Vehicle model
    if (criteria.model) {
      const modelValue = String(criteria.model).trim();
      if (modelValue.length > 0) {
        const c = `LOWER(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.model'))) LIKE LOWER(?)`;
        mpConditions.push(c);
        mpParams.push(`%${modelValue}%`);
      }
    }

    // Year (single value or range string)
    if (criteria.year) {
      const yearValue = String(criteria.year).trim();
      if (yearValue.length > 0) {
        const c = `JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')) LIKE ?`;
        mpConditions.push(c);
        mpParams.push(`%${yearValue}%`);
      }
    }
    if (criteria.yearFrom) {
      const yearFromValue = parseInt(String(criteria.yearFrom));
      if (!isNaN(yearFromValue)) {
        const c = `(
          CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0') AS UNSIGNED) >= ? OR
          CAST(SUBSTRING_INDEX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0'), '-', 1) AS UNSIGNED) >= ?
        )`;
        mpConditions.push(c);
        mpParams.push(yearFromValue, yearFromValue);
      }
    }
    if (criteria.yearTo) {
      const yearToValue = parseInt(String(criteria.yearTo));
      if (!isNaN(yearToValue)) {
        const c = `(
          CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '9999') AS UNSIGNED) <= ? OR
          CAST(SUBSTRING_INDEX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0'), '-', 1) AS UNSIGNED) <= ?
        )`;
        mpConditions.push(c);
        mpParams.push(yearToValue, yearToValue);
      }
    }

    // Subcategory
    const subcategoryValues = this.parseCommaSeparated(criteria.subcategory);
    if (subcategoryValues.length > 0) {
      const clause = `(${subcategoryValues.map(() => `JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.subcategory')) LIKE ?`).join(' OR ')})`;
      const vals = subcategoryValues.map((s: string) => `%${s}%`);
      mpConditions.push(clause);
      mpParams.push(...vals);
    }

    const mpWhereSQL = mpConditions.length > 0 ? 'AND ' + mpConditions.join(' AND ') : '';

    return { mpWhereSQL, mpParams, categoryValues, brandValues, subcategoryValues };
  }

  /**
   * Transform a raw SQL row into FastProductResult
   */
  private transformRawRow(row: any, isInStock: boolean, pricingSnapshot: CommercePricingSnapshot): FastProductResult {
    // Parse vehicleCompatibility (JSON column)
    let compatibility: any = {};
    if (row.vehicleCompatibility) {
      if (typeof row.vehicleCompatibility === 'string') {
        try { compatibility = JSON.parse(row.vehicleCompatibility); } catch { compatibility = {}; }
      } else {
        compatibility = row.vehicleCompatibility;
      }
    }

    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const rawYear = compatibility.year || 0;
    const year = typeof rawYear === 'string' ? parseInt(rawYear) : rawYear;
    const category = row.categoryName || compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';

    // Parse imageUrls (JSON column)
    let imageUrls: string[] = [];
    if (row.imageUrls) {
      if (typeof row.imageUrls === 'string') {
        try { imageUrls = JSON.parse(row.imageUrls); } catch { imageUrls = [row.imageUrls]; }
      } else if (Array.isArray(row.imageUrls)) {
        imageUrls = row.imageUrls;
      }
    }

    // Calculate commission + display price (admin commerce settings + optional category tiers)
    const sellerPrice = Number(row.sellerPrice) || 0;
    const commissionRate = this.commercePricing.getEffectiveCategoryDisplayRate(category, pricingSnapshot);
    const commission = MoneyUtils.calculateCommission(sellerPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(sellerPrice, commission);

    return {
      id: row.masterProductId,
      inventoryId: row.inventoryId || '',
      name: row.mpName || '',
      make,
      model,
      year,
      category,
      subcategory,
      displayPrice: isInStock ? displayPrice : 0,
      currency: row.currency || 'USD',
      inStock: isInStock,
      sellerCount: isInStock ? 1 : 0,
      lowestPrice: isInStock ? sellerPrice : 0,
      commission: isInStock ? commission : 0,
      imageUrls,
      oemPartNumber: row.oemPartNumber || '',
      manufacturer: row.manufacturer || '',
      description: row.description || '',
      sellerId: row.sellerId || '',
      sellerName: row.sellerName || '',
      sku: row.sellerSku || '',
      averageRating: Number(row.averageRating) || 0,
      reviewCount: Number(row.reviewCount) || 0,
    };
  }

  /**
   * Parse comma-separated string or array into array of trimmed values
   */
  private parseCommaSeparated(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap(v => String(v).split(',').map(item => item.trim())).filter(v => v.length > 0);
    }
    return String(value).split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  // ──────────────────────────────────────────────────────────
  // Methods below are used by other endpoints (getProductById, etc.)
  // ──────────────────────────────────────────────────────────

  /**
   * Calculate pricing from seller listing (used by getProductById)
   */
  private calculateFastPricingFromListing(listing: any, pricingSnapshot: CommercePricingSnapshot): FastProductResult {
    const product = listing.masterProduct;
    const sellerPrice = listing.sellerPrice;
    const currency = listing.currency;
    const quantity = listing.quantity;
    const inventoryId = listing.id;
    const seller = listing.seller;
    const sellerSku = listing.sellerSku || '';

    const compatibility = product.vehicleCompatibility || {};
    const make = compatibility.make || 'Unknown';
    const model = compatibility.model || 'Unknown';
    const year = compatibility.year || 0;
    const category = product.category?.name || compatibility.category || 'General';
    const subcategory = compatibility.subcategory || 'General';

    const commissionRate = this.commercePricing.getEffectiveCategoryDisplayRate(category, pricingSnapshot);
    const commission = MoneyUtils.calculateCommission(sellerPrice, commissionRate);
    const displayPrice = MoneyUtils.calculateDisplayPrice(sellerPrice, commission);

    let imageUrlsArray: string[] = [];
    if (product.imageUrls) {
      if (typeof product.imageUrls === 'string') {
        try { imageUrlsArray = JSON.parse(product.imageUrls); } catch { imageUrlsArray = [product.imageUrls]; }
      } else if (Array.isArray(product.imageUrls)) {
        imageUrlsArray = product.imageUrls;
      }
    }

    return {
      id: product.id,
      inventoryId,
      name: product.name,
      make,
      model,
      year: typeof year === 'string' ? parseInt(year) : year,
      category,
      subcategory,
      displayPrice,
      currency,
      inStock: quantity > 0,
      sellerCount: 1,
      lowestPrice: sellerPrice,
      commission,
      imageUrls: imageUrlsArray,
      oemPartNumber: product.oemPartNumber || '',
      manufacturer: product.manufacturer || '',
      description: product.description || '',
      sellerId: seller.id,
      sellerName: seller.businessName,
      sku: sellerSku,
      averageRating: listing.averageRating || 0,
      reviewCount: listing.reviewCount || 0,
    };
  }

  /**
   * VIN Decode
   */
  async decodeVin(vin: string): Promise<{ success: boolean; data?: FastProductResult[]; error?: string }> {
    try {
      const result = await this.fastSearch({ q: vin, page: 1, limit: 20 });
      return result.success ? { success: true, data: result.data || [] } : { success: false, error: 'VIN decode search failed' };
    } catch (error) {
      console.error('VIN decode error:', error);
      return { success: false, error: 'VIN decode failed' };
    }
  }

  /**
   * Save a search for a buyer
   */
  async saveSearch(buyerId: string, searchData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      return { success: true, data: { id: 'saved-search-' + Date.now(), ...searchData } };
    } catch (error) {
      return { success: false, error: 'Failed to save search' };
    }
  }

  /**
   * Get saved searches for a buyer
   */
  async getSavedSearches(buyerId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: 'Failed to get saved searches' };
    }
  }

  /**
   * Calculate display price for a product
   */
  async calculateDisplayPrice(productId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.fastSearch({ q: productId, page: 1, limit: 1 });
      if (result.success && result.data && result.data.length > 0) {
        const product = result.data[0];
        return {
          success: true,
          data: { productId, displayPrice: product.displayPrice, currency: product.currency, commission: product.commission }
        };
      }
      return { success: false, error: 'Product not found' };
    } catch (error) {
      return { success: false, error: 'Failed to calculate price' };
    }
  }

  /**
   * Get product by ID from seller listings
   */
  async getProductById(productId: string): Promise<{ success: boolean; data?: FastProductResult; error?: string }> {
    try {
      let sellerListing = await prisma.sellerInventory.findFirst({
        where: {
          id: productId,
          quantity: { gt: 0 },
          isActive: true,
          seller: { isEligible: true, sriScore: { gte: 70 } }
        },
        include: {
          masterProduct: {
            select: {
              id: true, name: true, oemPartNumber: true, manufacturer: true,
              description: true, vehicleCompatibility: true, imageUrls: true,
              category: { select: { name: true } }
            }
          },
          seller: {
            select: { id: true, businessName: true, sriScore: true, isEligible: true }
          }
        }
      });

      if (!sellerListing) {
        sellerListing = await prisma.sellerInventory.findFirst({
          where: {
            masterProductId: productId,
            quantity: { gt: 0 },
            isActive: true,
            seller: { isEligible: true, sriScore: { gte: 70 } }
          },
          include: {
            masterProduct: {
              select: {
                id: true, name: true, oemPartNumber: true, manufacturer: true,
                description: true, vehicleCompatibility: true, imageUrls: true,
                category: { select: { name: true } }
              }
            },
            seller: {
              select: { id: true, businessName: true, sriScore: true, isEligible: true }
            }
          }
        });
      }

      if (!sellerListing) {
        return { success: false, error: 'Product not found in seller listings' };
      }

      const pricingSnapshot = await this.commercePricing.getSnapshot();
      return { success: true, data: this.calculateFastPricingFromListing(sellerListing, pricingSnapshot) };
    } catch (error) {
      console.error('Get product by ID error:', error);
      return { success: false, error: 'Failed to get product' };
    }
  }
}
