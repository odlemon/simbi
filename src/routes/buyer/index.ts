import { Router } from 'express';
import authRoutes from './auth';
import addressRoutes from './addresses';
import productRoutes from './products';
import orderRoutes from './orders';
import analyticsRoutes from './analytics';
import enterpriseRoutes from './enterprise';
import disputeRoutes from './disputes';
import quoteRoutes from './quotes';
import advancedAnalyticsRoutes from './advanced-analytics';

const router = Router();

// Mount buyer routes
router.use('/auth', authRoutes);
router.use('/addresses', addressRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/enterprise', enterpriseRoutes);
router.use('/disputes', disputeRoutes);
router.use('/quotes', quoteRoutes);
router.use('/analytics', advancedAnalyticsRoutes);

export default router;
