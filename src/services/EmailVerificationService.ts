// @ts-nocheck
import { logger } from "../utils/logger";
import { emailService } from "./EmailService";
import { loginUrl } from "../constants/appUrls";

interface SendVerificationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  userType?: 'buyer' | 'seller';
}

export class EmailVerificationService {
  /**
   * Generate a 6-digit verification code
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get verification email HTML template
   */
  private static getVerificationEmailTemplate(
    firstName: string,
    lastName: string,
    pin: string,
    userType: 'buyer' | 'seller' = 'buyer'
  ): string {
    const displayName = userType === 'buyer' ? 'Simbi Market' : 'Simbi Market Seller';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">${displayName}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email</h2>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for registering with ${displayName}. To complete your registration, please verify your email address using the verification code below:
              </p>
              
              <!-- PIN Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; display: inline-block;">
                      <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${pin}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #ff6b6b; font-size: 14px; line-height: 1.6; margin: 20px 0; text-align: center; font-weight: bold;">
                ⚠️ This code will expire in 15 minutes
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If you didn't create an account with ${displayName}, please ignore this email.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 10px 0;">
                <strong>Security Notice:</strong> Never share this verification code with anyone. Our team will never ask for your verification code.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simbi Market. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Get welcome email HTML template
   */
  private static getWelcomeEmailTemplate(
    firstName: string,
    lastName: string,
    userType: 'buyer' | 'seller' = 'buyer'
  ): string {
    const displayName = userType === 'buyer' ? 'Simbi Market' : 'Simbi Market Seller';
    const features = userType === 'buyer' 
      ? [
          'Browse millions of auto parts',
          'Compare prices from multiple sellers',
          'Track your orders in real-time',
          'Secure payment options',
          'Fast and reliable delivery'
        ]
      : [
          'List unlimited products',
          'Manage inventory easily',
          'Track sales and analytics',
          'Receive payments securely',
          'Access seller dashboard'
        ];
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${displayName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to ${displayName}!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                  <span style="color: #ffffff; font-size: 40px;">✓</span>
                </div>
                <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 24px;">Email Verified!</h2>
                <p style="color: #666666; font-size: 16px; margin: 0;">Your account has been successfully verified</p>
              </div>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Congratulations! Your email has been verified and your ${displayName} account is now active. You can now start using all the features available to you.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
                <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">What you can do:</h3>
                <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  ${features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
              </div>
              
              <div style="text-align: center; margin: 40px 0 20px 0;">
                <a href="${loginUrl()}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Get Started
                </a>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simbi Market. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Send verification email with 6-digit PIN
   */
  static async sendVerificationEmail(
    data: SendVerificationEmailData
  ): Promise<{ pin: string; expiresAt: Date }> {
    try {
      const pin = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

      const htmlContent = this.getVerificationEmailTemplate(
        data.firstName,
        data.lastName,
        pin,
        data.userType || 'buyer'
      );

      await emailService.sendEmail({
        to: data.email,
        toName: `${data.firstName} ${data.lastName}`,
        subject: "Verify Your Email - Simbi Market",
        htmlBody: htmlContent,
        module: data.userType === 'seller' ? 'seller' : 'buyer',
      });

      logger.info("Verification email sent", {
        email: data.email,
        userType: data.userType || 'buyer',
        expiresAt: expiresAt.toISOString()
      });

      return { pin, expiresAt };
    } catch (error: any) {
      logger.error("Failed to send verification email", {
        email: data.email,
        error: error.message
      });
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  /**
   * Send welcome email after verification
   */
  static async sendWelcomeEmail(
    data: SendVerificationEmailData
  ): Promise<boolean> {
    try {
      const htmlContent = this.getWelcomeEmailTemplate(
        data.firstName,
        data.lastName,
        data.userType || 'buyer'
      );

      await emailService.sendEmail({
        to: data.email,
        toName: `${data.firstName} ${data.lastName}`,
        subject: "Welcome to Simbi Market!",
        htmlBody: htmlContent,
        module: data.userType === 'seller' ? 'seller' : 'buyer',
      });

      logger.info("Welcome email sent", {
        email: data.email,
        userType: data.userType || 'buyer'
      });

      return true;
    } catch (error: any) {
      logger.error("Failed to send welcome email", {
        email: data.email,
        error: error.message
      });
      // Don't throw - welcome email is not critical
      return false;
    }
  }
}

export default EmailVerificationService;

