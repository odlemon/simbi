// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../../utils/database';
import { MoneyUtils } from '../../../utils/money';

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
  limit: z.number().default(60),
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
      const validatedCriteria = searchCriteriaSchema.parse(criteria);
      const { page = 1, limit = 30 } = validatedCriteria;
      const offset = (page - 1) * limit;
      const searchTerm = (criteria.q || criteria.search || '').toString().trim();

      // ── Cache check ─────────────────────────────────────────
      const cacheKey = JSON.stringify({ ...validatedCriteria, q: searchTerm });
      const cached = marketplaceCache.get(cacheKey);
      if (cached) {
        console.log(`[Marketplace] CACHE HIT ${Date.now() - startTime}ms | page ${page}`);
        return cached;
      }

      // ── Build filter conditions ─────────────────────────────
      const { inStockConditions, inStockParams, mpWhereSQL, mpParams, categoryValues, brandValues, subcategoryValues } = this.buildFilterConditions(criteria, searchTerm);
      
      // Debug logging for search and filters
      if (searchTerm.length > 0 || criteria.make || criteria.model || criteria.category || criteria.categories || criteria.year || criteria.yearFrom || criteria.yearTo) {
        console.log(`[Marketplace] Search: "${searchTerm}" | Make: ${criteria.make || 'none'} | Model: ${criteria.model || 'none'} | Category: ${criteria.category || criteria.categories || 'none'} | Year: ${criteria.year || criteria.yearFrom ? `${criteria.yearFrom || ''}-${criteria.yearTo || ''}` : criteria.year || 'none'}`);
      }
      
      // IMPORTANT: When searching, ignore inStock filter to show all matching products
      // Users expect to see all products when searching, not just in-stock ones
      const shouldShowAllProducts = searchTerm.length > 0;
      const effectiveInStockFilter = shouldShowAllProducts ? undefined : criteria.inStock;

      // ── Build sort clauses ──────────────────────────────────
      const sortValue = ((criteria.sortBy || criteria.sort || 'featured') as string).toLowerCase();
      let inStockOrderBy = 'ranked.sellerPrice ASC';
      let outOfStockOrderBy = 'mp.name ASC';
      switch (sortValue) {
        case 'price-asc': case 'price_low': case 'price_low_to_high':
          inStockOrderBy = 'ranked.sellerPrice ASC'; break;
        case 'price-desc': case 'price_high': case 'price_high_to_low':
          inStockOrderBy = 'ranked.sellerPrice DESC'; break;
        case 'name-asc': case 'name': case 'name_a_to_z':
          inStockOrderBy = 'ranked.mpName ASC'; outOfStockOrderBy = 'mp.name ASC'; break;
        case 'name-desc': case 'name_z_to_a':
          inStockOrderBy = 'ranked.mpName DESC'; outOfStockOrderBy = 'mp.name DESC'; break;
        case 'newest':
          inStockOrderBy = 'ranked.mpName ASC'; outOfStockOrderBy = 'mp.createdAt DESC'; break;
        default:
          inStockOrderBy = 'ranked.sellerPrice ASC'; break;
      }

      // ── SQL: In-stock products (cheapest per master product) ──
      // IMPORTANT: We ALWAYS page in SQL (LIMIT/OFFSET). We never "only search the first 30".
      const inStockWhereSQL = inStockConditions.join(' AND ');

      const inStockCountSQL = `
        SELECT COUNT(DISTINCT mp.id) as total
        FROM seller_inventory si
        INNER JOIN master_products mp ON si.masterProductId = mp.id
        INNER JOIN sellers s ON si.sellerId = s.id
        LEFT JOIN product_categories pc ON mp.categoryId = pc.id
        WHERE ${inStockWhereSQL}
      `;

      const inStockPageSQL = `
        SELECT 
          ranked.masterProductId, ranked.mpName, ranked.oemPartNumber, ranked.manufacturer,
          ranked.description, ranked.vehicleCompatibility, ranked.imageUrls,
          ranked.categoryName,
          ranked.inventoryId, ranked.sellerPrice, ranked.currency, ranked.quantity,
          ranked.sellerSku, ranked.averageRating, ranked.reviewCount,
          ranked.sellerId, ranked.sellerName
        FROM (
          SELECT 
            mp.id as masterProductId, mp.name as mpName, mp.oemPartNumber, mp.manufacturer,
            mp.description, mp.vehicleCompatibility, mp.imageUrls,
            pc.name as categoryName,
            si.id as inventoryId, si.sellerPrice, si.currency, si.quantity,
            si.sellerSku,
            COALESCE(si.averageRating, 0) as averageRating,
            COALESCE(si.reviewCount, 0) as reviewCount,
            s.id as sellerId, s.businessName as sellerName,
            ROW_NUMBER() OVER (PARTITION BY mp.id ORDER BY si.sellerPrice ASC) as rn
          FROM seller_inventory si
          INNER JOIN master_products mp ON si.masterProductId = mp.id
          INNER JOIN sellers s ON si.sellerId = s.id
          LEFT JOIN product_categories pc ON mp.categoryId = pc.id
          WHERE ${inStockWhereSQL}
        ) ranked
        WHERE ranked.rn = 1
        ORDER BY ${inStockOrderBy}
        LIMIT ? OFFSET ?
      `;

      // ── SQL: Out-of-stock master products (paged) ──
      // NOTE: For this endpoint, "out-of-stock" means "no eligible active inventory with qty>0".
      const outOfStockPageSQL = `
        SELECT 
          mp.id as masterProductId, mp.name as mpName, mp.oemPartNumber, mp.manufacturer,
          mp.description, mp.vehicleCompatibility, mp.imageUrls,
          pc.name as categoryName
        FROM master_products mp
        LEFT JOIN seller_inventory si 
          ON si.masterProductId = mp.id AND si.isActive = 1
        LEFT JOIN sellers s 
          ON si.sellerId = s.id AND s.isEligible = 1 AND s.sriScore >= 70
        LEFT JOIN product_categories pc ON mp.categoryId = pc.id
        WHERE mp.isActive = 1
          AND (si.id IS NULL OR s.id IS NULL)
          ${mpWhereSQL}
        ORDER BY ${outOfStockOrderBy}
        LIMIT ? OFFSET ?
      `;

      // ── SQL: Total count (check 5-minute cache first) ──
      const countCacheKey = `count:${mpWhereSQL}:${JSON.stringify(mpParams)}`;
      const cachedCount = countCache.get(countCacheKey);

      // ══════════════════════════════════════════════════════════
      // FIRE INITIAL QUERIES IN PARALLEL
      // We need:
      //  - in-stock COUNT (to know where the out-of-stock zone starts)
      //  - total COUNT (cached)
      //  - in-stock PAGE slice (cheap, 30 rows)
      // ══════════════════════════════════════════════════════════
      const totalCountPromise = (cachedCount !== null)
        ? Promise.resolve([{ total: cachedCount }])
        : prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as total
            FROM master_products mp
            LEFT JOIN product_categories pc ON mp.categoryId = pc.id
            WHERE mp.isActive = 1 ${mpWhereSQL}
          `, ...mpParams);

      const [inStockCountRows, totalCountRows, inStockPageRows] = await Promise.all([
        prisma.$queryRawUnsafe(inStockCountSQL, ...inStockParams),
        totalCountPromise,
        prisma.$queryRawUnsafe(inStockPageSQL, ...inStockParams, limit, offset),
      ]) as [any[], any[], any[]];

      const inStockCount = Number((inStockCountRows as any[])[0]?.total ?? 0);
      const totalCount = Number((totalCountRows as any[])[0]?.total ?? 0);

      // Cache the count for 5 minutes
      if (cachedCount === null) {
        countCache.set(countCacheKey, totalCount);
      }

      // ══════════════════════════════════════════════════════════
      // ASSEMBLE PAGE — zero additional DB calls
      // ══════════════════════════════════════════════════════════

      // If user explicitly wants only in-stock (but NOT when searching - search shows all)
      if (effectiveInStockFilter === true) {
        const data = (inStockPageRows as any[]).map((row: any) => this.transformRawRow(row, true));

        const duration = Date.now() - startTime;
        console.log(`[Marketplace] ${duration}ms | inStock=true | ${data.length} results | ${inStockCount} total | search: "${searchTerm}"`);

        const result = {
          success: true,
          data,
          pagination: { page, limit, total: inStockCount, totalPages: Math.ceil(inStockCount / limit), hasNext: page * limit < inStockCount, hasPrev: page > 1 }
        };
        marketplaceCache.set(cacheKey, result);
        return result;
      }

      // Merge: in-stock first, then fill with out-of-stock
      let resultData: FastProductResult[] = [];

      if (offset < inStockCount) {
        // Page starts within in-stock zone
        const inStockSlice = (inStockPageRows as any[]);
        resultData.push(...inStockSlice.map((row: any) => this.transformRawRow(row, true)));

        const remaining = limit - inStockSlice.length;
        if (remaining > 0) {
          // Fill from out-of-stock zone starting at 0
          const oosRows = await prisma.$queryRawUnsafe(outOfStockPageSQL, ...mpParams, remaining, 0);
          resultData.push(...(oosRows as any[]).map((row: any) => this.transformRawRow(row, false)));
        }
      } else {
        // Page is entirely in out-of-stock zone
        const outOfStockOffset = offset - inStockCount;
        const oosRows = await prisma.$queryRawUnsafe(outOfStockPageSQL, ...mpParams, limit, outOfStockOffset);
        resultData = (oosRows as any[]).map((row: any) => this.transformRawRow(row, false));
      }

      const duration = Date.now() - startTime;
      console.log(`[Marketplace] ${duration}ms | ${resultData.length} results | ${inStockCount} in-stock | ${totalCount} total | page ${page} | search: "${searchTerm}"`);

      const result = {
        success: true,
        data: resultData,
        pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit), hasNext: page * limit < totalCount, hasPrev: page > 1 }
      };
      marketplaceCache.set(cacheKey, result);
      return result;

    } catch (error: any) {
      console.error('[Marketplace] Search error:', error.message);
      return { success: false, error: `Search failed: ${error.message}` };
    }
  }

  /**
   * Build all filter conditions for both in-stock and out-of-stock queries
   */
  private buildFilterConditions(criteria: any, searchTerm: string) {
    // ── Conditions for master_products (used in out-of-stock + count) ──
    const mpConditions: string[] = [];
    const mpParams: any[] = [];

    // ── Conditions for in-stock query (includes inventory filters) ──
    const inStockConditions: string[] = [
      'si.isActive = 1', 'si.quantity > 0', 'mp.isActive = 1',
      's.isEligible = 1', 's.sriScore >= 70',
    ];
    const inStockParams: any[] = [];

    // Price filters (in-stock only)
    if (criteria.minPrice) { inStockConditions.push('si.sellerPrice >= ?'); inStockParams.push(criteria.minPrice); }
    if (criteria.maxPrice) { inStockConditions.push('si.sellerPrice <= ?'); inStockParams.push(criteria.maxPrice); }

    // Text search - simple LIKE search that works
    if (searchTerm.length > 0) {
      const searchPattern = `%${searchTerm}%`;
      
      // Build LIKE conditions for master products
      const mpLikeCondition = `(
        mp.name LIKE ? OR 
        mp.oemPartNumber LIKE ? OR 
        mp.description LIKE ? OR 
        mp.manufacturer LIKE ?
      )`;
      
      // Build LIKE conditions for in-stock (includes SKU)
      const inStockLikeCondition = `(
        mp.name LIKE ? OR 
        mp.oemPartNumber LIKE ? OR 
        mp.description LIKE ? OR 
        mp.manufacturer LIKE ? OR
        si.sellerSku LIKE ?
      )`;
      
      // Add FULLTEXT if words are long enough
      const searchWords = searchTerm.split(/\s+/).filter((t: string) => t.length >= 3);
      if (searchWords.length > 0) {
        const ftTerms = searchWords.map((t: string) => `${t}*`).join(' ');
        // Combine LIKE and FULLTEXT with OR
        mpConditions.push(`(${mpLikeCondition} OR MATCH(mp.name, mp.oemPartNumber, mp.description, mp.manufacturer) AGAINST(? IN BOOLEAN MODE))`);
        mpParams.push(searchPattern, searchPattern, searchPattern, searchPattern, ftTerms);
        
        inStockConditions.push(`(${inStockLikeCondition} OR MATCH(mp.name, mp.oemPartNumber, mp.description, mp.manufacturer) AGAINST(? IN BOOLEAN MODE))`);
        inStockParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, ftTerms);
      } else {
        // Just use LIKE if words are too short for FULLTEXT
        mpConditions.push(mpLikeCondition);
        mpParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        
        inStockConditions.push(inStockLikeCondition);
        inStockParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }

    // Category - flexible matching (case-insensitive, supports partial matches)
    const categoryValues = this.parseCommaSeparated(criteria.categories || criteria.category);
    if (categoryValues.length > 0) {
      // Use LIKE for flexible matching instead of exact IN match
      // This allows "Brake" to match "Brake System", "Brake Pads", etc.
      const categoryClause = categoryValues.map(() => 'pc.name LIKE ?').join(' OR ');
      const categoryParams = categoryValues.map((cat: string) => `%${cat}%`);
      mpConditions.push(`(${categoryClause})`); mpParams.push(...categoryParams);
      inStockConditions.push(`(${categoryClause})`); inStockParams.push(...categoryParams);
    }

    // Brand
    const brandValues = this.parseCommaSeparated(criteria.brands || criteria.brand || criteria.manufacturer);
    if (brandValues.length > 0) {
      const clause = `(${brandValues.map(() => 'mp.manufacturer LIKE ?').join(' OR ')})`;
      const vals = brandValues.map((b: string) => `%${b}%`);
      mpConditions.push(clause); mpParams.push(...vals);
      inStockConditions.push(clause); inStockParams.push(...vals);
    }

    // Vehicle make - case-insensitive, flexible matching
    if (criteria.make) {
      const makeValue = String(criteria.make).trim();
      if (makeValue.length > 0) {
        // Use LOWER() for case-insensitive matching
        const c = `LOWER(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.make'))) LIKE LOWER(?)`;
        mpConditions.push(c); mpParams.push(`%${makeValue}%`);
        inStockConditions.push(c); inStockParams.push(`%${makeValue}%`);
      }
    }
    // Vehicle model - case-insensitive, flexible matching
    if (criteria.model) {
      const modelValue = String(criteria.model).trim();
      if (modelValue.length > 0) {
        // Use LOWER() for case-insensitive matching
        const c = `LOWER(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.model'))) LIKE LOWER(?)`;
        mpConditions.push(c); mpParams.push(`%${modelValue}%`);
        inStockConditions.push(c); inStockParams.push(`%${modelValue}%`);
      }
    }
    // Year filter - handles both single years and year ranges (e.g., "2018" or "2018-2023")
    // Uses LIKE for flexible matching since year can be stored as string, number, or range
    if (criteria.year) {
      const yearValue = String(criteria.year).trim();
      if (yearValue.length > 0) {
        // Simple approach: Check if the year field contains the search year
        // This works for: "2018", "2018-2023", "2018,2019,2020", etc.
        const c = `JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')) LIKE ?`;
        mpConditions.push(c); mpParams.push(`%${yearValue}%`);
        inStockConditions.push(c); inStockParams.push(`%${yearValue}%`);
      }
    }
    if (criteria.yearFrom) {
      const yearFromValue = parseInt(String(criteria.yearFrom));
      if (!isNaN(yearFromValue)) {
        // Extract numeric year from the JSON field and compare
        // Handles both "2018" and "2018-2023" formats
        const c = `(
          CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0') AS UNSIGNED) >= ? OR
          CAST(SUBSTRING_INDEX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0'), '-', 1) AS UNSIGNED) >= ?
        )`;
        mpConditions.push(c); mpParams.push(yearFromValue, yearFromValue);
        inStockConditions.push(c); inStockParams.push(yearFromValue, yearFromValue);
      }
    }
    if (criteria.yearTo) {
      const yearToValue = parseInt(String(criteria.yearTo));
      if (!isNaN(yearToValue)) {
        // Extract numeric year from the JSON field and compare
        // For ranges, check if the start year is <= yearTo
        const c = `(
          CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '9999') AS UNSIGNED) <= ? OR
          CAST(SUBSTRING_INDEX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.year')), '0'), '-', 1) AS UNSIGNED) <= ?
        )`;
        mpConditions.push(c); mpParams.push(yearToValue, yearToValue);
        inStockConditions.push(c); inStockParams.push(yearToValue, yearToValue);
      }
    }

    // Subcategory
    const subcategoryValues = this.parseCommaSeparated(criteria.subcategory);
    if (subcategoryValues.length > 0) {
      const clause = `(${subcategoryValues.map(() => `JSON_UNQUOTE(JSON_EXTRACT(mp.vehicleCompatibility, '$.subcategory')) LIKE ?`).join(' OR ')})`;
      const vals = subcategoryValues.map((s: string) => `%${s}%`);
      mpConditions.push(clause); mpParams.push(...vals);
      inStockConditions.push(clause); inStockParams.push(...vals);
    }

    const mpWhereSQL = mpConditions.length > 0 ? 'AND ' + mpConditions.join(' AND ') : '';

    return { inStockConditions, inStockParams, mpWhereSQL, mpParams, categoryValues, brandValues, subcategoryValues };
  }

  /**
   * Transform a raw SQL row into FastProductResult
   */
  private transformRawRow(row: any, isInStock: boolean): FastProductResult {
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

    // Calculate commission + display price (cheap in-memory math)
    const sellerPrice = Number(row.sellerPrice) || 0;
    const commissionRate = MoneyUtils.getCommissionRate(category);
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
  private calculateFastPricingFromListing(listing: any): FastProductResult {
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

    const commissionRate = MoneyUtils.getCommissionRate(category);
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

      return { success: true, data: this.calculateFastPricingFromListing(sellerListing) };
    } catch (error) {
      console.error('Get product by ID error:', error);
      return { success: false, error: 'Failed to get product' };
    }
  }
}
