import { Context, requireKitchenAccess } from '../context';
import { generateRecipeWithAI } from '../../services/ai';

export const recipeResolvers: any = {
  Query: {
    recipeHistory: async (_: any, { kitchenId }: any, context: Context) => {
      if (kitchenId) {
        await requireKitchenAccess(context, kitchenId);
      }
      
      return context.prisma.recipeHistory.findMany({
        where: kitchenId ? { kitchenId } : {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },

    generateRecipe: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, availableIngredients, cuisine, prepTime, dietary } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      console.log('🚀 Starting recipe generation...');
      console.log('Input:', { availableIngredients, cuisine, prepTime, dietary });

      try {
        console.log('📞 Calling AI service...');
        const recipe = await generateRecipeWithAI({
          availableIngredients,
          cuisine,
          prepTime,
          dietary,
        });

        console.log('✅ AI recipe generated successfully:', recipe.title);
        console.log('Ingredients with amounts:', recipe.ingredients);

        await context.prisma.recipeHistory.create({
          data: {
            kitchenId,
            title: recipe.title,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            cuisine: recipe.cuisine,
            prepTime: recipe.prepTime,
            calories: recipe.calories,
            source: 'AI',
          },
        });
        console.log('💾 Recipe saved to history');

        return recipe;
      } catch (error) {
        console.error('❌ Recipe generation failed:', error);
        
        // Check if it's an API key issue
        if (error instanceof Error && error.message.includes('API key')) {
          console.error('🔑 OpenAI API key not configured properly');
          throw new Error('AI service not available. Please check API configuration.');
        }
        
        // For other errors, provide more specific error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('🚨 Detailed error:', errorMessage);
        
        throw new Error(`Failed to generate recipe: ${errorMessage}`);
      }
    },
  },

  Mutation: {
    saveRecipe: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, title, ingredients, steps, cuisine, prepTime, calories, isFavorite } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      try {
        const savedRecipe = await context.prisma.recipeHistory.create({
          data: {
            kitchenId,
            title,
            ingredients: typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients),
            steps: typeof steps === 'string' ? steps : JSON.stringify(steps),
            cuisine: cuisine || 'International',
            prepTime: prepTime || 30,
            calories: calories || 250,
            isFavorite: isFavorite || false,
            source: 'USER',
          },
        });

        console.log('✅ Recipe saved to database:', savedRecipe.title);
        return savedRecipe;
      } catch (error) {
        console.error('❌ Failed to save recipe:', error);
        throw new Error('Failed to save recipe to database');
      }
    },

    toggleRecipeFavorite: async (_: any, { recipeId }: any, context: Context) => {
      try {
        // First get the recipe to check kitchen access
        const recipe = await context.prisma.recipeHistory.findUnique({
          where: { id: recipeId },
        });

        if (!recipe) {
          throw new Error('Recipe not found');
        }

        if (recipe.kitchenId) {
          await requireKitchenAccess(context, recipe.kitchenId, 'MEMBER');
        }

        // Toggle the favorite status
        const updatedRecipe = await context.prisma.recipeHistory.update({
          where: { id: recipeId },
          data: {
            isFavorite: !recipe.isFavorite,
          },
        });

        console.log('✅ Recipe favorite status toggled:', updatedRecipe.title, updatedRecipe.isFavorite);
        return updatedRecipe;
      } catch (error) {
        console.error('❌ Failed to toggle recipe favorite:', error);
        throw new Error('Failed to update recipe favorite status');
      }
    },

    deleteRecipe: async (_: any, { recipeId }: any, context: Context) => {
      try {
        // First get the recipe to check kitchen access
        const recipe = await context.prisma.recipeHistory.findUnique({
          where: { id: recipeId },
        });

        if (!recipe) {
          throw new Error('Recipe not found');
        }

        if (recipe.kitchenId) {
          await requireKitchenAccess(context, recipe.kitchenId, 'MEMBER');
        }

        // Delete the recipe
        await context.prisma.recipeHistory.delete({
          where: { id: recipeId },
        });

        console.log('✅ Recipe deleted:', recipe.title);
        return true;
      } catch (error) {
        console.error('❌ Failed to delete recipe:', error);
        throw new Error('Failed to delete recipe');
      }
    },
  },
};