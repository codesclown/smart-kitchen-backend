import { Context, requireKitchenAccess } from '../context';

export const inventoryResolvers = {
  Query: {
    inventoryItems: async (_: any, { kitchenId }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      return context.prisma.inventoryItem.findMany({
        where: { kitchenId },
        orderBy: { name: 'asc' },
      });
    },

    inventoryItem: async (_: any, { id }: any, context: Context) => {
      const item = await context.prisma.inventoryItem.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error('Inventory item not found');
      }

      await requireKitchenAccess(context, item.kitchenId);
      return item;
    },

    lowStockItems: async (_: any, { kitchenId }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      const items = await context.prisma.inventoryItem.findMany({
        where: { kitchenId },
        include: {
          batches: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      // Filter items with low stock
      return items.filter((item: any) => {
        const totalQuantity = item.batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
        const threshold = item.threshold || 1;
        return totalQuantity <= threshold;
      });
    },

    expiringItems: async (_: any, { kitchenId, days = 7 }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const items = await context.prisma.inventoryItem.findMany({
        where: { kitchenId },
        include: {
          batches: {
            where: {
              status: 'ACTIVE',
              expiryDate: {
                lte: futureDate,
                gte: new Date(),
              },
            },
          },
        },
      });

      // Return only items that have expiring batches
      return items.filter((item: any) => item.batches.length > 0);
    },
  },

  Mutation: {
    createInventoryItem: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, ...itemData } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      return context.prisma.inventoryItem.create({
        data: {
          ...itemData,
          kitchenId,
        },
      });
    },

    updateInventoryItem: async (_: any, { id, input }: any, context: Context) => {
      const item = await context.prisma.inventoryItem.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error('Inventory item not found');
      }

      await requireKitchenAccess(context, item.kitchenId, 'MEMBER');

      return context.prisma.inventoryItem.update({
        where: { id },
        data: input,
      });
    },

    deleteInventoryItem: async (_: any, { id }: any, context: Context) => {
      const item = await context.prisma.inventoryItem.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error('Inventory item not found');
      }

      await requireKitchenAccess(context, item.kitchenId, 'MEMBER');

      await context.prisma.inventoryItem.delete({
        where: { id },
      });

      return true;
    },

    createInventoryBatch: async (_: any, { input }: any, context: Context) => {
      const { itemId, ...batchData } = input;
      
      const item = await context.prisma.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error('Inventory item not found');
      }

      await requireKitchenAccess(context, item.kitchenId, 'MEMBER');

      return context.prisma.inventoryBatch.create({
        data: {
          ...batchData,
          itemId,
        },
      });
    },

    updateInventoryBatch: async (_: any, { id, quantity, expiryDate }: any, context: Context) => {
      const batch = await context.prisma.inventoryBatch.findUnique({
        where: { id },
        include: { item: true },
      });

      if (!batch) {
        throw new Error('Inventory batch not found');
      }

      await requireKitchenAccess(context, batch.item.kitchenId, 'MEMBER');

      const updateData: any = {};
      if (quantity !== undefined) updateData.quantity = quantity;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate;

      return context.prisma.inventoryBatch.update({
        where: { id },
        data: updateData,
      });
    },

    deleteInventoryBatch: async (_: any, { id }: any, context: Context) => {
      const batch = await context.prisma.inventoryBatch.findUnique({
        where: { id },
        include: { item: true },
      });

      if (!batch) {
        throw new Error('Inventory batch not found');
      }

      await requireKitchenAccess(context, batch.item.kitchenId, 'MEMBER');

      await context.prisma.inventoryBatch.delete({
        where: { id },
      });

      return true;
    },

    bulkCreateInventoryItems: async (_: any, { items }: any, context: Context) => {
      // Validate all items belong to kitchens the user has access to
      const kitchenIds = [...new Set(items.map((item: any) => item.kitchenId))];
      
      for (const kitchenId of kitchenIds) {
        await requireKitchenAccess(context, kitchenId as string, 'MEMBER');
      }

      const createdItems: any[] = [];
      
      for (const itemData of items) {
        const { kitchenId, ...data } = itemData;
        const item = await context.prisma.inventoryItem.create({
          data: {
            ...data,
            kitchenId,
          },
        });
        createdItems.push(item);
      }

      return createdItems;
    },

    bulkUpdateInventoryQuantities: async (_: any, { updates }: any, context: Context) => {
      // Each update should have { itemId, batchId?, quantity, operation: 'add' | 'subtract' | 'set' }
      
      for (const update of updates) {
        const { itemId, batchId, quantity, operation } = update;
        
        const item = await context.prisma.inventoryItem.findUnique({
          where: { id: itemId },
        });

        if (!item) continue;

        await requireKitchenAccess(context, item.kitchenId, 'MEMBER');

        if (batchId) {
          // Update specific batch
          const batch = await context.prisma.inventoryBatch.findUnique({
            where: { id: batchId },
          });

          if (!batch) continue;

          let newQuantity = batch.quantity;
          
          switch (operation) {
            case 'add':
              newQuantity += quantity;
              break;
            case 'subtract':
              newQuantity = Math.max(0, newQuantity - quantity);
              break;
            case 'set':
              newQuantity = quantity;
              break;
          }

          await context.prisma.inventoryBatch.update({
            where: { id: batchId },
            data: { quantity: newQuantity },
          });
        }
      }

      return true;
    },
  },
};