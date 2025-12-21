import { Context, requireAuth } from '../context';
import { scanImageWithAI, processAIScanResult } from '../../services/ai';

export const aiResolvers: any = {
  Query: {
    aiScans: async (_: any, { limit = 20 }: any, context: Context) => {
      requireAuth(context);
      
      return context.prisma.aIScan.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    },
  },

  Mutation: {
    scanImage: async (_: any, { input }: any, context: Context) => {
      requireAuth(context);
      
      const { imageUrl, scanType } = input;

      try {
        const scanResult = await scanImageWithAI(imageUrl, scanType);

        const aiScan = await context.prisma.aIScan.create({
          data: {
            imageUrl,
            scanType,
            result: scanResult,
            confidence: scanResult.confidence || 0,
            processed: false,
          },
        });

        return aiScan;
      } catch (error) {
        console.error('AI scan failed:', error);
        throw new Error('Failed to scan image. Please try again.');
      }
    },

    processAIScan: async (_: any, { scanId }: any, context: Context) => {
      requireAuth(context);
      
      const scan = await context.prisma.aIScan.findUnique({
        where: { id: scanId },
      });

      if (!scan) {
        throw new Error('AI scan not found');
      }

      if (scan.processed) {
        return scan.result;
      }

      try {
        const processedResult = await processAIScanResult(scan.result, scan.scanType);

        await context.prisma.aIScan.update({
          where: { id: scanId },
          data: {
            result: processedResult,
            processed: true,
          },
        });

        return processedResult;
      } catch (error) {
        console.error('AI scan processing failed:', error);
        throw new Error('Failed to process AI scan result.');
      }
    },
  },
};