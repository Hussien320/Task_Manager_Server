// src/lib/EmailService.ts
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