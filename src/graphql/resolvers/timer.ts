import { Context, requireAuth } from '../context';
import { checkGraphQLSecurity } from '../../middleware/security';
import { handlePrismaError } from '../../utils/errors';

export const timerResolvers = {
  Query: {
    timers: async (_: any, { isActive }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const where: any = {
          userId: user.id,
        };

        if (typeof isActive === 'boolean') {
          where.isActive = isActive;
        }

        return context.prisma.kitchenTimer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    activeTimers: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.kitchenTimer.findMany({
          where: {
            userId: user.id,
            isActive: true,
          },
          orderBy: { startedAt: 'asc' },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    timer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const timer = await context.prisma.kitchenTimer.findFirst({
          where: {
            id,
            userId: user.id,
          },
        });

        if (!timer) {
          throw new Error('Timer not found or access denied');
        }

        return timer;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    timerPresets: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);

        // Return common timer presets
        return [
          { name: 'Soft Boiled Egg', duration: 360, category: 'BOILING' }, // 6 minutes
          { name: 'Hard Boiled Egg', duration: 720, category: 'BOILING' }, // 12 minutes
          { name: 'Rice Cooking', duration: 1200, category: 'COOKING' }, // 20 minutes
          { name: 'Tea Steeping', duration: 180, category: 'STEAMING' }, // 3 minutes
          { name: 'Coffee Brewing', duration: 240, category: 'COOKING' }, // 4 minutes
          { name: 'Pasta Cooking', duration: 600, category: 'BOILING' }, // 10 minutes
          { name: 'Pizza Baking', duration: 900, category: 'BAKING' }, // 15 minutes
          { name: 'Cookies Baking', duration: 720, category: 'BAKING' }, // 12 minutes
          { name: 'Bread Rising', duration: 3600, category: 'RESTING' }, // 1 hour
          { name: 'Marinating Chicken', duration: 1800, category: 'MARINATING' }, // 30 minutes
          { name: 'Steaming Vegetables', duration: 300, category: 'STEAMING' }, // 5 minutes
          { name: 'Pressure Cooking', duration: 900, category: 'COOKING' }, // 15 minutes
        ];
      } catch (error: any) {
        throw error;
      }
    },
  },

  Mutation: {
    createTimer: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.kitchenTimer.create({
          data: {
            ...input,
            userId: user.id,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    updateTimer: async (_: any, { id, input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        return context.prisma.kitchenTimer.update({
          where: { id },
          data: input,
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    deleteTimer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        await context.prisma.kitchenTimer.delete({
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

    startTimer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        return context.prisma.kitchenTimer.update({
          where: { id },
          data: {
            isActive: true,
            startedAt: new Date(),
            pausedAt: null,
            completedAt: null,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    pauseTimer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        return context.prisma.kitchenTimer.update({
          where: { id },
          data: {
            isActive: false,
            pausedAt: new Date(),
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    stopTimer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        return context.prisma.kitchenTimer.update({
          where: { id },
          data: {
            isActive: false,
            completedAt: new Date(),
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    resetTimer: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if timer belongs to user
        const existingTimer = await context.prisma.kitchenTimer.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingTimer) {
          throw new Error('Timer not found or access denied');
        }

        return context.prisma.kitchenTimer.update({
          where: { id },
          data: {
            isActive: false,
            startedAt: null,
            pausedAt: null,
            completedAt: null,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    createTimerFromPreset: async (_: any, { presetName, customName }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Get preset data (this would normally come from a database)
        const presets: { [key: string]: any } = {
          'Soft Boiled Egg': { duration: 360, category: 'BOILING' },
          'Hard Boiled Egg': { duration: 720, category: 'BOILING' },
          'Rice Cooking': { duration: 1200, category: 'COOKING' },
          'Tea Steeping': { duration: 180, category: 'STEAMING' },
          'Coffee Brewing': { duration: 240, category: 'COOKING' },
          'Pasta Cooking': { duration: 600, category: 'BOILING' },
          'Pizza Baking': { duration: 900, category: 'BAKING' },
          'Cookies Baking': { duration: 720, category: 'BAKING' },
          'Bread Rising': { duration: 3600, category: 'RESTING' },
          'Marinating Chicken': { duration: 1800, category: 'MARINATING' },
          'Steaming Vegetables': { duration: 300, category: 'STEAMING' },
          'Pressure Cooking': { duration: 900, category: 'COOKING' },
        };

        const preset = presets[presetName];
        if (!preset) {
          throw new Error('Timer preset not found');
        }

        return context.prisma.kitchenTimer.create({
          data: {
            userId: user.id,
            name: customName || presetName,
            duration: preset.duration,
            category: preset.category,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    bulkStopTimers: async (_: any, { timerIds }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const result = await context.prisma.kitchenTimer.updateMany({
          where: {
            id: { in: timerIds },
            userId: user.id,
          },
          data: {
            isActive: false,
            completedAt: new Date(),
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
  },
};