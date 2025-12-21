import { Context, requireKitchenAccess } from '../context';

export const shoppingResolvers = {
  Query: {
    shoppingLists: async (_: any, { kitchenId }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      return context.prisma.shoppingList.findMany({
        where: { kitchenId },
        orderBy: { createdAt: 'desc' },
      });
    },

    shoppingList: async (_: any, { id }: any, context: Context) => {
      const list = await context.prisma.shoppingList.findUnique({
        where: { id },
      });

      if (!list) {
        throw new Error('Shopping list not found');
      }

      await requireKitchenAccess(context, list.kitchenId);
      return list;
    },
  },

  Mutation: {
    createShoppingList: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, ...listData } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      return context.prisma.shoppingList.create({
        data: {
          ...listData,
          kitchenId,
        },
      });
    },

    updateShoppingList: async (_: any, { id, title, description }: any, context: Context) => {
      const list = await context.prisma.shoppingList.findUnique({
        where: { id },
      });

      if (!list) {
        throw new Error('Shopping list not found');
      }

      await requireKitchenAccess(context, list.kitchenId, 'MEMBER');

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      return context.prisma.shoppingList.update({
        where: { id },
        data: updateData,
      });
    },

    deleteShoppingList: async (_: any, { id }: any, context: Context) => {
      const list = await context.prisma.shoppingList.findUnique({
        where: { id },
      });

      if (!list) {
        throw new Error('Shopping list not found');
      }

      await requireKitchenAccess(context, list.kitchenId, 'MEMBER');

      await context.prisma.shoppingList.delete({
        where: { id },
      });

      return true;
    },

    createShoppingListItem: async (_: any, { input }: any, context: Context) => {
      const { listId, ...itemData } = input;
      
      const list = await context.prisma.shoppingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        throw new Error('Shopping list not found');
      }

      await requireKitchenAccess(context, list.kitchenId, 'MEMBER');

      return context.prisma.shoppingListItem.create({
        data: {
          ...itemData,
          listId,
        },
      });
    },

    updateShoppingListItem: async (_: any, { id, isPurchased, price }: any, context: Context) => {
      const item = await context.prisma.shoppingListItem.findUnique({
        where: { id },
        include: { list: true },
      });

      if (!item) {
        throw new Error('Shopping list item not found');
      }

      await requireKitchenAccess(context, item.list.kitchenId, 'MEMBER');

      const updateData: any = {};
      if (isPurchased !== undefined) updateData.isPurchased = isPurchased;
      if (price !== undefined) updateData.price = price;

      return context.prisma.shoppingListItem.update({
        where: { id },
        data: updateData,
      });
    },

    deleteShoppingListItem: async (_: any, { id }: any, context: Context) => {
      const item = await context.prisma.shoppingListItem.findUnique({
        where: { id },
        include: { list: true },
      });

      if (!item) {
        throw new Error('Shopping list item not found');
      }

      await requireKitchenAccess(context, item.list.kitchenId, 'MEMBER');

      await context.prisma.shoppingListItem.delete({
        where: { id },
      });

      return true;
    },

    generateAutoShoppingList: async (_: any, { kitchenId, type }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      try {
        // Get low stock items from inventory
        const lowStockItems = await context.prisma.inventoryItem.findMany({
          where: {
            kitchenId,
            // Items where total quantity across all batches is below threshold
          },
          include: {
            batches: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        });

        // Filter items that are actually low stock
        const itemsToRestock = lowStockItems.filter(item => {
          const totalQuantity = item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
          return totalQuantity <= (item.threshold || 0);
        });

        // Get expiring items (next 3 days)
        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 3);
        
        const expiringItems = await context.prisma.inventoryBatch.findMany({
          where: {
            item: {
              kitchenId,
            },
            status: 'ACTIVE',
            expiryDate: {
              lte: expiringDate,
            },
          },
          include: {
            item: true,
          },
        });

        // Create shopping list
        const listTitle = type === 'DAILY' 
          ? `Daily Shopping - ${new Date().toLocaleDateString()}`
          : type === 'WEEKLY'
          ? `Weekly Shopping - Week of ${new Date().toLocaleDateString()}`
          : `Monthly Shopping - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

        const shoppingList = await context.prisma.shoppingList.create({
          data: {
            kitchenId,
            type,
            title: listTitle,
            description: 'Auto-generated based on low stock and expiring items',
            forDate: new Date(),
          },
        });

        // Add low stock items
        const itemsToAdd = new Set();
        
        for (const item of itemsToRestock) {
          itemsToAdd.add({
            name: item.name,
            quantity: item.threshold || 1,
            unit: item.defaultUnit,
            linkedItemId: item.id,
            notes: 'Low stock',
          });
        }

        // Add replacement items for expiring ones
        for (const batch of expiringItems) {
          itemsToAdd.add({
            name: batch.item.name,
            quantity: batch.quantity,
            unit: batch.unit,
            linkedItemId: batch.item.id,
            notes: `Expires on ${batch.expiryDate?.toLocaleDateString()}`,
          });
        }

        // Add common items based on type
        const commonItems = type === 'DAILY' 
          ? [
              { name: 'Milk', quantity: 1, unit: 'liter' },
              { name: 'Bread', quantity: 1, unit: 'loaf' },
              { name: 'Eggs', quantity: 12, unit: 'pieces' },
            ]
          : type === 'WEEKLY'
          ? [
              { name: 'Rice', quantity: 5, unit: 'kg' },
              { name: 'Onions', quantity: 2, unit: 'kg' },
              { name: 'Tomatoes', quantity: 1, unit: 'kg' },
              { name: 'Potatoes', quantity: 2, unit: 'kg' },
              { name: 'Cooking Oil', quantity: 1, unit: 'liter' },
            ]
          : [
              { name: 'Rice', quantity: 25, unit: 'kg' },
              { name: 'Wheat Flour', quantity: 10, unit: 'kg' },
              { name: 'Sugar', quantity: 5, unit: 'kg' },
              { name: 'Salt', quantity: 1, unit: 'kg' },
              { name: 'Spices Mix', quantity: 1, unit: 'pack' },
            ];

        // Add common items if not already present
        for (const commonItem of commonItems) {
          const exists = Array.from(itemsToAdd).some((item: any) => 
            item.name.toLowerCase() === commonItem.name.toLowerCase()
          );
          if (!exists) {
            itemsToAdd.add({
              ...commonItem,
              notes: 'Common item',
            });
          }
        }

        // Create shopping list items
        const itemsArray = Array.from(itemsToAdd);
        for (const itemData of itemsArray) {
          await context.prisma.shoppingListItem.create({
            data: {
              ...itemData as any,
              listId: shoppingList.id,
            },
          });
        }

        // Return the created list with items
        return context.prisma.shoppingList.findUnique({
          where: { id: shoppingList.id },
          include: {
            items: true,
          },
        });

      } catch (error) {
        console.error('Auto shopping list generation failed:', error);
        throw new Error('Failed to generate shopping list. Please try again.');
      }
    },
  },
};