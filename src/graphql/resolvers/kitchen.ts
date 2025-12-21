import { Context, requireAuth, requireHouseholdAccess, requireKitchenAccess } from '../context';

export const kitchenResolvers = {
  Query: {
    kitchens: async (_: any, { householdId }: any, context: Context) => {
      await requireHouseholdAccess(context, householdId);
      
      return context.prisma.kitchen.findMany({
        where: { householdId },
        orderBy: { createdAt: 'asc' },
      });
    },

    kitchen: async (_: any, { id }: any, context: Context) => {
      await requireKitchenAccess(context, id);
      
      return context.prisma.kitchen.findUnique({
        where: { id },
      });
    },
  },

  Mutation: {
    createKitchen: async (_: any, { input }: any, context: Context) => {
      const { householdId, name, description, type } = input;
      
      await requireHouseholdAccess(context, householdId, 'MEMBER');

      return context.prisma.kitchen.create({
        data: {
          householdId,
          name,
          description,
          type,
        },
      });
    },

    updateKitchen: async (_: any, { id, input }: any, context: Context) => {
      await requireKitchenAccess(context, id, 'MEMBER');
      
      const { householdId, ...updateData } = input;
      
      return context.prisma.kitchen.update({
        where: { id },
        data: updateData,
      });
    },

    deleteKitchen: async (_: any, { id }: any, context: Context) => {
      await requireKitchenAccess(context, id, 'ADMIN');
      
      // Check if this is the only kitchen in the household
      const kitchen = await context.prisma.kitchen.findUnique({
        where: { id },
        select: { householdId: true },
      });

      if (!kitchen) {
        throw new Error('Kitchen not found');
      }

      const kitchenCount = await context.prisma.kitchen.count({
        where: { householdId: kitchen.householdId },
      });

      if (kitchenCount <= 1) {
        throw new Error('Cannot delete the last kitchen in a household');
      }

      await context.prisma.kitchen.delete({
        where: { id },
      });

      return true;
    },
  },
};