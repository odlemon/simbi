// @ts-nocheck
import { Router } from 'express';
import { PasswordResetController } from '../../controllers/auth/PasswordResetController';
import { unifiedAuthController } from '../../controllers/auth/UnifiedAuthController';
import { unifiedRegistrationController } from '../../controllers/auth/UnifiedRegistrationController';
import { emailService } from '../../services/EmailService';
import { verifyEmailConnection } from '../../config/emailConfig';
import { logger } from '../../utils/logger';

const router = Router();
const controller = new PasswordResetController();

/**
 * @route POST /api/auth/register
 * @desc Unified registration endpoint for buyers and sellers
 * @access Public
 */
router.post('/register', unifiedRegistrationController.register.bind(unifiedRegistrationController));

/**
 * @route POST /api/auth/login
 * @desc Unified login endpoint for all user types (admin, seller, buyer, staff)
 * @access Public
 */
router.post('/login', unifiedAuthController.login.bind(unifiedAuthController));

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

/**
 * @route POST /api/auth/test-email
 * @desc Test email connection and sending (for debugging)
 * @access Public
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Test 1: Verify SMTP connection
    logger.info('Testing email connection...');
    const connectionOk = await verifyEmailConnection();

    if (!connectionOk) {
      return res.status(500).json({
        success: false,
        message: 'Email connection failed',
        connectionTest: false,
      });
    }

    // Test 2: Send test email
    logger.info('Sending test email...', { to: email });
    const emailSent = await emailService.sendEmail({
      to: email,
      subject: 'Test Email - Simbi Market',
      htmlBody: `
        <h1>Test Email</h1>
        <p>This is a test email from Simbi Market.</p>
        <p>If you receive this, the email service is working correctly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      textBody: 'This is a test email from Simbi Market. If you receive this, the email service is working correctly.',
      module: 'platform',
    });

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        connectionTest: true,
        emailSent: true,
        to: email,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Test email failed to send',
        connectionTest: true,
        emailSent: false,
        to: email,
      });
    }
  } catch (error: any) {
    logger.error('Test email error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Test email error',
      error: error.message,
    });
  }
});

export default router;

