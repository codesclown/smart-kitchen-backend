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

    priceTrends: async (_: any, { kitchenId, days = 30 }: any, context: Context) => {
      await requireKitchenAccess(context, kitchenId);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get expenses with items data for the period
      const expenses = await context.prisma.expense.findMany({
        where: {
          kitchenId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          items: {
            not: { equals: null },
          },
        },
        orderBy: { date: 'asc' },
      });

      // Process expenses to extract item prices over time
      const itemPrices: Record<string, Array<{ date: string; price: number }>> = {};
      
      expenses.forEach((expense: any) => {
        if (expense.items && Array.isArray(expense.items)) {
          const dateStr = expense.date.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          expense.items.forEach((item: any) => {
            if (item.name && item.price && item.quantity) {
              const itemName = item.name.toLowerCase();
              const unitPrice = item.price / item.quantity;
              
              // Group similar items (milk, rice, etc.)
              let category = 'other';
              if (itemName.includes('milk')) category = 'milk';
              else if (itemName.includes('rice')) category = 'rice';
              else if (itemName.includes('wheat') || itemName.includes('flour')) category = 'wheat';
              else if (itemName.includes('oil')) category = 'oil';
              else if (itemName.includes('sugar')) category = 'sugar';
              
              if (!itemPrices[category]) {
                itemPrices[category] = [];
              }
              
              itemPrices[category].push({
                date: dateStr,
                price: unitPrice,
              });
            }
          });
        }
      });

      // Calculate average prices by date for each category
      const trendData: Record<string, Array<{ date: string; avgPrice: number }>> = {};
      
      Object.keys(itemPrices).forEach(category => {
        const pricesByDate: Record<string, number[]> = {};
        
        itemPrices[category].forEach(({ date, price }) => {
          if (!pricesByDate[date]) {
            pricesByDate[date] = [];
          }
          pricesByDate[date].push(price);
        });
        
        trendData[category] = Object.keys(pricesByDate)
          .sort()
          .map(date => ({
            date,
            avgPrice: pricesByDate[date].reduce((sum, price) => sum + price, 0) / pricesByDate[date].length,
          }));
      });

      return trendData;
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