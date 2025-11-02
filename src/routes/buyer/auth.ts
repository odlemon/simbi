// @ts-nocheck
import { Router } from 'express';
import BuyerAuthController from '../../controllers/buyer/BuyerAuthController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const authController = new BuyerAuthController();

/**
 * @route POST /api/buyer/auth/register
 * @desc Register a new buyer (Individual or Enterprise)
 * @access Public
 */
router.post('/register', authController.register.bind(authController));

/**
 * @route POST /api/buyer/auth/verify-email
 * @desc Verify email with verification code
 * @access Public
 */
router.post('/verify-email', authController.verifyEmail.bind(authController));

/**
 * @route POST /api/buyer/auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post('/resend-verification', authController.resendVerification.bind(authController));

/**
 * @route POST /api/buyer/auth/login
 * @desc Login buyer
 * @access Public
 */
router.post('/login', authController.login.bind(authController));

/**
 * @route POST /api/buyer/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * @route GET /api/buyer/auth/profile
 * @desc Get buyer profile
 * @access Private
 */
router.get('/profile', authenticateBuyer, authController.getProfile.bind(authController));

/**
 * @route PATCH /api/buyer/auth/profile
 * @desc Update buyer profile
 * @access Private
 */
router.patch('/profile', authenticateBuyer, authController.updateProfile.bind(authController));

/**
 * @route POST /api/buyer/auth/change-password
 * @desc Change buyer password
 * @access Private
 */
router.post('/change-password', authenticateBuyer, authController.changePassword.bind(authController));

/**
 * @route POST /api/buyer/auth/logout
 * @desc Logout buyer (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticateBuyer, authController.logout.bind(authController));

export default router;
