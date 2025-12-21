import { Context, requireAuth } from '../context';
import { checkGraphQLSecurity } from '../../middleware/security';
import { handlePrismaError } from '../../utils/errors';

export const mealPlanResolvers: any = {
  Query: {
    mealPlans: async (_: any, { startDate, endDate }: any, context: Context) => {
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

        return context.prisma.mealPlan.findMany({
          where,
          orderBy: [
            { date: 'asc' },
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

    mealPlanTemplates: async (_: any, { category }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);

        const where: any = {
          isPublic: true,
        };

        if (category) {
          where.category = category;
        }

        return context.prisma.mealPlanTemplate.findMany({
          where,
          orderBy: { name: 'asc' },
        });
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    weeklyMealPlan: async (_: any, { weekStart }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        return context.prisma.mealPlan.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: [
            { date: 'asc' },
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
  },

  Mutation: {
    createMealPlan: async (_: any, { input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        return context.prisma.mealPlan.create({
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

    updateMealPlan: async (_: any, { id, input }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if meal plan belongs to user
        const existingMealPlan = await context.prisma.mealPlan.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingMealPlan) {
          throw new Error('Meal plan not found or access denied');
        }

        const updateData: any = { ...input };
        if (input.date) {
          updateData.date = new Date(input.date);
        }

        return context.prisma.mealPlan.update({
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

    deleteMealPlan: async (_: any, { id }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Check if meal plan belongs to user
        const existingMealPlan = await context.prisma.mealPlan.findFirst({
          where: { id, userId: user.id },
        });

        if (!existingMealPlan) {
          throw new Error('Meal plan not found or access denied');
        }

        await context.prisma.mealPlan.delete({
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

    generateMealPlanFromTemplate: async (_: any, { templateId, startDate }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        const template = await context.prisma.mealPlanTemplate.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          throw new Error('Meal plan template not found');
        }

        const meals = template.meals as any[];
        const createdMealPlans: any[] = [];

        for (const meal of meals) {
          const mealDate = new Date(startDate);
          mealDate.setDate(mealDate.getDate() + (meal.dayOffset || 0));

          const mealPlan = await context.prisma.mealPlan.create({
            data: {
              userId: user.id,
              date: mealDate,
              mealType: meal.mealType,
              recipeName: meal.recipeName,
              servings: meal.servings,
              calories: meal.calories,
              prepTime: meal.prepTime,
              notes: meal.notes,
            },
          });

          createdMealPlans.push(mealPlan);
        }

        return createdMealPlans;
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },

    generateShoppingListFromMealPlan: async (_: any, { startDate, endDate, kitchenId }: any, context: Context) => {
      try {
        await checkGraphQLSecurity(context);
        const user = requireAuth(context);

        // Get meal plans for the date range
        const mealPlans = await context.prisma.mealPlan.findMany({
          where: {
            userId: user.id,
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        });

        if (mealPlans.length === 0) {
          throw new Error('No meal plans found for the specified date range');
        }

        // Create shopping list
        const shoppingList = await context.prisma.shoppingList.create({
          data: {
            kitchenId,
            type: 'WEEKLY',
            title: `Meal Plan Shopping List (${startDate} to ${endDate})`,
            description: `Generated from meal plans for ${mealPlans.length} meals`,
            forDate: new Date(startDate),
          },
        });

        // Extract ingredients from meal plans (simplified - in real app, you'd have recipe ingredients)
        const ingredients = new Map();
        
        for (const mealPlan of mealPlans) {
          if (mealPlan.recipeName) {
            // This is a simplified version - in a real app, you'd fetch recipe ingredients
            const estimatedIngredients = [
              { name: 'Rice', quantity: 1, unit: 'cup' },
              { name: 'Vegetables', quantity: 500, unit: 'g' },
              { name: 'Oil', quantity: 2, unit: 'tbsp' },
            ];

            for (const ingredient of estimatedIngredients) {
              const key = ingredient.name;
              if (ingredients.has(key)) {
                const existing = ingredients.get(key);
                existing.quantity += ingredient.quantity;
              } else {
                ingredients.set(key, { ...ingredient });
              }
            }
          }
        }

        // Create shopping list items
        const shoppingListItems: any[] = [];
        for (const [name, details] of ingredients) {
          const item = await context.prisma.shoppingListItem.create({
            data: {
              listId: shoppingList.id,
              name,
              quantity: details.quantity,
              unit: details.unit,
              notes: 'Generated from meal plan',
            },
          });
          shoppingListItems.push(item);
        }

        return {
          ...shoppingList,
          items: shoppingListItems,
        };
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          throw handlePrismaError(error);
        }
        throw error;
      }
    },
  },
};