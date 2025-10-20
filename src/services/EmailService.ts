// @ts-nocheck
import { SendMailClient } from "zeptomail";
import { logger } from "../utils/logger";

// ZeptoMail Configuration (using same credentials as NVCCZ)
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";

const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export class EmailService {
  private fromAddress = "noreply@lysp.io";
  private fromName = "Simbi Market";

  /**
   * Send email using ZeptoMail
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const emailPayload = {
        from: {
          address: this.fromAddress,
          name: this.fromName,
        },
        to: [
          {
            email_address: {
              address: options.to,
              name: options.toName || options.to,
            },
          },
        ],
        subject: options.subject,
        htmlbody: options.htmlBody,
        textbody: options.textBody || this.stripHtml(options.htmlBody),
      };

      const response = await zeptoClient.sendMail(emailPayload);

      logger.info("Email sent successfully", {
        to: options.to,
        subject: options.subject,
        response,
      });

      return true;
    } catch (error: any) {
      logger.error("Failed to send email", {
        to: options.to,
        subject: options.subject,
        error: error.message,
        details: error.response?.data || error,
      });

      return false;
    }
  }

  /**
   * Send staff credentials email
   */
  async sendStaffCredentials(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    sellerBusinessName: string
  ): Promise<boolean> {
    const subject = `Your Simbi Market Staff Account - ${sellerBusinessName}`;

    const htmlBody = this.getStaffCredentialsHtmlTemplate(
      firstName,
      lastName,
      email,
      password,
      sellerBusinessName
    );

    const textBody = this.getStaffCredentialsTextTemplate(
      firstName,
      lastName,
      email,
      password,
      sellerBusinessName
    );

    return await this.sendEmail({
      to: email,
      toName: `${firstName} ${lastName}`,
      subject,
      htmlBody,
      textBody,
    });
  }

  /**
   * HTML template for staff credentials
   */
  private getStaffCredentialsHtmlTemplate(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    businessName: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Account Created</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #0066cc;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 10px;
    }
    h1 {
      color: #0066cc;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .credentials-box {
      background-color: #f8f9fa;
      border: 2px solid #0066cc;
      border-radius: 6px;
      padding: 20px;
      margin: 25px 0;
    }
    .credential-row {
      margin: 15px 0;
      padding: 10px;
      background-color: #ffffff;
      border-radius: 4px;
    }
    .credential-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .credential-value {
      font-size: 16px;
      color: #000;
      font-family: 'Courier New', monospace;
      word-break: break-all;
    }
    .password-value {
      background-color: #fff3cd;
      padding: 8px;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    .instructions {
      background-color: #e7f3ff;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #0066cc;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Simbi Market</div>
      <p style="margin: 0; color: #666;">Zimbabwe AutoParts Marketplace</p>
    </div>

    <h1>Welcome to the Team, ${firstName}!</h1>
    
    <p>You have been added as a staff member for <strong>${businessName}</strong> on Simbi Market.</p>
    
    <div class="credentials-box">
      <h3 style="margin-top: 0; color: #0066cc;">Your Login Credentials</h3>
      
      <div class="credential-row">
        <div class="credential-label">Email Address</div>
        <div class="credential-value">${email}</div>
      </div>
      
      <div class="credential-row">
        <div class="credential-label">Temporary Password</div>
        <div class="credential-value password-value">${password}</div>
      </div>
      
      <div class="credential-row">
        <div class="credential-label">Business</div>
        <div class="credential-value">${businessName}</div>
      </div>
    </div>

    <div class="warning">
      <strong>⚠️ Important Security Notice:</strong>
      <ul style="margin: 10px 0;">
        <li>This is a <strong>temporary password</strong> generated by the system</li>
        <li>You should change your password immediately after first login</li>
        <li>Do not share your password with anyone</li>
        <li>Keep this email secure or delete it after changing your password</li>
      </ul>
    </div>

    <div class="instructions">
      <strong>📝 Next Steps:</strong>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Visit the Simbi Market seller portal</li>
        <li>Click on "Staff Login"</li>
        <li>Enter your email and the temporary password above</li>
        <li>You will be prompted to change your password</li>
        <li>Set a strong, unique password</li>
      </ol>
    </div>

    <div style="text-align: center;">
      <a href="https://simbi-market.vercel.app/staff/login" class="button">Login to Your Account</a>
    </div>

    <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
      <strong>📱 Need Help?</strong>
      <p style="margin: 10px 0 0 0;">
        If you have any questions or need assistance, please contact your manager or 
        reach out to support at <a href="mailto:support@simbimarket.com">support@simbimarket.com</a>
      </p>
    </div>

    <div class="footer">
      <p><strong>Simbi Market</strong></p>
      <p style="font-size: 12px; color: #999;">
        Zimbabwe AutoParts Marketplace<br>
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Plain text template for staff credentials
   */
  private getStaffCredentialsTextTemplate(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    businessName: string
  ): string {
    return `
SIMBI MARKET - STAFF ACCOUNT CREATED

Welcome to the Team, ${firstName}!

You have been added as a staff member for ${businessName} on Simbi Market.

YOUR LOGIN CREDENTIALS:
=======================
Email Address: ${email}
Temporary Password: ${password}
Business: ${businessName}

⚠️ IMPORTANT SECURITY NOTICE:
- This is a temporary password generated by the system
- You should change your password immediately after first login
- Do not share your password with anyone
- Keep this email secure or delete it after changing your password

NEXT STEPS:
===========
1. Visit the Simbi Market seller portal
2. Click on "Staff Login"
3. Enter your email and the temporary password above
4. You will be prompted to change your password
5. Set a strong, unique password

LOGIN URL: https://simbi-market.vercel.app/staff/login

NEED HELP?
If you have any questions or need assistance, please contact your manager or 
reach out to support at support@simbimarket.com

---
Simbi Market
Zimbabwe AutoParts Marketplace
This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();



