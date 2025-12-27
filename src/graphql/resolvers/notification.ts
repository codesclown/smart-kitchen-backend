import { Context, requireAuth } from '../context';
import { checkGraphQLSecurity } from '../../middleware/security';
import { handlePrismaError } from '../../utils/errors';
import { NotificationService } from '../../services/notification';

export const notificationResolvers: any = {
  Query: {
    notifications: async (_: any, { limit = 50, unreadOnly = false }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const where: any = {
          userId: user.id,
        };

        if (unreadOnly) {
          where.isRead = false;
        }

        return context.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    unreadNotificationCount: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.notification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },
  },

  Mutation: {
    markNotificationAsRead: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if notification belongs to user
        const notification = await context.prisma.notification.findFirst({
          where: { id, userId: user.id },
        });

        if (!notification) {
          throw new Error('Notification not found or access denied');
        }

        return context.prisma.notification.update({
          where: { id },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    markAllNotificationsAsRead: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const result = await context.prisma.notification.updateMany({
          where: {
            userId: user.id,
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        return result.count;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    deleteNotification: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if notification belongs to user
        const notification = await context.prisma.notification.findFirst({
          where: { id, userId: user.id },
        });

        if (!notification) {
          throw new Error('Notification not found or access denied');
        }

        await context.prisma.notification.delete({
          where: { id },
        });

        return true;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    deleteAllNotifications: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const result = await context.prisma.notification.deleteMany({
          where: {
            userId: user.id,
          },
        });

        return result.count;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    sendTestNotification: async (_: any, { title, message }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const notificationService = new NotificationService(context.prisma);
        
        const success = await notificationService.sendNotification({
          userId: user.id,
          type: 'GENERAL',
          title: title || 'Test Notification',
          message: message || 'This is a test notification from Smart Kitchen Manager.',
        });

        return success;
      } catch (error: any) {
        console.error('Failed to send test notification:', error);
        throw new Error('Failed to send test notification');
      }
    },

    updateNotificationPreferences: async (_: any, { preferences }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Get current settings
        const currentUser = await context.prisma.user.findUnique({
          where: { id: user.id },
          include: {
            settings: {
              include: {
                notifications: true,
                privacy: true,
              },
            },
          },
        });

        const currentSettings = currentUser?.settings || {};
        
        // Update notification preferences using proper Prisma syntax
        if (currentUser?.settings?.notifications) {
          // Update existing notification settings
          await context.prisma.notificationSettings.update({
            where: { id: currentUser.settings.notifications.id },
            data: preferences,
          });
        } else if (currentUser?.settings) {
          // Create notification settings for existing user settings
          const notificationSettings = await context.prisma.notificationSettings.create({
            data: preferences,
          });
          
          await context.prisma.userSettings.update({
            where: { id: currentUser.settings.id },
            data: {
              notificationId: notificationSettings.id,
            },
          });
        } else {
          // Create complete new settings
          const notificationSettings = await context.prisma.notificationSettings.create({
            data: preferences,
          });
          
          const privacySettings = await context.prisma.privacySettings.create({
            data: {},
          });
          
          await context.prisma.userSettings.create({
            data: {
              userId: user.id,
              notificationId: notificationSettings.id,
              privacyId: privacySettings.id,
            },
          });
        }

        return true;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },
  },
};