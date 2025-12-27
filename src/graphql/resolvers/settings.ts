import { Context } from '../context';
import { AuthErrors, ValidationErrors } from '../../utils/errors';

export const settingsResolvers = {
  Query: {
    // Get user settings and preferences
    userSettings: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw AuthErrors.unauthorized();
      }

      const userWithSettings = await context.prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          settings: {
            include: {
              notifications: true,
              privacy: true,
            },
          },
          preferences: true,
        },
      });

      return userWithSettings?.settings;
    },

    userPreferences: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw AuthErrors.unauthorized();
      }

      const userWithPreferences = await context.prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          preferences: true,
        },
      });

      return userWithPreferences?.preferences;
    },
  },

  Mutation: {
    // Update user profile
    updateUserProfile: async (_: any, { input }: any, context: Context) => {
      if (!context.user) {
        throw AuthErrors.unauthorized();
      }

      // Validate input
      if (input.name && input.name.trim().length === 0) {
        throw ValidationErrors.invalidInput('name', 'Name cannot be empty');
      }

      if (input.phone && !/^\+?[\d\s\-\(\)]+$/.test(input.phone)) {
        throw ValidationErrors.invalidInput('phone', 'Invalid phone number format');
      }

      const updatedUser = await context.prisma.user.update({
        where: { id: context.user.id },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.phone && { phone: input.phone.trim() }),
          ...(input.location && { location: input.location.trim() }),
          ...(input.avatar && { avatar: input.avatar }),
        },
        include: {
          settings: {
            include: {
              notifications: true,
              privacy: true,
            },
          },
          preferences: true,
          households: {
            include: {
              household: {
                include: {
                  kitchens: true,
                },
              },
            },
          },
        },
      });

      return updatedUser;
    },

    // Update user settings (notifications and privacy)
    updateUserSettings: async (_: any, { input }: any, context: Context) => {
      if (!context.user) {
        throw AuthErrors.unauthorized();
      }

      try {
        // Get or create user settings
        let userSettings = await context.prisma.userSettings.findUnique({
          where: { userId: context.user.id },
          include: {
            notifications: true,
            privacy: true,
          },
        });

        if (!userSettings) {
          // Create default settings if they don't exist
          const notifications = await context.prisma.notificationSettings.create({
            data: {
              lowStock: true,
              expiry: true,
              shopping: false,
              mealPlan: true,
              push: true,
              email: false,
              sms: false,
            },
          });

          const privacy = await context.prisma.privacySettings.create({
            data: {
              profileVisibility: 'HOUSEHOLD_ONLY',
              dataSharing: false,
              analyticsOptOut: false,
            },
          });

          userSettings = await context.prisma.userSettings.create({
            data: {
              userId: context.user.id,
              notificationId: notifications.id,
              privacyId: privacy.id,
            },
            include: {
              notifications: true,
              privacy: true,
            },
          });
        }

        // Update notifications if provided
        if (input.notifications) {
          await context.prisma.notificationSettings.update({
            where: { id: userSettings.notificationId },
            data: {
              ...(input.notifications.lowStock !== undefined && { lowStock: input.notifications.lowStock }),
              ...(input.notifications.expiry !== undefined && { expiry: input.notifications.expiry }),
              ...(input.notifications.shopping !== undefined && { shopping: input.notifications.shopping }),
              ...(input.notifications.mealPlan !== undefined && { mealPlan: input.notifications.mealPlan }),
              ...(input.notifications.push !== undefined && { push: input.notifications.push }),
              ...(input.notifications.email !== undefined && { email: input.notifications.email }),
              ...(input.notifications.sms !== undefined && { sms: input.notifications.sms }),
            },
          });
        }

        // Update privacy if provided
        if (input.privacy) {
          await context.prisma.privacySettings.update({
            where: { id: userSettings.privacyId },
            data: {
              ...(input.privacy.profileVisibility && { profileVisibility: input.privacy.profileVisibility }),
              ...(input.privacy.dataSharing !== undefined && { dataSharing: input.privacy.dataSharing }),
              ...(input.privacy.analyticsOptOut !== undefined && { analyticsOptOut: input.privacy.analyticsOptOut }),
            },
          });
        }

        return true;
      } catch (error) {
        console.error('Error updating user settings:', error);
        throw new Error('Failed to update settings');
      }
    },

    // Update user preferences (theme, language, etc.)
    updateUserPreferences: async (_: any, { input }: any, context: Context) => {
      if (!context.user) {
        throw AuthErrors.unauthorized();
      }

      try {
        // Get or create user preferences
        let userPreferences = await context.prisma.userPreferences.findUnique({
          where: { userId: context.user.id },
        });

        if (!userPreferences) {
          // Create default preferences if they don't exist
          userPreferences = await context.prisma.userPreferences.create({
            data: {
              userId: context.user.id,
              theme: 'SYSTEM',
              language: 'en-US',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              dateFormat: 'DD/MM/YYYY',
            },
          });
        }

        // Update preferences
        await context.prisma.userPreferences.update({
          where: { userId: context.user.id },
          data: {
            ...(input.theme && { theme: input.theme }),
            ...(input.language && { language: input.language }),
            ...(input.currency && { currency: input.currency }),
            ...(input.timezone && { timezone: input.timezone }),
            ...(input.dateFormat && { dateFormat: input.dateFormat }),
          },
        });

        return true;
      } catch (error) {
        console.error('Error updating user preferences:', error);
        throw new Error('Failed to update preferences');
      }
    },
  },

  // Type resolvers
  User: {
    settings: async (parent: any, _: any, context: Context) => {
      return await context.prisma.userSettings.findUnique({
        where: { userId: parent.id },
        include: {
          notifications: true,
          privacy: true,
        },
      });
    },

    preferences: async (parent: any, _: any, context: Context) => {
      return await context.prisma.userPreferences.findUnique({
        where: { userId: parent.id },
      });
    },
  },

  UserSettings: {
    notifications: async (parent: any, _: any, context: Context) => {
      return await context.prisma.notificationSettings.findUnique({
        where: { id: parent.notificationId },
      });
    },

    privacy: async (parent: any, _: any, context: Context) => {
      return await context.prisma.privacySettings.findUnique({
        where: { id: parent.privacyId },
      });
    },
  },
};