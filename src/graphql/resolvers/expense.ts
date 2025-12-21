import { Context, requireKitchenAccess } from '../context';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';

export const expenseResolvers: any = {
  Query: {
    expenses: async (_: any, { kitchenId, limit = 50 }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      return context.prisma.expense.findMany({
        where: { kitchenId },
        orderBy: { date: 'desc' },
        take: limit,
      });
    },

    expense: async (_: any, { id }: any, context: Context) => {
      const expense = await context.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      await requireKitchenAccess(context, expense.kitchenId);
      return expense;
    },

    expenseStats: async (_: any, { kitchenId, period }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (period.toLowerCase()) {
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          throw new Error('Invalid period. Use: week, month, or year');
      }

      const expenses = await context.prisma.expense.findMany({
        where: {
          kitchenId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalAmount = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      
      const byType = expenses.reduce((acc: Record<string, number>, expense: any) => {
        acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const byVendor = expenses.reduce((acc: Record<string, number>, expense: any) => {
        const vendor = expense.vendor || 'Unknown';
        acc[vendor] = (acc[vendor] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const avgDaily = totalAmount / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalAmount,
        totalTransactions: expenses.length,
        avgDaily,
        byType,
        byVendor,
        expenses: expenses.slice(0, 10), // Recent 10 for preview
      };
    },
  },

  Mutation: {
    createExpense: async (_: any, { input }: any, context: Context) => {
      const { kitchenId, ...expenseData } = input;
      
      await requireKitchenAccess(context, kitchenId, 'MEMBER');

      return context.prisma.expense.create({
        data: {
          ...expenseData,
          kitchenId,
        },
      });
    },

    updateExpense: async (_: any, { id, amount, notes }: any, context: Context) => {
      const expense = await context.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      await requireKitchenAccess(context, expense.kitchenId, 'MEMBER');

      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (notes !== undefined) updateData.notes = notes;

      return context.prisma.expense.update({
        where: { id },
        data: updateData,
      });
    },

    deleteExpense: async (_: any, { id }: any, context: Context) => {
      const expense = await context.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      await requireKitchenAccess(context, expense.kitchenId, 'MEMBER');

      await context.prisma.expense.delete({
        where: { id },
      });

      return true;
    },
  },
};