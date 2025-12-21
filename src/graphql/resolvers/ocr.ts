import { Context, requireAuth } from '../context';
import { OCRService } from '../../services/ocr';
import { StorageService } from '../../services/storage';

export const ocrResolvers: any = {
  Mutation: {
    processReceiptOCR: async (_: any, { imageUrl }: any, context: Context) => {
      requireAuth(context);
      
      try {
        // Download image from URL
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Process with OCR
        const receiptData = await OCRService.processReceipt(buffer);
        
        return {
          success: true,
          data: receiptData,
          message: 'Receipt processed successfully'
        };
      } catch (error) {
        console.error('Receipt OCR processing failed:', error);
        return {
          success: false,
          data: null,
          message: (error as Error).message
        };
      }
    },

    processInventoryItemOCR: async (_: any, { imageUrl }: any, context: Context) => {
      requireAuth(context);
      
      try {
        // Download image from URL
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Process with OCR
        const itemData = await OCRService.processInventoryItem(buffer);
        
        return {
          success: true,
          data: itemData,
          message: 'Item processed successfully'
        };
      } catch (error) {
        console.error('Inventory item OCR processing failed:', error);
        return {
          success: false,
          data: null,
          message: (error as Error).message
        };
      }
    },

    createInventoryFromReceipt: async (_: any, { receiptData, kitchenId }: any, context: Context) => {
      const user = requireAuth(context);
      
      try {
        // Validate kitchen access
        const { requireKitchenAccess } = await import('../context');
        await requireKitchenAccess(context, kitchenId, 'MEMBER');
        
        const createdItems: any[] = [];
        
        // Create inventory items from receipt data
        for (const item of receiptData.items) {
          if (!item.name) continue;
          
          const inventoryItem = await context.prisma.inventoryItem.create({
            data: {
              name: item.name,
              kitchenId,
              category: receiptData.category || 'grocery',
              defaultUnit: item.unit || 'pieces',
              threshold: 1,
              location: 'PANTRY',
            },
          });
          
          // Create initial batch if quantity is available
          if (item.quantity && item.quantity > 0) {
            await context.prisma.inventoryBatch.create({
              data: {
                itemId: inventoryItem.id,
                quantity: item.quantity,
                unit: item.unit || 'pieces',
                purchasePrice: item.price,
                vendor: receiptData.vendor,
                purchaseDate: receiptData.date ? new Date(receiptData.date) : new Date(),
                status: 'ACTIVE',
              },
            });
          }
          
          createdItems.push(inventoryItem);
        }
        
        // Create expense record if total is available
        if (receiptData.total && receiptData.total > 0) {
          await context.prisma.expense.create({
            data: {
              kitchenId,
              amount: receiptData.total,
              type: 'GROCERY',
              vendor: receiptData.vendor || 'Unknown',
              notes: `Receipt import - ${receiptData.items.length} items`,
              date: receiptData.date ? new Date(receiptData.date) : new Date(),
            },
          });
        }
        
        return {
          success: true,
          items: createdItems,
          message: `Created ${createdItems.length} inventory items from receipt`
        };
      } catch (error) {
        console.error('Failed to create inventory from receipt:', error);
        throw new Error('Failed to create inventory items from receipt');
      }
    },
  },
};