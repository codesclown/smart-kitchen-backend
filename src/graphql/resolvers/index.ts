import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { authResolvers } from './auth';
import { userResolvers } from './user';
import { settingsResolvers } from './settings';
import { householdResolvers } from './household';
import { kitchenResolvers } from './kitchen';
import { inventoryResolvers } from './inventory';
import { shoppingResolvers } from './shopping';
import { expenseResolvers } from './expense';
import { reminderResolvers } from './reminder';
import { usageLogResolvers } from './usageLog';
import { recipeResolvers } from './recipe';
import { aiResolvers } from './ai';
import { ocrResolvers } from './ocr';
import { mealPlanResolvers } from './mealPlan';
import { nutritionResolvers } from './nutrition';
import { wasteResolvers } from './waste';
import { timerResolvers } from './timer';
import { notificationResolvers } from './notification';

export const resolvers: any = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    ...authResolvers.Query,
    ...settingsResolvers.Query,
    ...householdResolvers.Query,
    ...kitchenResolvers.Query,
    ...inventoryResolvers.Query,
    ...shoppingResolvers.Query,
    ...expenseResolvers.Query,
    ...reminderResolvers.Query,
    ...usageLogResolvers.Query,
    ...recipeResolvers.Query,
    ...aiResolvers.Query,
    ...mealPlanResolvers.Query,
    ...nutritionResolvers.Query,
    ...wasteResolvers.Query,
    ...timerResolvers.Query,
    ...notificationResolvers.Query,
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...settingsResolvers.Mutation,
    ...householdResolvers.Mutation,
    ...kitchenResolvers.Mutation,
    ...inventoryResolvers.Mutation,
    ...shoppingResolvers.Mutation,
    ...expenseResolvers.Mutation,
    ...reminderResolvers.Mutation,
    ...usageLogResolvers.Mutation,
    ...recipeResolvers.Mutation,
    ...aiResolvers.Mutation,
    ...ocrResolvers.Mutation,
    ...mealPlanResolvers.Mutation,
    ...nutritionResolvers.Mutation,
    ...wasteResolvers.Mutation,
    ...timerResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },

  // Type resolvers
  User: {
    ...settingsResolvers.User,
    households: async (parent: any, _: any, context: any) => {
      return context.prisma.householdMember.findMany({
        where: { userId: parent.id },
        include: { household: true, user: true },
      });
    },
  },

  UserSettings: settingsResolvers.UserSettings,

  Household: {
    createdBy: async (parent: any, _: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.createdById },
      });
    },
    members: async (parent: any, _: any, context: any) => {
      return context.prisma.householdMember.findMany({
        where: { householdId: parent.id },
        include: { user: true, household: true },
      });
    },
    kitchens: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findMany({
        where: { householdId: parent.id },
      });
    },
  },

  HouseholdMember: {
    user: async (parent: any, _: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    household: async (parent: any, _: any, context: any) => {
      return context.prisma.household.findUnique({
        where: { id: parent.householdId },
      });
    },
  },

  Kitchen: {
    household: async (parent: any, _: any, context: any) => {
      return context.prisma.household.findUnique({
        where: { id: parent.householdId },
      });
    },
    inventory: async (parent: any, _: any, context: any) => {
      return context.prisma.inventoryItem.findMany({
        where: { kitchenId: parent.id },
      });
    },
    shopping: async (parent: any, _: any, context: any) => {
      return context.prisma.shoppingList.findMany({
        where: { kitchenId: parent.id },
      });
    },
    expenses: async (parent: any, _: any, context: any) => {
      return context.prisma.expense.findMany({
        where: { kitchenId: parent.id },
      });
    },
    reminders: async (parent: any, _: any, context: any) => {
      return context.prisma.reminder.findMany({
        where: { kitchenId: parent.id },
      });
    },
    logs: async (parent: any, _: any, context: any) => {
      return context.prisma.usageLog.findMany({
        where: { kitchenId: parent.id },
      });
    },
  },

  InventoryItem: {
    kitchen: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findUnique({
        where: { id: parent.kitchenId },
      });
    },
    batches: async (parent: any, _: any, context: any) => {
      return context.prisma.inventoryBatch.findMany({
        where: { itemId: parent.id },
        orderBy: { expiryDate: 'asc' },
      });
    },
    usageLogs: async (parent: any, _: any, context: any) => {
      return context.prisma.usageLog.findMany({
        where: { itemId: parent.id },
        orderBy: { date: 'desc' },
        take: 10,
      });
    },
    totalQuantity: async (parent: any, _: any, context: any) => {
      const batches = await context.prisma.inventoryBatch.findMany({
        where: { 
          itemId: parent.id,
          status: 'ACTIVE',
        },
      });
      return batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
    },
    status: async (parent: any, _: any, context: any) => {
      const batches = await context.prisma.inventoryBatch.findMany({
        where: { 
          itemId: parent.id,
          status: 'ACTIVE',
        },
      });
      
      const totalQuantity = batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
      const threshold = parent.threshold || 1;
      
      // Check for expired items
      const now = new Date();
      const hasExpired = batches.some((batch: any) => 
        batch.expiryDate && batch.expiryDate < now
      );
      
      if (hasExpired) return 'EXPIRED';
      
      // Check for expiring soon (within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const isExpiringSoon = batches.some((batch: any) => 
        batch.expiryDate && batch.expiryDate < threeDaysFromNow
      );
      
      if (isExpiringSoon) return 'EXPIRING';
      
      // Check for low stock
      if (totalQuantity <= threshold) return 'LOW';
      
      return 'OK';
    },
    nextExpiry: async (parent: any, _: any, context: any) => {
      const batch = await context.prisma.inventoryBatch.findFirst({
        where: { 
          itemId: parent.id,
          status: 'ACTIVE',
          expiryDate: { not: null },
        },
        orderBy: { expiryDate: 'asc' },
      });
      return batch?.expiryDate;
    },
  },

  InventoryBatch: {
    item: async (parent: any, _: any, context: any) => {
      return context.prisma.inventoryItem.findUnique({
        where: { id: parent.itemId },
      });
    },
  },

  ShoppingList: {
    kitchen: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findUnique({
        where: { id: parent.kitchenId },
      });
    },
    items: async (parent: any, _: any, context: any) => {
      return context.prisma.shoppingListItem.findMany({
        where: { listId: parent.id },
      });
    },
    totalItems: async (parent: any, _: any, context: any) => {
      return context.prisma.shoppingListItem.count({
        where: { listId: parent.id },
      });
    },
    completedItems: async (parent: any, _: any, context: any) => {
      return context.prisma.shoppingListItem.count({
        where: { 
          listId: parent.id,
          isPurchased: true,
        },
      });
    },
    estimatedTotal: async (parent: any, _: any, context: any) => {
      const items = await context.prisma.shoppingListItem.findMany({
        where: { listId: parent.id },
      });
      return items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
    },
  },

  ShoppingListItem: {
    list: async (parent: any, _: any, context: any) => {
      return context.prisma.shoppingList.findUnique({
        where: { id: parent.listId },
      });
    },
  },

  Expense: {
    kitchen: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findUnique({
        where: { id: parent.kitchenId },
      });
    },
  },

  Reminder: {
    kitchen: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findUnique({
        where: { id: parent.kitchenId },
      });
    },
  },

  UsageLog: {
    kitchen: async (parent: any, _: any, context: any) => {
      return context.prisma.kitchen.findUnique({
        where: { id: parent.kitchenId },
      });
    },
    item: async (parent: any, _: any, context: any) => {
      return context.prisma.inventoryItem.findUnique({
        where: { id: parent.itemId },
      });
    },
  },
};