// src/lib/EmailService.ts
import { ExpiringProduct } from '@/types/Product';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendResetPasswordEmail(to: string, resetCode: string) {
    const subject = 'Password Reset Request';
    const html = this.getResetPasswordHtml(resetCode);
    const text = `Your password reset code is: ${resetCode}. It will expire in 15 minutes.`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
  async sendLowStockAlert(
    to: string,
    productName: string,
    currentQuantity: number,
    threshold: number,
    supplierName?: string
  ) {
    const subject = `⚠️ LOW STOCK ALERT: ${productName}`;
    const html = this.getLowStockAlertHtml(productName, currentQuantity, threshold, supplierName);
    const text = `LOW STOCK ALERT: ${productName} has only ${currentQuantity} units left. Threshold is ${threshold}. Please restock soon!`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Low stock alert sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Error sending low stock alert:', error);
      throw new Error('Failed to send low stock alert');
    }
  }
  // Add this method to your EmailService class

async sendExpiryAlert(
    to: string,
    products: ExpiringProduct[]
) {
    const productCount = products.length;
    const subject = `⚠️ Expiry Alert - ${productCount} Product${productCount > 1 ? 's' : ''} Expiring Soon`;
    
    const html = this.getExpiryAlertHtml(products);
    const text = this.getExpiryAlertText(products);

    const mailOptions = {
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html,
        text,
    };

    try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Expiry alert email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error sending expiry alert:', error);
        throw new Error('Failed to send expiry alert email');
    }
}

// Add this helper method for plain text
private getExpiryAlertText(products:ExpiringProduct[]): string {
    let text = 'The following products are expiring soon:\n\n';
    
    products.forEach((product, index) => {
        const expiryDate = product.expiry_date.toISOString().split('T')[0];
        text += `${index + 1}. ${product.name} - Qty: ${product.quantity} - Expires: ${expiryDate} (in ${product.daysUntilExpiry} day${product.daysUntilExpiry > 1 ? 's' : ''})\n`;
    });
    
    text += '\nPlease take action to reduce spoilage waste.';
    return text;
}

