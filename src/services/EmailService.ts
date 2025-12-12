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
   * Send order acceptance email to buyer
   */
  async sendOrderAcceptanceEmail(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    orderId: string,
    sellerBusinessName: string,
    orderTotal: number,
    currency: string = 'USD'
  ): Promise<boolean> {
    const subject = `Order Accepted - ${orderNumber}`;

    const htmlBody = this.getOrderAcceptanceHtmlTemplate(
      buyerName,
      orderNumber,
      sellerBusinessName,
      orderTotal,
      currency
    );

    const textBody = this.getOrderAcceptanceTextTemplate(
      buyerName,
      orderNumber,
      sellerBusinessName,
      orderTotal,
      currency
    );

    return await this.sendEmail({
      to: buyerEmail,
      toName: buyerName,
      subject,
      htmlBody,
      textBody,
    });
  }

  /**
   * HTML template for order acceptance email
   */
  private getOrderAcceptanceHtmlTemplate(
    buyerName: string,
    orderNumber: string,
    sellerBusinessName: string,
    orderTotal: number,
    currency: string
  ): string {
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(orderTotal);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Accepted</title>
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
    .success-badge {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .order-info {
      background-color: #f8f9fa;
      border-left: 4px solid #0066cc;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .info-value {
      color: #000;
      text-align: right;
    }
    .total-amount {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .next-steps {
      background-color: #e7f3ff;
      border-left: 4px solid #0066cc;
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

    <h1>Great News, ${buyerName}!</h1>
    
    <div class="success-badge">
      ✅ Your Order Has Been Accepted
    </div>
    
    <p>We're excited to let you know that <strong>${sellerBusinessName}</strong> has accepted your order and is preparing it for shipment.</p>
    
    <div class="order-info">
      <h3 style="margin-top: 0; color: #0066cc;">Order Details</h3>
      
      <div class="info-row">
        <span class="info-label">Order Number:</span>
        <span class="info-value"><strong>${orderNumber}</strong></span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Seller:</span>
        <span class="info-value">${sellerBusinessName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Order Total:</span>
        <span class="info-value total-amount">${formattedTotal}</span>
      </div>
    </div>

    <div class="next-steps">
      <strong>📦 What Happens Next?</strong>
      <ul style="margin: 10px 0;">
        <li>The seller is now preparing your order for shipment</li>
        <li>You'll receive another email when your order is shipped</li>
        <li>You can track your order status in your account dashboard</li>
        <li>If you have any questions, please contact the seller directly</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="https://simbi-market.vercel.app/buyer/orders" class="button">View Your Orders</a>
    </div>

    <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
      <strong>📱 Need Help?</strong>
      <p style="margin: 10px 0 0 0;">
        If you have any questions about your order, please contact the seller or 
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
   * Plain text template for order acceptance email
   */
  private getOrderAcceptanceTextTemplate(
    buyerName: string,
    orderNumber: string,
    sellerBusinessName: string,
    orderTotal: number,
    currency: string
  ): string {
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(orderTotal);

    return `
SIMBI MARKET - ORDER ACCEPTED

Great News, ${buyerName}!

✅ YOUR ORDER HAS BEEN ACCEPTED

We're excited to let you know that ${sellerBusinessName} has accepted your order and is preparing it for shipment.

ORDER DETAILS:
==============
Order Number: ${orderNumber}
Seller: ${sellerBusinessName}
Order Total: ${formattedTotal}

WHAT HAPPENS NEXT?
==================
- The seller is now preparing your order for shipment
- You'll receive another email when your order is shipped
- You can track your order status in your account dashboard
- If you have any questions, please contact the seller directly

VIEW YOUR ORDERS: https://simbi-market.vercel.app/buyer/orders

NEED HELP?
If you have any questions about your order, please contact the seller or 
reach out to support at support@simbimarket.com

---
Simbi Market
Zimbabwe AutoParts Marketplace
This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Send new order notification email to seller
   */
  async sendNewOrderEmail(
    sellerEmail: string,
    sellerName: string,
    orderNumber: string,
    orderId: string,
    buyerName: string,
    buyerCompany: string | null,
    orderTotal: number,
    itemCount: number,
    currency: string = 'USD'
  ): Promise<boolean> {
    const subject = `New Order Received - ${orderNumber}`;

    const htmlBody = this.getNewOrderHtmlTemplate(
      sellerName,
      orderNumber,
      buyerName,
      buyerCompany,
      orderTotal,
      itemCount,
      currency
    );

    const textBody = this.getNewOrderTextTemplate(
      sellerName,
      orderNumber,
      buyerName,
      buyerCompany,
      orderTotal,
      itemCount,
      currency
    );

    return await this.sendEmail({
      to: sellerEmail,
      toName: sellerName,
      subject,
      htmlBody,
      textBody,
    });
  }

  /**
   * Send low stock alert email to seller
   */
  async sendLowStockAlertEmail(
    sellerEmail: string,
    sellerName: string,
    lowStockItems: Array<{
      productName: string;
      currentQuantity: number;
      lowStockThreshold: number;
      inventoryId: string;
    }>
  ): Promise<boolean> {
    const subject = `Low Stock Alert - ${lowStockItems.length} Product${lowStockItems.length > 1 ? 's' : ''} Running Low`;

    const htmlBody = this.getLowStockAlertHtmlTemplate(
      sellerName,
      lowStockItems
    );

    const textBody = this.getLowStockAlertTextTemplate(
      sellerName,
      lowStockItems
    );

    return await this.sendEmail({
      to: sellerEmail,
      toName: sellerName,
      subject,
      htmlBody,
      textBody,
    });
  }

  /**
   * Send order rejection email to buyer
   */
  async sendOrderRejectionEmail(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    sellerBusinessName: string,
    rejectionReason: string,
    orderTotal: number,
    currency: string = 'USD'
  ): Promise<boolean> {
    const subject = `Order Rejected - ${orderNumber}`;

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(orderTotal);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Rejected</title>
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
      border-bottom: 2px solid #dc3545;
      margin-bottom: 30px;
    }
    h1 {
      color: #dc3545;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .alert-badge {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .order-info {
      background-color: #f8f9fa;
      border-left: 4px solid #dc3545;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .reason-box {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Rejected</h1>
    </div>
    <p>Hello ${buyerName},</p>
    <p>We regret to inform you that your order <strong>${orderNumber}</strong> has been rejected by <strong>${sellerBusinessName}</strong>.</p>
    
    <div class="alert-badge">
      Order Status: REJECTED
    </div>

    <div class="order-info">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Seller:</strong> ${sellerBusinessName}</p>
      <p><strong>Order Total:</strong> ${formattedTotal}</p>
    </div>

    <div class="reason-box">
      <p><strong>Rejection Reason:</strong></p>
      <p>${rejectionReason}</p>
    </div>

    <p>If you have any questions or concerns, please contact our support team or the seller directly.</p>

    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: buyerEmail,
      toName: buyerName,
      subject,
      htmlBody,
    });
  }

  /**
   * Send payment recorded email to buyer
   */
  async sendPaymentRecordedEmail(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    amount: number,
    currency: string = 'USD',
    paymentMethod: string = 'Cash on Delivery'
  ): Promise<boolean> {
    const subject = `Payment Recorded - ${orderNumber}`;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Recorded</title>
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
      border-bottom: 2px solid #28a745;
      margin-bottom: 30px;
    }
    h1 {
      color: #28a745;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .success-badge {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .payment-info {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Recorded</h1>
    </div>
    <p>Hello ${buyerName},</p>
    <p>We have successfully recorded your payment for order <strong>${orderNumber}</strong>.</p>
    
    <div class="success-badge">
      Payment Status: RECORDED
    </div>

    <div class="payment-info">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
    </div>

    <p>Your order is now being processed and will be shipped soon. You will receive another notification when your order ships.</p>

    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: buyerEmail,
      toName: buyerName,
      subject,
      htmlBody,
    });
  }

  /**
   * Send order shipped email to buyer
   */
  async sendOrderShippedEmail(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    trackingNumber: string | null,
    estimatedDeliveryDate: string | null
  ): Promise<boolean> {
    const subject = `Order Shipped - ${orderNumber}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Shipped</title>
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
      border-bottom: 2px solid #17a2b8;
      margin-bottom: 30px;
    }
    h1 {
      color: #17a2b8;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .shipped-badge {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .shipping-info {
      background-color: #f8f9fa;
      border-left: 4px solid #17a2b8;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Order Has Shipped!</h1>
    </div>
    <p>Hello ${buyerName},</p>
    <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped and is on its way to you.</p>
    
    <div class="shipped-badge">
      Order Status: SHIPPED
    </div>

    <div class="shipping-info">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      ${estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${estimatedDeliveryDate}</p>` : ''}
    </div>

    <p>You can track your order status in your account dashboard. We'll notify you once your order is delivered.</p>

    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: buyerEmail,
      toName: buyerName,
      subject,
      htmlBody,
    });
  }

  /**
   * Send order delivered email to buyer
   */
  async sendOrderDeliveredEmail(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    deliveryDate: string
  ): Promise<boolean> {
    const subject = `Order Delivered - ${orderNumber}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered</title>
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
      border-bottom: 2px solid #28a745;
      margin-bottom: 30px;
    }
    h1 {
      color: #28a745;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .delivered-badge {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .delivery-info {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Delivered!</h1>
    </div>
    <p>Hello ${buyerName},</p>
    <p>Your order <strong>${orderNumber}</strong> has been successfully delivered!</p>
    
    <div class="delivered-badge">
      Order Status: DELIVERED
    </div>

    <div class="delivery-info">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Delivery Date:</strong> ${deliveryDate}</p>
    </div>

    <p>We hope you're satisfied with your purchase! If you have any questions or concerns, please don't hesitate to contact us.</p>
    <p>You can now leave a review for the products you received.</p>

    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: buyerEmail,
      toName: buyerName,
      subject,
      htmlBody,
    });
  }

  /**
   * Send payout processed email to seller
   */
  async sendPayoutProcessedEmail(
    sellerEmail: string,
    sellerName: string,
    payoutAmount: number,
    currency: string = 'USD',
    payoutId: string,
    orderCount: number = 1
  ): Promise<boolean> {
    const subject = `Payout Processed - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(payoutAmount)}`;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(payoutAmount);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Processed</title>
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
      border-bottom: 2px solid #28a745;
      margin-bottom: 30px;
    }
    h1 {
      color: #28a745;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .payout-badge {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .payout-info {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #28a745;
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payout Processed</h1>
    </div>
    <p>Hello ${sellerName},</p>
    <p>Your payout has been successfully processed and transferred to your account.</p>
    
    <div class="payout-badge">
      Payout Status: PROCESSED
    </div>

    <div class="amount">
      ${formattedAmount}
    </div>

    <div class="payout-info">
      <p><strong>Payout ID:</strong> ${payoutId}</p>
      <p><strong>Amount:</strong> ${formattedAmount}</p>
      <p><strong>Currency:</strong> ${currency}</p>
      <p><strong>Orders Included:</strong> ${orderCount} order${orderCount > 1 ? 's' : ''}</p>
    </div>

    <p>The funds should appear in your account within 1-3 business days, depending on your bank's processing time.</p>
    <p>You can view detailed payout information in your seller dashboard.</p>

    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: sellerEmail,
      toName: sellerName,
      subject,
      htmlBody,
    });
  }

  /**
   * Send return fault classification notification
   */
  async sendReturnFaultClassificationNotification(
    toEmail: string,
    toName: string,
    orderNumber: string,
    faultClassification: string,
    reason: string
  ): Promise<boolean> {
    const subject = `Return Request Update - Order ${orderNumber}`;
    
    const faultMessages: Record<string, string> = {
      SELLER_FAULT: "The fault has been classified as Seller Fault. The seller will be responsible for return shipping costs.",
      BUYER_FAULT: "The fault has been classified as Buyer Fault. Return shipping costs will be deducted from your refund.",
      NO_FAULT: "The fault has been classified as No Fault. Return shipping costs will be deducted from your refund.",
      LOGISTICS_FAULT: "The fault has been classified as Logistics Fault. The platform will cover return shipping costs.",
    };

    const faultMessage = faultMessages[faultClassification] || "The fault classification has been updated.";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Request Update</title>
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
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
      text-align: center;
    }
    .content {
      margin: 20px 0;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Return Request Update</h1>
    </div>
    <div class="content">
      <p>Hello ${toName},</p>
      <p>Your return request for <strong>Order ${orderNumber}</strong> has been reviewed and a fault classification has been assigned.</p>
      
      <div class="info-box">
        <strong>Fault Classification:</strong> ${faultClassification.replace('_', ' ')}<br>
        <strong>Reason:</strong> ${reason}
      </div>

      <p>${faultMessage}</p>

      <p>Next steps will be communicated to you shortly. You may be required to ship the item back using a provided return label.</p>

      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Simbi Market. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendEmail({
      to: toEmail,
      toName: toName,
      subject,
      htmlBody,
    });
  }

  /**
   * HTML template for new order email
   */
  private getNewOrderHtmlTemplate(
    sellerName: string,
    orderNumber: string,
    buyerName: string,
    buyerCompany: string | null,
    orderTotal: number,
    itemCount: number,
    currency: string
  ): string {
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(orderTotal);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
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
    .alert-badge {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .order-info {
      background-color: #f8f9fa;
      border-left: 4px solid #0066cc;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .info-value {
      color: #000;
      text-align: right;
    }
    .total-amount {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .action-box {
      background-color: #e7f3ff;
      border-left: 4px solid #0066cc;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Simbi Market</div>
      <p style="margin: 0; color: #666;">Zimbabwe AutoParts Marketplace</p>
    </div>

    <h1>New Order Received, ${sellerName}!</h1>
    
    <div class="alert-badge">
      📦 New Order: ${orderNumber}
    </div>
    
    <p>You have received a new order from <strong>${buyerName}${buyerCompany ? ` (${buyerCompany})` : ''}</strong>.</p>
    
    <div class="order-info">
      <h3 style="margin-top: 0; color: #0066cc;">Order Details</h3>
      
      <div class="info-row">
        <span class="info-label">Order Number:</span>
        <span class="info-value"><strong>${orderNumber}</strong></span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Buyer:</span>
        <span class="info-value">${buyerName}${buyerCompany ? ` (${buyerCompany})` : ''}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Items:</span>
        <span class="info-value">${itemCount} item${itemCount > 1 ? 's' : ''}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Order Total:</span>
        <span class="info-value total-amount">${formattedTotal}</span>
      </div>
    </div>

    <div class="action-box">
      <strong>📋 Next Steps:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Review the order details in your seller dashboard</li>
        <li>Accept or reject the order</li>
        <li>Prepare items for shipment once order is accepted</li>
        <li>Record payment when received</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="https://simbi-market.vercel.app/seller/orders" class="button">View Order in Dashboard</a>
    </div>

    <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
      <strong>📱 Need Help?</strong>
      <p style="margin: 10px 0 0 0;">
        If you have any questions about this order, please contact support at 
        <a href="mailto:support@simbimarket.com">support@simbimarket.com</a>
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
   * Plain text template for new order email
   */
  private getNewOrderTextTemplate(
    sellerName: string,
    orderNumber: string,
    buyerName: string,
    buyerCompany: string | null,
    orderTotal: number,
    itemCount: number,
    currency: string
  ): string {
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(orderTotal);

    return `
SIMBI MARKET - NEW ORDER RECEIVED

New Order Received, ${sellerName}!

📦 NEW ORDER: ${orderNumber}

You have received a new order from ${buyerName}${buyerCompany ? ` (${buyerCompany})` : ''}.

ORDER DETAILS:
==============
Order Number: ${orderNumber}
Buyer: ${buyerName}${buyerCompany ? ` (${buyerCompany})` : ''}
Items: ${itemCount} item${itemCount > 1 ? 's' : ''}
Order Total: ${formattedTotal}

NEXT STEPS:
===========
1. Review the order details in your seller dashboard
2. Accept or reject the order
3. Prepare items for shipment once order is accepted
4. Record payment when received

VIEW ORDER: https://simbi-market.vercel.app/seller/orders

NEED HELP?
If you have any questions about this order, please contact support at support@simbimarket.com

---
Simbi Market
Zimbabwe AutoParts Marketplace
This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * HTML template for low stock alert email
   */
  private getLowStockAlertHtmlTemplate(
    sellerName: string,
    lowStockItems: Array<{
      productName: string;
      currentQuantity: number;
      lowStockThreshold: number;
      inventoryId: string;
    }>
  ): string {
    const itemsList = lowStockItems.map(item => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 12px; color: #333;">${item.productName}</td>
        <td style="padding: 12px; text-align: center; color: #d32f2f; font-weight: bold;">${item.currentQuantity}</td>
        <td style="padding: 12px; text-align: center; color: #666;">${item.lowStockThreshold}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Stock Alert</title>
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
      border-bottom: 2px solid #ff9800;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 10px;
    }
    h1 {
      color: #ff9800;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .warning-badge {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background-color: #fff;
    }
    .items-table th {
      background-color: #ff9800;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    .items-table td {
      padding: 12px;
    }
    .action-box {
      background-color: #fff3cd;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #ff9800;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Simbi Market</div>
      <p style="margin: 0; color: #666;">Zimbabwe AutoParts Marketplace</p>
    </div>

    <h1>⚠️ Low Stock Alert, ${sellerName}!</h1>
    
    <div class="warning-badge">
      ${lowStockItems.length} Product${lowStockItems.length > 1 ? 's' : ''} Running Low on Stock
    </div>
    
    <p>The following product${lowStockItems.length > 1 ? 's have' : ' has'} reached your low stock threshold and may need restocking:</p>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Product Name</th>
          <th style="text-align: center;">Current Stock</th>
          <th style="text-align: center;">Threshold</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>

    <div class="action-box">
      <strong>📦 Recommended Actions:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Review your inventory levels</li>
        <li>Consider restocking these items to avoid stockouts</li>
        <li>Update your inventory quantities in your seller dashboard</li>
        <li>Adjust low stock thresholds if needed</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="https://simbi-market.vercel.app/seller/inventory" class="button">Manage Inventory</a>
    </div>

    <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
      <strong>📱 Need Help?</strong>
      <p style="margin: 10px 0 0 0;">
        If you have questions about inventory management, please contact support at 
        <a href="mailto:support@simbimarket.com">support@simbimarket.com</a>
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
   * Plain text template for low stock alert email
   */
  private getLowStockAlertTextTemplate(
    sellerName: string,
    lowStockItems: Array<{
      productName: string;
      currentQuantity: number;
      lowStockThreshold: number;
      inventoryId: string;
    }>
  ): string {
    const itemsList = lowStockItems.map(item => 
      `- ${item.productName}: ${item.currentQuantity} units (Threshold: ${item.lowStockThreshold})`
    ).join('\n');

    return `
SIMBI MARKET - LOW STOCK ALERT

⚠️ LOW STOCK ALERT, ${sellerName}!

${lowStockItems.length} PRODUCT${lowStockItems.length > 1 ? 'S' : ''} RUNNING LOW ON STOCK

The following product${lowStockItems.length > 1 ? 's have' : ' has'} reached your low stock threshold and may need restocking:

${itemsList}

RECOMMENDED ACTIONS:
===================
1. Review your inventory levels
2. Consider restocking these items to avoid stockouts
3. Update your inventory quantities in your seller dashboard
4. Adjust low stock thresholds if needed

MANAGE INVENTORY: https://simbi-market.vercel.app/seller/inventory

NEED HELP?
If you have questions about inventory management, please contact support at support@simbimarket.com

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



