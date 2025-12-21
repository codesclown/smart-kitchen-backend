import { PrismaClient } from '@prisma/client';
import { EmailService } from './email';

export interface NotificationData {
  userId: string;
  type: 'EXPIRY_WARNING' | 'LOW_STOCK' | 'SHOPPING_REMINDER' | 'MEAL_PLAN_REMINDER' | 'TIMER_COMPLETE' | 'WASTE_GOAL_EXCEEDED' | 'NUTRITION_GOAL_ACHIEVED' | 'SYSTEM_UPDATE' | 'GENERAL';
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || {},
          sentAt: new Date(),
        },
      });

      // Get user preferences
      const user = await this.prisma.user.findUnique({
        where: { id: notificationData.userId },
      });

      if (!user) {
        console.error('User not found for notification:', notificationData.userId);
        return false;
      }

      // Check user notification preferences
      const settings = user.settings as any;
      const notificationPrefs = settings?.notifications || {};

      // Send email notification if enabled
      if (notificationPrefs.email !== false && user.email) {
        await this.sendEmailNotification(user.email, notificationData);
      }

      // TODO: Add push notification support
      // if (notificationPrefs.push !== false) {
      //   await this.sendPushNotification(user.id, notificationData);
      // }

      // TODO: Add SMS notification support
      // if (notificationPrefs.sms !== false && user.phone) {
      //   await this.sendSMSNotification(user.phone, notificationData);
      // }

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  private async sendEmailNotification(email: string, data: NotificationData): Promise<void> {
    try {
      const subject = `Smart Kitchen Manager: ${data.title}`;
      const htmlContent = this.generateEmailTemplate(data);

      await EmailService.sendEmail({
        to: email,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private generateEmailTemplate(data: NotificationData): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍳 Smart Kitchen Manager</h1>
            <h2>${data.title}</h2>
          </div>
          <div class="content">
            <p>${data.message}</p>
            ${this.getTypeSpecificContent(data)}
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Open App</a>
          </div>
          <div class="footer">
            <p>Smart Kitchen Manager - Your AI-powered kitchen assistant</p>
            <p>To unsubscribe from these notifications, update your preferences in the app.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  private getTypeSpecificContent(data: NotificationData): string {
    switch (data.type) {
      case 'EXPIRY_WARNING':
        return `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>⚠️ Items Expiring Soon</h3>
            <p>Check your inventory to use these items before they expire.</p>
          </div>
        `;
      
      case 'LOW_STOCK':
        return `
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>📦 Low Stock Alert</h3>
            <p>Some items are running low. Consider adding them to your shopping list.</p>
          </div>
        `;
      
      case 'SHOPPING_REMINDER':
        return `
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🛒 Shopping Reminder</h3>
            <p>Don't forget to complete your shopping list!</p>
          </div>
        `;
      
      case 'MEAL_PLAN_REMINDER':
        return `
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🍽️ Meal Plan Reminder</h3>
            <p>Time to prepare your planned meal!</p>
          </div>
        `;
      
      case 'TIMER_COMPLETE':
        return `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>⏰ Timer Complete</h3>
            <p>Your cooking timer has finished!</p>
          </div>
        `;
      
      default:
        return '';
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  async getUnreadNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get unread notifications:', error);
      return [];
    }
  }

  async getAllNotifications(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: userId,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<number> {
    let successCount = 0;
    
    for (const notification of notifications) {
      const success = await this.sendNotification(notification);
      if (success) successCount++;
    }
    
    return successCount;
  }

  // Specific notification methods for common use cases
  async sendExpiryWarning(userId: string, items: any[]): Promise<boolean> {
    const itemNames = items.map(item => item.name).join(', ');
    return this.sendNotification({
      userId,
      type: 'EXPIRY_WARNING',
      title: 'Items Expiring Soon',
      message: `The following items are expiring soon: ${itemNames}. Check your inventory to use them before they expire.`,
      data: { items },
    });
  }

  async sendLowStockAlert(userId: string, items: any[]): Promise<boolean> {
    const itemNames = items.map(item => item.name).join(', ');
    return this.sendNotification({
      userId,
      type: 'LOW_STOCK',
      title: 'Low Stock Alert',
      message: `These items are running low: ${itemNames}. Consider adding them to your shopping list.`,
      data: { items },
    });
  }

  async sendTimerComplete(userId: string, timerName: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'TIMER_COMPLETE',
      title: 'Timer Complete',
      message: `Your timer "${timerName}" has finished!`,
      data: { timerName },
    });
  }

  async sendMealPlanReminder(userId: string, mealPlan: any): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'MEAL_PLAN_REMINDER',
      title: 'Meal Plan Reminder',
      message: `Time to prepare your ${mealPlan.mealType.toLowerCase()}: ${mealPlan.recipeName || 'planned meal'}`,
      data: { mealPlan },
    });
  }

  async sendNutritionGoalAchieved(userId: string, goalType: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'NUTRITION_GOAL_ACHIEVED',
      title: 'Nutrition Goal Achieved!',
      message: `Congratulations! You've achieved your ${goalType} goal for today.`,
      data: { goalType },
    });
  }

  async sendWasteGoalExceeded(userId: string, wasteAmount: number): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'WASTE_GOAL_EXCEEDED',
      title: 'Waste Goal Exceeded',
      message: `You've exceeded your monthly waste goal by ${wasteAmount}kg. Consider reviewing your meal planning and storage practices.`,
      data: { wasteAmount },
    });
  }
}