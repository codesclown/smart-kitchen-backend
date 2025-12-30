import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../.env') });

import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createContext, Context } from './graphql/context';
import { prisma } from './lib/prisma';
import { OCRService } from './services/ocr';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Register security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  await fastify.register(rateLimit, {
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    timeWindow: '15 minutes',
    errorResponseBuilder: function (request, context) {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        date: Date.now(),
        expiresIn: Math.round(context.ttl / 1000),
      };
    },
  });

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || 'https://your-domain.com').split(',')
      : true,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Create Apollo Server
  const apollo = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [fastifyApolloDrainPlugin(fastify)],
    formatError: (err) => {
      console.error('GraphQL Error:', err);
      return {
        message: err.message,
        extensions: {
          code: err.extensions?.code,
          userMessage: err.extensions?.userMessage,
          field: err.extensions?.field,
          statusCode: err.extensions?.statusCode,
        },
        path: err.path,
      };
    },
  });

  await apollo.start();

  // Register GraphQL endpoint
  await fastify.register(async function (fastify) {
    await fastify.register(rateLimit, {
      max: process.env.NODE_ENV === 'production' ? 50 : 1000,
      timeWindow: '15 minutes',
      keyGenerator: function (request) {
        const authHeader = request.headers.authorization;
        let userId = 'anonymous';
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            const decoded = fastify.jwt.verify(token) as any;
            userId = decoded.userId || 'anonymous';
          } catch (error) {
            // Invalid token, use IP only
          }
        }
        
        return `${request.ip}-${userId}`;
      },
      errorResponseBuilder: function (request, context) {
        return {
          errors: [{
            message: 'Rate limit exceeded for GraphQL requests',
            extensions: {
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.round(context.ttl / 1000),
            },
          }],
        };
      },
    });

    await fastify.register(fastifyApollo(apollo), {
      context: createContext,
    });
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: '1.0.0'
      };
    } catch (error) {
      fastify.log.error('Health check failed: ' + (error as Error).message);
      throw new Error('Database connection failed');
    }
  });

  // OCR Inventory endpoint
  fastify.post('/ocr/inventory', async (request, reply) => {
    try {
      // Check if file was uploaded
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No image file provided',
          statusCode: 400
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          statusCode: 400
        });
      }

      // Convert file to buffer
      const buffer = await data.toBuffer();

      // Validate file size (max 10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'File size too large. Maximum size is 10MB.',
          statusCode: 400
        });
      }

      // Process the image with OCR
      const result = await OCRService.processInventoryItem(buffer);

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Image processed successfully'
      });

    } catch (error) {
      fastify.log.error('OCR processing error: ' + (error instanceof Error ? error.message : String(error)));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500
      });
    }
  });

  // OCR Receipt endpoint
  fastify.post('/ocr/receipt', async (request, reply) => {
    try {
      // Check if file was uploaded
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No image file provided',
          statusCode: 400
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          statusCode: 400
        });
      }

      // Convert file to buffer
      const buffer = await data.toBuffer();

      // Validate file size (max 10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'File size too large. Maximum size is 10MB.',
          statusCode: 400
        });
      }

      // Process the receipt with OCR
      const result = await OCRService.processReceipt(buffer);

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Receipt processed successfully'
      });

    } catch (error) {
      fastify.log.error('OCR receipt processing error: ' + (error instanceof Error ? error.message : String(error)));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500
      });
    }
  });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server ready at http://${HOST}:${PORT}/graphql`);
    console.log(`📊 Health check at http://${HOST}:${PORT}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});