// Add this helper method for HTML
private getExpiryAlertHtml(products: Array<{
    name: string;
    quantity: number;
    expiry_date: Date;
    daysUntilExpiry: number;
}>): string {
    // Build product list items
    let productItems = '';
    products.forEach((product) => {
        const expiryDate = product.expiry_date.toISOString().split('T')[0];
        const urgencyColor = product.daysUntilExpiry <= 3 ? '#dc2626' : '#f59e0b';
        productItems += `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <div>
                    <strong style="color: #1f2937;">${product.name}</strong>
                    <span style="color: #6b7280; margin-left: 10px;">Qty: ${product.quantity}</span>
                </div>
                <div style="color: ${urgencyColor}; font-weight: 500;">
                    Expires: ${expiryDate}
                    <span style="background-color: ${urgencyColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
                        ${product.daysUntilExpiry} day${product.daysUntilExpiry > 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #f9fafb;
                        margin: 0;
                        padding: 40px 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 12px;
                        padding: 40px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border-top: 6px solid #dc2626;
                    }
                    .header {
                        text-align: center;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .header h1 {
                        color: #dc2626;
                        font-size: 24px;
                        margin: 0;
                    }
                    .header .warning-icon {
                        font-size: 48px;
                        display: block;
                        margin-bottom: 10px;
                    }
                    .header .subtitle {
                        color: #6b7280;
                        font-size: 14px;
                        margin-top: 8px;
                    }
                    .content {
                        padding: 30px 0;
                    }
                    .content p {
                        color: #374151;
                        font-size: 16px;
                        line-height: 1.6;
                        margin: 12px 0;
                    }
                    .product-list {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 16px;
                        margin: 20px 0;
                    }
                    .product-list .header-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0 12px 0;
                        border-bottom: 2px solid #e2e8f0;
                        font-weight: 600;
                        color: #475569;
                        font-size: 14px;
                    }
                    .action-box {
                        background-color: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        padding: 16px;
                        margin-top: 20px;
                        text-align: center;
                    }
                    .action-box p {
                        margin: 0;
                        color: #991b1b;
                        font-weight: 500;
                    }
                    .button {
                        display: inline-block;
                        background-color: #dc2626;
                        color: #ffffff;
                        padding: 12px 32px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 12px;
                    }
                    .footer strong {
                        color: #374151;
                    }
                    .summary {
                        background-color: #f1f5f9;
                        border-radius: 6px;
                        padding: 12px 16px;
                        margin: 16px 0;
                        display: flex;
                        justify-content: space-around;
                        text-align: center;
                    }
                    .summary-item {
                        display: flex;
                        flex-direction: column;
                    }
                    .summary-item .label {
                        font-size: 12px;
                        color: #6b7280;
                    }
                    .summary-item .value {
                        font-size: 18px;
                        font-weight: 700;
                        color: #1f2937;
                    }
                    .summary-item .value.danger {
                        color: #dc2626;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <span class="warning-icon">⚠️</span>
                        <h1>Expiry Alert</h1>
                        <p class="subtitle">Products expiring within the next ${products[0]?.daysUntilExpiry || 7} days</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>The following products are expiring soon and require attention:</p>

                        <div class="summary">
                            <div class="summary-item">
                                <span class="label">Total Products</span>
                                <span class="value">${products.length}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Expiring within 3 days</span>
                                <span class="value danger">${products.filter(p => p.daysUntilExpiry <= 3).length}</span>
                            </div>
                        </div>

                        <div class="product-list">
                            <div class="header-row">
                                <span>Product</span>
                                <span>Expiry Date</span>
                            </div>
                            ${productItems}
                        </div>

                        <div class="action-box">
                            <p>⚠️ Please take action to reduce spoilage waste.</p>
                            <p style="font-size: 14px; color: #6b7280; font-weight: normal; margin-top: 8px;">
                                ${products.filter(p => p.daysUntilExpiry <= 3).length} product${products.filter(p => p.daysUntilExpiry <= 3).length > 1 ? 's' : ''} expiring within 3 days
                            </p>
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/inventory" class="button">
                                View Inventory
                            </a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from your <strong>Inventory Management System</strong>.</p>
                        <p>Please do not reply to this email.</p>
                        <p style="margin-top: 8px;">Sent at: ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
        </html>
    `;
}

  // ✅ NEW: Low Stock Alert HTML Template
  private getLowStockAlertHtml(
    productName: string,
    currentQuantity: number,
    threshold: number,
    supplierName?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f9fafb;
              margin: 0;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              border-top: 6px solid #dc2626;
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            .header h1 {
              color: #dc2626;
              font-size: 24px;
              margin: 0;
            }
            .header .warning-icon {
              font-size: 48px;
              display: block;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px 0;
            }
            .content p {
              color: #374151;
              font-size: 16px;
              line-height: 1.6;
              margin: 12px 0;
            }
            .alert-box {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .alert-box .label {
              color: #6b7280;
              font-size: 14px;
              font-weight: 500;
            }
            .alert-box .value {
              color: #111827;
              font-size: 22px;
              font-weight: 700;
            }
            .alert-box .value.danger {
              color: #dc2626;
            }
            .alert-box .row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .alert-box .row:last-child {
              border-bottom: none;
            }
            .action-button {
              display: inline-block;
              background-color: #dc2626;
              color: #ffffff;
              padding: 12px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="warning-icon">⚠️</span>
              <h1>LOW STOCK ALERT</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>The following product has reached its low stock threshold and needs immediate attention:</p>

              <div class="alert-box">
                <div class="row">
                  <span class="label">📦 Product</span>
                  <span class="value">${productName}</span>
                </div>
                ${supplierName ? `
                <div class="row">
                  <span class="label">🏢 Supplier</span>
                  <span class="value">${supplierName}</span>
                </div>
                ` : ''}
                <div class="row">
                  <span class="label">📊 Current Quantity</span>
                  <span class="value danger">${currentQuantity} units</span>
                </div>
                <div class="row">
                  <span class="label">⚡ Threshold</span>
                  <span class="value">${threshold} units</span>
                </div>
                <div class="row" style="margin-top: 12px; border-top: 2px solid #fecaca; padding-top: 12px;">
                  <span class="label">🔴 Status</span>
                  <span class="value danger">⚠️ Below Threshold</span>
                </div>
              </div>

              <p style="margin-top: 20px;">
                <strong>Action Required:</strong> Please restock <strong>${productName}</strong> immediately to avoid stockouts.
              </p>

              <p style="color: #6b7280; font-size: 14px;">
                Current quantity (${currentQuantity}) is below the threshold (${threshold}).
                ${Math.abs(currentQuantity - threshold)} units below threshold.
              </p>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/inventory" class="action-button">
                  View Inventory
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated alert from your Inventory Management System.</p>
              <p>Please restock soon to avoid disruption.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }


  private getResetPasswordHtml(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f9fafb;
              margin: 0;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            .header h1 {
              color: #111827;
              font-size: 24px;
              margin: 0;
            }
            .content {
              padding: 30px 0;
            }
            .code-box {
              background-color: #f3f4f6;
              padding: 16px 24px;
              border-radius: 8px;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: 6px;
              text-align: center;
              margin: 20px 0;
              color: #1f2937;
              font-family: monospace;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .expiry {
              color: #dc2626;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password. Use the code below to complete the process:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in <span class="expiry">15 minutes</span>.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Create a singleton instance
export const emailService = new EmailService();