import { Context, requireAuth } from '../context';
import { checkGraphQLSecurity } from '../../middleware/security';
import { handlePrismaError } from '../../utils/errors';

export const nutritionResolvers = {
  Query: {
    nutritionEntries: async (_: any, { date, startDate, endDate }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const where: any = {
          userId: user.id,
        };

        if (date) {
          const targetDate = new Date(date);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          where.date = {
            gte: targetDate,
            lt: nextDay,
          };
        } else if (startDate || endDate) {
          where.date = {};
          if (startDate) where.date.gte = new Date(startDate);
          if (endDate) where.date.lte = new Date(endDate);
        }

        return context.prisma.nutritionEntry.findMany({
          where,
          orderBy: [
            { date: 'desc' },
            { mealType: 'asc' }
          ],
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    nutritionGoals: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        let goals = await context.prisma.nutritionGoals.findUnique({
          where: { userId: user.id },
        });

        // Create default goals if none exist
        if (!goals) {
          goals = await context.prisma.nutritionGoals.create({
            data: {
              userId: user.id,
              dailyCalories: 2000,
              dailyProtein: 150,
              dailyCarbs: 250,
              dailyFat: 65,
              dailyFiber: 25,
              dailyWater: 2.5,
            },
          });
        }

        return goals;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    dailyNutritionSummary: async (_: any, { date }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const entries = await context.prisma.nutritionEntry.findMany({
          where: {
            userId: user.id,
            date: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        });

        const waterIntakes = await context.prisma.waterIntake.findMany({
          where: {
            userId: user.id,
            date: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        });

        // Calculate totals
        const totals = entries.reduce(
          (acc, entry) => ({
            calories: acc.calories + (entry.calories || 0),
            protein: acc.protein + (entry.protein || 0),
            carbs: acc.carbs + (entry.carbs || 0),
            fat: acc.fat + (entry.fat || 0),
            fiber: acc.fiber + (entry.fiber || 0),
            sugar: acc.sugar + (entry.sugar || 0),
            sodium: acc.sodium + (entry.sodium || 0),
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
          }
        );

        const totalWater = waterIntakes.reduce((acc, intake) => acc + intake.amount, 0) / 1000; // Convert ml to liters

        return {
          date: targetDate,
          ...totals,
          water: totalWater,
          entries,
          waterIntakes,
        };
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    nutritionTrends: async (_: any, { days = 7 }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = await context.prisma.nutritionEntry.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { date: 'asc' },
        });

        // Group by date and calculate daily totals
        const dailyTotals = new Map();
        
        entries.forEach(entry => {
          const dateKey = entry.date.toISOString().split('T')[0];
          
          if (!dailyTotals.has(dateKey)) {
            dailyTotals.set(dateKey, {
              date: dateKey,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
            });
          }
          
          const daily = dailyTotals.get(dateKey);
          daily.calories += entry.calories || 0;
          daily.protein += entry.protein || 0;
          daily.carbs += entry.carbs || 0;
          daily.fat += entry.fat || 0;
          daily.fiber += entry.fiber || 0;
        });

        return Array.from(dailyTotals.values());
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },
  },

  Mutation: {
    createNutritionEntry: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.nutritionEntry.create({
          data: {
            ...input,
            userId: user.id,
            date: new Date(input.date),
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    updateNutritionEntry: async (_: any, { id, input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if entry belongs to user
        const existingEntry = await context.prisma.nutritionEntry.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingEntry) {
          throw new Error('Nutrition entry not found or access denied');
        }

        const updateData: any = { ...input };
        if (input.date) {
          updateData.date = new Date(input.date);
        }

        return context.prisma.nutritionEntry.update({
          where: { id },
          data: updateData,
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    deleteNutritionEntry: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if entry belongs to user
        const existingEntry = await context.prisma.nutritionEntry.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingEntry) {
          throw new Error('Nutrition entry not found or access denied');
        }

        await context.prisma.nutritionEntry.delete({
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

    updateNutritionGoals: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.nutritionGoals.upsert({
          where: { userId: user.id },
          update: input,
          create: {
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

    logWaterIntake: async (_: any, { amount, time }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const intakeTime = time ? new Date(time) : new Date();
        const date = new Date(intakeTime.toISOString().split('T')[0]);

        return context.prisma.waterIntake.create({
          data: {
            userId: user.id,
            date,
            amount,
            time: intakeTime,
          },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    quickLogFood: async (_: any, { foodName, mealType, date }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // This is a simplified food database lookup
        // In a real app, you'd integrate with a nutrition API like Edamam or USDA
        const foodDatabase: { [key: string]: any } = {
          'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4 },
          'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3 },
          'rice': { calories: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6 },
          'chicken breast': { calories: 231, protein: 43.5, carbs: 0, fat: 5, fiber: 0 },
          'bread': { calories: 79, protein: 2.7, carbs: 14, fat: 1.1, fiber: 0.8 },
        };

        const foodData = foodDatabase[foodName.toLowerCase()] || {
          calories: 100,
          protein: 5,
          carbs: 15,
          fat: 3,
          fiber: 2,
        };

        return context.prisma.nutritionEntry.create({
          data: {
            userId: user.id,
            date: new Date(date),
            mealType,
            foodName,
            quantity: 1,
            unit: 'serving',
            ...foodData,
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
};