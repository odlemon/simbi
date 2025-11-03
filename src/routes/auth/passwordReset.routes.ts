// @ts-nocheck
import { Router } from 'express';
import { PasswordResetController } from '../../controllers/auth/PasswordResetController';

const router = Router();
const controller = new PasswordResetController();

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset (forgot password) - Works for both buyer and seller
 * @access Public
 */
router.post('/forgot-password', controller.forgotPassword.bind(controller));

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token - Works for both buyer and seller
 * @access Public
 */
router.post('/reset-password', controller.resetPassword.bind(controller));

export default router;

