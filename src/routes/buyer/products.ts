// @ts-nocheck
import { Router } from 'express';
import ProductSearchController from '../../controllers/buyer/ProductSearchController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const productController = new ProductSearchController();

/**
 * @route GET /api/buyer/products/marketplace
 * @desc Get all marketplace products (public - no authentication required)
 * @access Public
 */
router.get('/marketplace', (req, res, next) => {
  // Allow browsers & CDNs to cache for 30s, serve stale while revalidating
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  next();
}, productController.getMarketplaceProducts.bind(productController));

/**
 * @route POST /api/buyer/products/vin-decode
 * @desc Decode VIN and get vehicle information
 * @access Private
 */
router.post('/vin-decode', authenticateBuyer, productController.decodeVin.bind(productController));

/**
 * @route POST /api/buyer/products/search-by-vehicle
 * @desc Search products by vehicle information
 * @access Private
 */
router.post('/search-by-vehicle', authenticateBuyer, productController.searchByVehicle.bind(productController));

/**
 * @route GET /api/buyer/products
 * @desc Get all products (with optional filters)
 * @access Private
 */
router.get('/', authenticateBuyer, productController.getAllProducts.bind(productController));

/**
 * @route GET /api/buyer/products/search
 * @desc Search products with query parameters
 * @access Private
 */
router.get('/search', authenticateBuyer, productController.searchProducts.bind(productController));

/**
 * @route POST /api/buyer/products/bulk-search
 * @desc Bulk search by part numbers
 * @access Private
 */
router.post('/bulk-search', authenticateBuyer, productController.bulkSearch.bind(productController));

/**
 * @route GET /api/buyer/products/:id
 * @desc Get product by ID
 * @access Private
 */
router.get('/:id', authenticateBuyer, productController.getProductById.bind(productController));

/**
 * @route GET /api/buyer/products/:id/price
 * @desc Get product price
 * @access Private
 */
router.get('/:id/price', authenticateBuyer, productController.getProductPrice.bind(productController));

/**
 * @route POST /api/buyer/products/saved-searches
 * @desc Save search criteria
 * @access Private
 */
router.post('/saved-searches', authenticateBuyer, productController.saveSearch.bind(productController));

/**
 * @route GET /api/buyer/products/saved-searches
 * @desc Get saved searches for buyer
 * @access Private
 */
router.get('/saved-searches', authenticateBuyer, productController.getSavedSearches.bind(productController));

export default router;
