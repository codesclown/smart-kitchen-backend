import Mailgun from 'mailgun.js';
import formData from 'form-data';

// Mailgun configuration
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: process.env.MAILGUN_URL || 'https://api.mailgun.net', // EU: https://api.eu.mailgun.net
});

const DOMAIN = process.env.MAILGUN_DOMAIN || 'your-domain.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Smart Kitchen <noreply@your-domain.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  variables?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  /**
   * Send a basic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        console.warn('Mailgun not configured, skipping email send');
        return false;
      }

      const messageData: any = {
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
      };

      if (options.html) messageData.html = options.html;
      if (options.text) messageData.text = options.text;
      if (options.template) messageData.template = options.template;
      if (options.variables) messageData['h:X-Mailgun-Variables'] = JSON.stringify(options.variables);
      if (options.attachments) messageData.attachment = options.attachments;

      const result = await mg.messages.create(DOMAIN, messageData);
      
      console.log('Email sent successfully:', result.id);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template = this.getWelcomeEmailTemplate(userName);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const template = this.getPasswordResetEmailTemplate(resetUrl);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send email verification email
   */
  static async sendEmailVerificationEmail(userEmail: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const template = this.getEmailVerificationTemplate(verificationUrl);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send low stock alert email
   */
  static async sendLowStockAlert(
    userEmail: string, 
    userName: string, 
    lowStockItems: Array<{ name: string; quantity: number; threshold: number }>
  ): Promise<boolean> {
    const template = this.getLowStockAlertTemplate(userName, lowStockItems);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send expiry alert email
   */
  static async sendExpiryAlert(
    userEmail: string, 
    userName: string, 
    expiringItems: Array<{ name: string; expiryDate: string; daysLeft: number }>
  ): Promise<boolean> {
    const template = this.getExpiryAlertTemplate(userName, expiringItems);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send shopping reminder email
   */
  static async sendShoppingReminder(
    userEmail: string, 
    userName: string, 
    shoppingList: Array<{ name: string; quantity?: number; unit?: string }>
  ): Promise<boolean> {
    const template = this.getShoppingReminderTemplate(userName, shoppingList);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send security alert email
   */
  static async sendSecurityAlert(
    userEmail: string, 
    userName: string, 
    alertType: string, 
    details: string
  ): Promise<boolean> {
    const template = this.getSecurityAlertTemplate(userName, alertType, details);
    
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Email Templates

  private static getWelcomeEmailTemplate(userName: string): EmailTemplate {
    return {
      subject: '🎉 Welcome to Smart Kitchen Manager!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">Welcome, ${userName}! 🎉</h2>
            <p style="margin: 0; opacity: 0.9;">Your smart kitchen management journey starts now!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">🚀 Get Started</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              <li>📦 Add your first inventory items</li>
              <li>🛒 Create shopping lists</li>
              <li>💰 Track your expenses</li>
              <li>⏰ Set up smart reminders</li>
              <li>📊 Monitor your kitchen analytics</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            <p>Need help? Contact us at <a href="mailto:support@your-domain.com" style="color: #10b981;">support@your-domain.com</a></p>
          </div>
        </div>
      `,
      text: `
        Welcome to Smart Kitchen Manager, ${userName}!
        
        Your smart kitchen management journey starts now!
        
        Get Started:
        - Add your first inventory items
        - Create shopping lists
        - Track your expenses
        - Set up smart reminders
        - Monitor your kitchen analytics
        
        Go to Dashboard: ${FRONTEND_URL}/dashboard
        
        Need help? Contact us at support@your-domain.com
      `
    };
  }

  private static getPasswordResetEmailTemplate(resetUrl: string): EmailTemplate {
    return {
      subject: '🔐 Reset Your Smart Kitchen Manager Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #92400e; margin-top: 0;">🔐 Password Reset Request</h2>
            <p style="color: #92400e; margin-bottom: 0;">We received a request to reset your password. Click the button below to create a new password.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="color: #4b5563; margin: 0; font-size: 14px;">
              <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            <p>If the button doesn't work, copy and paste this link: <br><a href="${resetUrl}" style="color: #10b981;">${resetUrl}</a></p>
          </div>
        </div>
      `,
      text: `
        Smart Kitchen Manager - Password Reset Request
        
        We received a request to reset your password. Click the link below to create a new password:
        
        ${resetUrl}
        
        This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
      `
    };
  }

  private static getEmailVerificationTemplate(verificationUrl: string): EmailTemplate {
    return {
      subject: '✅ Verify Your Smart Kitchen Manager Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin-top: 0;">✅ Verify Your Email</h2>
            <p style="color: #1e40af; margin-bottom: 0;">Please verify your email address to complete your account setup and access all features.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            <p>If the button doesn't work, copy and paste this link: <br><a href="${verificationUrl}" style="color: #10b981;">${verificationUrl}</a></p>
          </div>
        </div>
      `,
      text: `
        Smart Kitchen Manager - Email Verification
        
        Please verify your email address to complete your account setup:
        
        ${verificationUrl}
      `
    };
  }

  private static getLowStockAlertTemplate(
    userName: string, 
    lowStockItems: Array<{ name: string; quantity: number; threshold: number }>
  ): EmailTemplate {
    const itemsList = lowStockItems.map(item => 
      `<li>${item.name} - ${item.quantity} remaining (threshold: ${item.threshold})</li>`
    ).join('');

    return {
      subject: '⚠️ Low Stock Alert - Smart Kitchen Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ Low Stock Alert</h2>
            <p style="color: #dc2626; margin-bottom: 0;">Hi ${userName}, some items in your kitchen are running low!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">Items Running Low:</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              ${itemsList}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard/shopping" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Add to Shopping List
            </a>
          </div>
        </div>
      `,
      text: `
        Low Stock Alert - Smart Kitchen Manager
        
        Hi ${userName}, some items in your kitchen are running low!
        
        Items Running Low:
        ${lowStockItems.map(item => `- ${item.name} - ${item.quantity} remaining (threshold: ${item.threshold})`).join('\n')}
        
        Add to Shopping List: ${FRONTEND_URL}/dashboard/shopping
      `
    };
  }

  private static getExpiryAlertTemplate(
    userName: string, 
    expiringItems: Array<{ name: string; expiryDate: string; daysLeft: number }>
  ): EmailTemplate {
    const itemsList = expiringItems.map(item => 
      `<li>${item.name} - expires in ${item.daysLeft} day${item.daysLeft !== 1 ? 's' : ''} (${item.expiryDate})</li>`
    ).join('');

    return {
      subject: '⏰ Items Expiring Soon - Smart Kitchen Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #92400e; margin-top: 0;">⏰ Items Expiring Soon</h2>
            <p style="color: #92400e; margin-bottom: 0;">Hi ${userName}, some items in your kitchen are expiring soon!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">Expiring Items:</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              ${itemsList}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard/inventory" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Inventory
            </a>
          </div>
        </div>
      `,
      text: `
        Items Expiring Soon - Smart Kitchen Manager
        
        Hi ${userName}, some items in your kitchen are expiring soon!
        
        Expiring Items:
        ${expiringItems.map(item => `- ${item.name} - expires in ${item.daysLeft} day${item.daysLeft !== 1 ? 's' : ''} (${item.expiryDate})`).join('\n')}
        
        View Inventory: ${FRONTEND_URL}/dashboard/inventory
      `
    };
  }

  private static getShoppingReminderTemplate(
    userName: string, 
    shoppingList: Array<{ name: string; quantity?: number; unit?: string }>
  ): EmailTemplate {
    const itemsList = shoppingList.map(item => {
      const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '';
      return `<li>${item.name}${quantity ? ` - ${quantity}` : ''}</li>`;
    }).join('');

    return {
      subject: '🛒 Shopping Reminder - Smart Kitchen Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin-top: 0;">🛒 Shopping Reminder</h2>
            <p style="color: #1e40af; margin-bottom: 0;">Hi ${userName}, don't forget about your shopping list!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">Shopping List:</h3>
            <ul style="color: #4b5563; line-height: 1.6;">
              ${itemsList}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard/shopping" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Shopping Lists
            </a>
          </div>
        </div>
      `,
      text: `
        Shopping Reminder - Smart Kitchen Manager
        
        Hi ${userName}, don't forget about your shopping list!
        
        Shopping List:
        ${shoppingList.map(item => {
          const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '';
          return `- ${item.name}${quantity ? ` - ${quantity}` : ''}`;
        }).join('\n')}
        
        View Shopping Lists: ${FRONTEND_URL}/dashboard/shopping
      `
    };
  }

  private static getSecurityAlertTemplate(userName: string, alertType: string, details: string): EmailTemplate {
    return {
      subject: '🔒 Security Alert - Smart Kitchen Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">🍳 Smart Kitchen Manager</h1>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #dc2626; margin-top: 0;">🔒 Security Alert</h2>
            <p style="color: #dc2626; margin-bottom: 0;">Hi ${userName}, we detected ${alertType} on your account.</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">Details:</h3>
            <p style="color: #4b5563; line-height: 1.6;">${details}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard/settings" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Security Settings
            </a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="color: #4b5563; margin: 0; font-size: 14px;">
              <strong>If this wasn't you:</strong> Please change your password immediately and contact support.
            </p>
          </div>
        </div>
      `,
      text: `
        Security Alert - Smart Kitchen Manager
        
        Hi ${userName}, we detected ${alertType} on your account.
        
        Details: ${details}
        
        If this wasn't you, please change your password immediately and contact support.
        
        Review Security Settings: ${FRONTEND_URL}/dashboard/settings
      `
    };
  }
}