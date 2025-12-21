import { Context, requireAuth } from '../context';
import { ValidationErrors, handlePrismaError } from '../../utils/errors';
import { checkGraphQLSecurity } from '../../middleware/security';
import { StorageService } from '../../services/storage';

export const userResolvers: any = {
  Mutation: {
    updateUserProfile: async (_: any, { input }: any, context: Context) => {
      try {
        // Check security first
        await checkGraphQLSecurity(context);
        
        const user = requireAuth(context);
        
        // Validate input
        if (input.name && input.name.trim().length === 0) {
          throw ValidationErrors.invalidInput('name', 'Name cannot be empty');
        }
        
        if (input.phone && !/^\+?[\d\s\-\(\)]+$/.test(input.phone)) {
          throw ValidationErrors.invalidInput('phone', 'Invalid phone number format');
        }

        const updatedUser = await context.prisma.user.update({
          where: { id: user.id },
          data: {
            ...(input.name && { name: input.name.trim() }),
            ...(input.phone && { phone: input.phone.trim() }),
            ...(input.avatar && { avatar: input.avatar }),
          },
        });

        return updatedUser;
      } catch (error: any) {
        // Handle Prisma errors
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        
        // Re-throw custom errors
        if (error.extensions?.code) {
          throw error;
        }

        // Handle unexpected errors
        console.error('Update user profile error:', error);
        throw new Error('Failed to update user profile');
      }
    },

    updateUserSettings: async (_: any, { input }: any, context: Context) => {
      try {
        // Check security first
        await checkGraphQLSecurity(context);
        
        const user = requireAuth(context);
        
        // Store settings in user settings field
        await context.prisma.user.update({
          where: { id: user.id },
          data: {
            settings: input,
          },
        });

        return true;
      } catch (error: any) {
        // Handle Prisma errors
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        
        // Re-throw custom errors
        if (error.extensions?.code) {
          throw error;
        }

        // Handle unexpected errors
        console.error('Update user settings error:', error);
        throw new Error('Failed to update user settings');
      }
    },

    uploadAvatar: async (_: any, __: any, context: Context) => {
      try {
        // Check security first
        await checkGraphQLSecurity(context);
        
        const user = requireAuth(context);
        
        // This resolver expects the file to be uploaded via the /upload endpoint
        // and the URL to be passed in the context or as a parameter
        // For now, we'll return a presigned URL for direct upload
        throw new Error('Use getAvatarUploadUrl for avatar uploads');
      } catch (error: any) {
        console.error('Avatar upload error:', error);
        throw new Error('Failed to upload avatar');
      }
    },

    getAvatarUploadUrl: async (_: any, __: any, context: Context) => {
      try {
        // Check security first
        await checkGraphQLSecurity(context);
        
        const user = requireAuth(context);
        
        const result = await StorageService.getPresignedAvatarUploadUrl(user.id);
        
        return result;
      } catch (error: any) {
        console.error('Get avatar upload URL error:', error);
        throw new Error('Failed to generate avatar upload URL');
      }
    },
  },
};