import { Context, requireKitchenAccess } from '../context';

export const usageLogResolvers = {
  Query: {
    usageLogs: async (_: any, { kitchenId, limit = 100 }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      return context.prisma.usageLog.findMany({
        where: { kitchenId },
        orderBy: { date: 'desc' },
        take: limit,
      });
    },
  },

  Mutation: {
    createUsageLog: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, itemId, ...logData } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      // Verify the item belongs to this kitchen
      const item = await context.prisma.inventoryItem.findFirst({
        where: {
          id: itemId,
          kitchenId,
        },
      });

      if (!item) {
        throw new Error('Inventory item not found in this kitchen');
      }

      // Create the usage log
      const usageLog = await context.prisma.usageLog.create({
        data: {
          ...logData,
          kitchenId,
          itemId,
          date: logData.date || new Date(),
        },
      });

      // If this is a consumption/waste log, update inventory quantities
      if (logData.type === 'CONSUMED' || logData.type === 'WASTED' || logData.type === 'COOKED') {
        // Find the oldest active batch to deduct from (FIFO)
        const batch = await context.prisma.inventoryBatch.findFirst({
          where: {
            itemId,
            status: 'ACTIVE',
            quantity: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
        });

        if (batch) {
          const newQuantity = Math.max(0, batch.quantity - logData.quantity);
          
          await context.prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: { 
              quantity: newQuantity,
              status: newQuantity === 0 ? 'USED' : 'ACTIVE',
            },
          });
        }
      }

      // If this is a purchase log, create a new batch
      if (logData.type === 'PURCHASED') {
        await context.prisma.inventoryBatch.create({
          data: {
            itemId,
            quantity: logData.quantity,
            unit: logData.unit,
            purchaseDate: new Date(),
            status: 'ACTIVE',
          },
        });
      }

      return usageLog;
    },
  },
};