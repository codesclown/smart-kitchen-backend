import { Context, requireKitchenAccess } from '../context';

export const reminderResolvers: any = {
  Query: {
    reminders: async (_: any, { kitchenId }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      return context.prisma.reminder.findMany({
        where: { kitchenId },
        orderBy: { scheduledAt: 'asc' },
      });
    },

    upcomingReminders: async (_: any, { kitchenId, days = 7 }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return context.prisma.reminder.findMany({
        where: {
          kitchenId,
          scheduledAt: {
            gte: now,
            lte: futureDate,
          },
          isCompleted: false,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    },
  },

  Mutation: {
    createReminder: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, ...reminderData } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      return context.prisma.reminder.create({
        data: {
          ...reminderData,
          kitchenId,
        },
      });
    },

    updateReminder: async (_: any, { id, isCompleted }: any, context: Context) => {
      const reminder = await context.prisma.reminder.findUnique({
        where: { id },
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      await requireKitchenAccess(context, reminder.kitchenId, 'MEMBER');

      return context.prisma.reminder.update({
        where: { id },
        data: { isCompleted },
      });
    },

    deleteReminder: async (_: any, { id }: any, context: Context) => {
      const reminder = await context.prisma.reminder.findUnique({
        where: { id },
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      await requireKitchenAccess(context, reminder.kitchenId, 'MEMBER');

      await context.prisma.reminder.delete({
        where: { id },
      });

      return true;
    },

    generateSmartReminders: async (_: any, { kitchenId }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      try {
        const reminders: any[] = [];

        // Get low stock items
        const lowStockItems = await context.prisma.inventoryItem.findMany({
          where: { kitchenId },
          include: {
            batches: {
              where: { status: 'ACTIVE' },
            },
          },
        });

        // Check for low stock
        for (const item of lowStockItems) {
          const totalQuantity = item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
          if (totalQuantity <= (item.threshold || 0) && totalQuantity > 0) {
            // Check if reminder already exists
            const existingReminder = await context.prisma.reminder.findFirst({
              where: {
                kitchenId,
                type: 'LOW_STOCK',
                meta: {
                  path: ['itemId'],
                  equals: item.id,
                },
                isCompleted: false,
              },
            });

            if (!existingReminder) {
              const reminder = await context.prisma.reminder.create({
                data: {
                  kitchenId,
                  type: 'LOW_STOCK',
                  title: `Low Stock: ${item.name}`,
                  description: `Only ${totalQuantity} ${item.defaultUnit} left. Consider restocking soon.`,
                  scheduledAt: new Date(),
                  meta: {
                    itemId: item.id,
                    currentQuantity: totalQuantity,
                    threshold: item.threshold,
                  },
                },
              });
              reminders.push(reminder);
            }
          }
        }

        // Get expiring items (next 3 days)
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiringBatches = await context.prisma.inventoryBatch.findMany({
          where: {
            item: { kitchenId },
            status: 'ACTIVE',
            expiryDate: {
              lte: threeDaysFromNow,
              gte: new Date(),
            },
          },
          include: { item: true },
        });

        for (const batch of expiringBatches) {
          // Check if reminder already exists
          const existingReminder = await context.prisma.reminder.findFirst({
            where: {
              kitchenId,
              type: 'EXPIRY',
              meta: {
                path: ['batchId'],
                equals: batch.id,
              },
              isCompleted: false,
            },
          });

          if (!existingReminder) {
            const daysUntilExpiry = Math.ceil(
              (batch.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            const reminder = await context.prisma.reminder.create({
              data: {
                kitchenId,
                type: 'EXPIRY',
                title: `Expiring Soon: ${batch.item.name}`,
                description: `${batch.quantity} ${batch.unit} expires in ${daysUntilExpiry} day(s). Use it soon!`,
                scheduledAt: new Date(),
                meta: {
                  batchId: batch.id,
                  itemId: batch.item.id,
                  expiryDate: batch.expiryDate,
                  quantity: batch.quantity,
                },
              },
            });
            reminders.push(reminder);
          }
        }

        // Generate usage-based reminders
        const usageLogs = await context.prisma.usageLog.findMany({
          where: {
            kitchenId,
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          include: { item: true },
        });

        // Analyze consumption patterns
        const consumptionPatterns: Record<string, { totalUsed: number; avgDaily: number; item: any }> = {};
        
        usageLogs.forEach(log => {
          if (log.type === 'CONSUMED' || log.type === 'COOKED') {
            if (!consumptionPatterns[log.itemId]) {
              consumptionPatterns[log.itemId] = {
                totalUsed: 0,
                avgDaily: 0,
                item: log.item,
              };
            }
            consumptionPatterns[log.itemId].totalUsed += log.quantity;
          }
        });

        // Calculate daily averages and predict restocking
        for (const [itemId, pattern] of Object.entries(consumptionPatterns)) {
          pattern.avgDaily = pattern.totalUsed / 30;
          
          if (pattern.avgDaily > 0) {
            const item = await context.prisma.inventoryItem.findUnique({
              where: { id: itemId },
              include: { batches: { where: { status: 'ACTIVE' } } },
            });

            if (item) {
              const currentQuantity = item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
              const daysRemaining = Math.floor(currentQuantity / pattern.avgDaily);

              if (daysRemaining <= 7 && daysRemaining > 0) {
                const existingReminder = await context.prisma.reminder.findFirst({
                  where: {
                    kitchenId,
                    type: 'SHOPPING',
                    meta: {
                      path: ['itemId'],
                      equals: itemId,
                    },
                    isCompleted: false,
                  },
                });

                if (!existingReminder) {
                  const reminder = await context.prisma.reminder.create({
                    data: {
                      kitchenId,
                      type: 'SHOPPING',
                      title: `Restock Soon: ${item.name}`,
                      description: `Based on usage patterns, you'll run out in ${daysRemaining} days. Add to shopping list?`,
                      scheduledAt: new Date(),
                      meta: {
                        itemId: item.id,
                        daysRemaining,
                        avgDailyUsage: pattern.avgDaily,
                        currentQuantity,
                      },
                    },
                  });
                  reminders.push(reminder);
                }
              }
            }
          }
        }

        return {
          success: true,
          remindersCreated: reminders.length,
          reminders,
        };

      } catch (error) {
        console.error('Smart reminder generation failed:', error);
        throw new Error('Failed to generate smart reminders');
      }
    },
  },
};