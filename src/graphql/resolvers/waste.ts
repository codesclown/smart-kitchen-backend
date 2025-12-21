import { Context, requireAuth } from '../context';
import { checkGraphQLSecurity } from '../../middleware/security';
import { handlePrismaError } from '../../utils/errors';

export const wasteResolvers = {
  Query: {
    wasteEntries: async (_: any, { startDate, endDate, category }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const where: any = {
          userId: user.id,
        };

        if (startDate || endDate) {
          where.date = {};
          if (startDate) where.date.gte = new Date(startDate);
          if (endDate) where.date.lte = new Date(endDate);
        }

        if (category) {
          where.category = category;
        }

        return context.prisma.wasteEntry.findMany({
          where,
          orderBy: { date: 'desc' },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    wasteGoals: async (_: any, __: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        let goals = await context.prisma.wasteGoals.findUnique({
          where: { userId: user.id },
        });

        // Create default goals if none exist
        if (!goals) {
          goals = await context.prisma.wasteGoals.create({
            data: {
              userId: user.id,
              monthlyWasteKg: 5.0, // 5kg per month target
              monthlyCostSave: 1000, // ₹1000 savings target
              co2SaveKg: 10, // 10kg CO2 savings
              waterSaveLiters: 500, // 500L water savings
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

    wasteStats: async (_: any, { period = 'month' }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const wasteEntries = await context.prisma.wasteEntry.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startDate,
              lte: now,
            },
          },
        });

        // Calculate statistics
        const totalWasteKg = wasteEntries.reduce((sum, entry) => {
          // Convert different units to kg (simplified)
          let weightInKg = entry.quantity;
          if (entry.unit === 'g' || entry.unit === 'grams') {
            weightInKg = entry.quantity / 1000;
          } else if (entry.unit === 'pieces' || entry.unit === 'items') {
            weightInKg = entry.quantity * 0.1; // Assume 100g per piece
          }
          return sum + weightInKg;
        }, 0);

        const totalCost = wasteEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
        const preventableWaste = wasteEntries.filter(entry => entry.preventable);
        const preventableWasteKg = preventableWaste.reduce((sum, entry) => {
          let weightInKg = entry.quantity;
          if (entry.unit === 'g' || entry.unit === 'grams') {
            weightInKg = entry.quantity / 1000;
          } else if (entry.unit === 'pieces' || entry.unit === 'items') {
            weightInKg = entry.quantity * 0.1;
          }
          return sum + weightInKg;
        }, 0);

        // Calculate environmental impact (simplified calculations)
        const co2Impact = totalWasteKg * 2.1; // 2.1 kg CO2 per kg of food waste
        const waterImpact = totalWasteKg * 100; // 100L water per kg of food waste

        // Group by category
        const categoryStats = wasteEntries.reduce((acc: any, entry) => {
          const category = entry.category || 'Other';
          if (!acc[category]) {
            acc[category] = {
              category,
              count: 0,
              totalWeight: 0,
              totalCost: 0,
            };
          }
          acc[category].count += 1;
          acc[category].totalWeight += entry.quantity;
          acc[category].totalCost += entry.cost || 0;
          return acc;
        }, {});

        // Group by reason
        const reasonStats = wasteEntries.reduce((acc: any, entry) => {
          const reason = entry.reason;
          if (!acc[reason]) {
            acc[reason] = {
              reason,
              count: 0,
              totalWeight: 0,
              totalCost: 0,
            };
          }
          acc[reason].count += 1;
          acc[reason].totalWeight += entry.quantity;
          acc[reason].totalCost += entry.cost || 0;
          return acc;
        }, {});

        return {
          period,
          startDate,
          endDate: now,
          totalEntries: wasteEntries.length,
          totalWasteKg: Math.round(totalWasteKg * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          preventableWasteKg: Math.round(preventableWasteKg * 100) / 100,
          preventablePercentage: totalWasteKg > 0 ? Math.round((preventableWasteKg / totalWasteKg) * 100) : 0,
          co2Impact: Math.round(co2Impact * 100) / 100,
          waterImpact: Math.round(waterImpact),
          categoryBreakdown: Object.values(categoryStats),
          reasonBreakdown: Object.values(reasonStats),
        };
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    wasteTrends: async (_: any, { days = 30 }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const wasteEntries = await context.prisma.wasteEntry.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { date: 'asc' },
        });

        // Group by date
        const dailyTotals = new Map();
        
        wasteEntries.forEach(entry => {
          const dateKey = entry.date.toISOString().split('T')[0];
          
          if (!dailyTotals.has(dateKey)) {
            dailyTotals.set(dateKey, {
              date: dateKey,
              totalWeight: 0,
              totalCost: 0,
              entryCount: 0,
            });
          }
          
          const daily = dailyTotals.get(dateKey);
          daily.totalWeight += entry.quantity;
          daily.totalCost += entry.cost || 0;
          daily.entryCount += 1;
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
    createWasteEntry: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.wasteEntry.create({
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

    updateWasteEntry: async (_: any, { id, input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if entry belongs to user
        const existingEntry = await context.prisma.wasteEntry.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingEntry) {
          throw new Error('Waste entry not found or access denied');
        }

        const updateData: any = { ...input };
        if (input.date) {
          updateData.date = new Date(input.date);
        }

        return context.prisma.wasteEntry.update({
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

    deleteWasteEntry: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if entry belongs to user
        const existingEntry = await context.prisma.wasteEntry.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingEntry) {
          throw new Error('Waste entry not found or access denied');
        }

        await context.prisma.wasteEntry.delete({
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

    updateWasteGoals: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.wasteGoals.upsert({
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

    bulkCreateWasteEntries: async (_: any, { entries }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const wasteEntries = entries.map((entry: any) => ({
          ...entry,
          userId: user.id,
          date: new Date(entry.date),
        }));

        const result = await context.prisma.wasteEntry.createMany({
          data: wasteEntries,
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