// Background jobs for processing reminders and automated tasks

import { prisma } from '../lib/prisma';
import { notificationService } from '../services/notifications';

export class ReminderJobProcessor {
  async processExpiredItems(): Promise<void> {
    try {
      const now = new Date();
      
      // Find items expiring in the next 24 hours
      const expiringBatches = await prisma.inventoryBatch.findMany({
        where: {
          status: 'ACTIVE',
          expiryDate: {
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Next 24 hours
            gte: now,
          },
        },
        include: {
          item: {
            include: {
              kitchen: {
                include: {
                  household: {
                    include: {
                      members: {
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const batch of expiringBatches) {
        const item = batch.item;
        const kitchen = item.kitchen;
        const household = kitchen.household;

        // Create reminder for each household member
        for (const member of household.members) {
          await prisma.reminder.create({
            data: {
              kitchenId: kitchen.id,
              type: 'EXPIRY',
              title: `${item.name} expiring soon`,
              description: `${item.name} in ${kitchen.name} expires on ${batch.expiryDate?.toLocaleDateString()}`,
              scheduledAt: now,
              meta: {
                itemId: item.id,
                batchId: batch.id,
                expiryDate: batch.expiryDate,
              },
            },
          });

          // Send push notification
          await notificationService.sendPushNotification({
            userId: member.userId,
            title: 'Item Expiring Soon',
            body: `${item.name} in ${kitchen.name} expires soon`,
            type: 'alert',
            data: {
              itemId: item.id,
              kitchenId: kitchen.id,
            },
          });
        }
      }

      console.log(`Processed ${expiringBatches.length} expiring items`);
    } catch (error) {
      console.error('Error processing expired items:', error);
    }
  }

  async processLowStockItems(): Promise<void> {
    try {
      // Find all inventory items
      const items = await prisma.inventoryItem.findMany({
        include: {
          batches: {
            where: { status: 'ACTIVE' },
          },
          kitchen: {
            include: {
              household: {
                include: {
                  members: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const item of items) {
        const totalQuantity = item.batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
        const threshold = item.threshold || 1;

        if (totalQuantity <= threshold) {
          const kitchen = item.kitchen;
          const household = kitchen.household;

          // Check if we already have a recent low stock reminder
          const recentReminder = await prisma.reminder.findFirst({
            where: {
              kitchenId: kitchen.id,
              type: 'LOW_STOCK',
              meta: {
                path: ['itemId'],
                equals: item.id,
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          });

          if (!recentReminder) {
            // Create reminder for each household member
            for (const member of household.members) {
              await prisma.reminder.create({
                data: {
                  kitchenId: kitchen.id,
                  type: 'LOW_STOCK',
                  title: `${item.name} is running low`,
                  description: `Only ${totalQuantity} ${item.defaultUnit} left in ${kitchen.name}`,
                  scheduledAt: new Date(),
                  meta: {
                    itemId: item.id,
                    currentQuantity: totalQuantity,
                    threshold,
                  },
                },
              });

              // Send push notification
              await notificationService.sendPushNotification({
                userId: member.userId,
                title: 'Low Stock Alert',
                body: `${item.name} is running low in ${kitchen.name}`,
                type: 'alert',
                data: {
                  itemId: item.id,
                  kitchenId: kitchen.id,
                },
              });
            }
          }
        }
      }

      console.log(`Processed low stock check for ${items.length} items`);
    } catch (error) {
      console.error('Error processing low stock items:', error);
    }
  }

  async processScheduledReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Find reminders that should be triggered now
      const dueReminders = await prisma.reminder.findMany({
        where: {
          scheduledAt: {
            lte: now,
          },
          isCompleted: false,
        },
        include: {
          kitchen: {
            include: {
              household: {
                include: {
                  members: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const reminder of dueReminders) {
        const kitchen = reminder.kitchen;
        const household = kitchen.household;

        // Send notification to all household members
        for (const member of household.members) {
          await notificationService.sendPushNotification({
            userId: member.userId,
            title: reminder.title,
            body: reminder.description || '',
            type: 'reminder',
            data: {
              reminderId: reminder.id,
              kitchenId: kitchen.id,
            },
          });
        }

        // Mark as completed if not recurring
        if (!reminder.isRecurring) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { isCompleted: true },
          });
        } else {
          // Schedule next occurrence for recurring reminders
          const nextSchedule = calculateNextSchedule(reminder.scheduledAt, reminder.frequency);
          if (nextSchedule) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { scheduledAt: nextSchedule },
            });
          }
        }
      }

      console.log(`Processed ${dueReminders.length} scheduled reminders`);
    } catch (error) {
      console.error('Error processing scheduled reminders:', error);
    }
  }
}

function calculateNextSchedule(currentSchedule: Date, frequency?: string | null): Date | null {
  if (!frequency) return null;

  const next = new Date(currentSchedule);

  switch (frequency.toLowerCase()) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return next;
}

export const reminderJobProcessor = new ReminderJobProcessor();