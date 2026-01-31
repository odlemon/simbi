// @ts-nocheck
import { logger } from "../../utils/logger";
import puppeteer from 'puppeteer';

export interface ReceiptData {
  orderNumber: string;
  orderDate: Date;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  items: Array<{
    productName: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  shippingCost: number;
  platformCommission: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryDate?: Date;
  shippingAddress?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

export class ReceiptService {
  /**
   * Generate receipt as HTML
   */
  generateReceiptHTML(data: ReceiptData): string {
    const formatCurrency = (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
          <strong>${item.productName}</strong>
          ${item.partNumber ? `<br><small style="color: #666;">Part #: ${item.partNumber}</small>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(item.unitPrice, data.currency)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;"><strong>${formatCurrency(item.lineTotal, data.currency)}</strong></td>
      </tr>
    `
      )
      .join('');

    const shippingAddressHtml = data.shippingAddress
      ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #333; font-size: 16px;">Shipping Address:</h3>
      <p style="margin: 5px 0; color: #666;">
        ${data.shippingAddress.fullName}<br>
        ${data.shippingAddress.addressLine1}<br>
        ${data.shippingAddress.addressLine2 ? `${data.shippingAddress.addressLine2}<br>` : ''}
        ${data.shippingAddress.city}, ${data.shippingAddress.province} ${data.shippingAddress.postalCode}
      </p>
    </div>
  `
      : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${data.orderNumber}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
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
      border-bottom: 3px solid #0066cc;
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
    .receipt-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    .info-section {
      flex: 1;
      min-width: 200px;
      margin-bottom: 20px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #000;
      font-size: 16px;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    th:last-child {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .total-row.final {
      font-size: 20px;
      font-weight: bold;
      color: #0066cc;
      padding-top: 15px;
      border-top: 2px solid #0066cc;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-delivered {
      background-color: #28a745;
      color: white;
    }
    .status-paid {
      background-color: #0066cc;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗 Simbi Market</div>
      <p style="margin: 0; color: #666;">Zimbabwe AutoParts Marketplace</p>
      <h1>Order Receipt</h1>
    </div>

    <div class="receipt-info">
      <div class="info-section">
        <div class="info-label">Order Number</div>
        <div class="info-value"><strong>${data.orderNumber}</strong></div>
      </div>
      <div class="info-section">
        <div class="info-label">Order Date</div>
        <div class="info-value">${formatDate(data.orderDate)}</div>
      </div>
      ${data.deliveryDate ? `
      <div class="info-section">
        <div class="info-label">Delivery Date</div>
        <div class="info-value">${formatDate(data.deliveryDate)}</div>
      </div>
      ` : ''}
    </div>

    <div class="receipt-info">
      <div class="info-section">
        <div class="info-label">Buyer</div>
        <div class="info-value">${data.buyerName}</div>
        <div style="color: #666; font-size: 14px; margin-top: 5px;">${data.buyerEmail}</div>
      </div>
      <div class="info-section">
        <div class="info-label">Seller</div>
        <div class="info-value">${data.sellerName}</div>
      </div>
    </div>

    ${shippingAddressHtml}

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(data.subtotal, data.currency)}</span>
      </div>
      ${data.discountAmount && data.discountAmount > 0 ? `
      <div class="total-row" style="color: #28a745;">
        <span>Discount:</span>
        <span>-${formatCurrency(data.discountAmount, data.currency)}</span>
      </div>
      ` : ''}
      <div class="total-row">
        <span>Shipping:</span>
        <span>${formatCurrency(data.shippingCost, data.currency)}</span>
      </div>
      <div class="total-row">
        <span>Platform Commission:</span>
        <span>${formatCurrency(data.platformCommission, data.currency)}</span>
      </div>
      <div class="total-row final">
        <span>Total Amount:</span>
        <span>${formatCurrency(data.totalAmount, data.currency)}</span>
      </div>
    </div>

    ${data.paymentMethod ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
      <div class="info-label">Payment Information</div>
      <div style="margin-top: 10px;">
        <span><strong>Method:</strong> ${data.paymentMethod}</span>
        ${data.paymentStatus ? `<span style="margin-left: 20px;"><strong>Status:</strong> <span class="status-badge status-paid">${data.paymentStatus}</span></span>` : ''}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p><strong>Simbi Market</strong></p>
      <p style="font-size: 11px; color: #999;">
        Zimbabwe AutoParts Marketplace<br>
        This is an official receipt for your order. Please keep this for your records.<br>
        For support, contact us at support@simbimarket.com
      </p>
      <p style="margin-top: 15px; font-size: 10px; color: #999;">
        Receipt generated on ${formatDate(new Date())}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate receipt as plain text (for email fallback)
   */
  generateReceiptText(data: ReceiptData): string {
    const formatCurrency = (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    let text = `
========================================
SIMBI MARKET - ORDER RECEIPT
========================================

Order Number: ${data.orderNumber}
Order Date: ${formatDate(data.orderDate)}
${data.deliveryDate ? `Delivery Date: ${formatDate(data.deliveryDate)}\n` : ''}

Buyer: ${data.buyerName}
Email: ${data.buyerEmail}
Seller: ${data.sellerName}

${data.shippingAddress ? `
Shipping Address:
${data.shippingAddress.fullName}
${data.shippingAddress.addressLine1}
${data.shippingAddress.addressLine2 ? `${data.shippingAddress.addressLine2}\n` : ''}${data.shippingAddress.city}, ${data.shippingAddress.province} ${data.shippingAddress.postalCode}

` : ''}
ITEMS:
----------------------------------------
`;

    data.items.forEach((item) => {
      text += `${item.productName}${item.partNumber ? ` (Part #: ${item.partNumber})` : ''}\n`;
      text += `  Quantity: ${item.quantity} x ${formatCurrency(item.unitPrice, data.currency)} = ${formatCurrency(item.lineTotal, data.currency)}\n\n`;
    });

    text += `----------------------------------------
Subtotal: ${formatCurrency(data.subtotal, data.currency)}
`;

    if (data.discountAmount && data.discountAmount > 0) {
      text += `Discount: -${formatCurrency(data.discountAmount, data.currency)}\n`;
    }

    text += `Shipping: ${formatCurrency(data.shippingCost, data.currency)}
Platform Commission: ${formatCurrency(data.platformCommission, data.currency)}
----------------------------------------
TOTAL: ${formatCurrency(data.totalAmount, data.currency)}
----------------------------------------

`;

    if (data.paymentMethod) {
      text += `Payment Method: ${data.paymentMethod}\n`;
      if (data.paymentStatus) {
        text += `Payment Status: ${data.paymentStatus}\n`;
      }
      text += `\n`;
    }

    text += `
This is an official receipt for your order. Please keep this for your records.

For support, contact us at support@simbimarket.com

Receipt generated on ${formatDate(new Date())}
========================================
`;

    return text;
  }

  /**
   * Generate receipt as PDF from HTML
   */
  async generateReceiptPDF(data: ReceiptData): Promise<Buffer | null> {
    try {
      const html = this.generateReceiptHTML(data);
      
      // Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some server environments
      });
      
      try {
        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
        });
        
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      logger.error('Failed to generate receipt PDF', {
        orderNumber: data.orderNumber,
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }
}

export const receiptService = new ReceiptService();

