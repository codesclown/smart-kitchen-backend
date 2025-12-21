import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { AuthErrors, ResourceErrors } from '../utils/errors';

export interface Context {
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
  };
  request: FastifyRequest;
  reply: FastifyReply;
}

export async function createContext(request: FastifyRequest, reply: FastifyReply): Promise<Context> {
  let user;

  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this') as any;
      
      if (decoded && decoded.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true }
        });
        
        if (dbUser) {
          user = dbUser;
        }
      }
    }
  } catch (error) {
    // Invalid token, continue without user
    console.log('Invalid token:', error);
  }

  return {
    prisma,
    user,
    request,
    reply,
  };
}

export function requireAuth(context: Context) {
  if (!context.user) {
    throw AuthErrors.unauthorized();
  }
  return context.user;
}

export async function requireHouseholdAccess(
  context: Context, 
  householdId: string, 
  minRole: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER' = 'VIEWER'
) {
  const user = requireAuth(context);
  
  const membership = await context.prisma.householdMember.findFirst({
    where: {
      userId: user.id,
      householdId,
    },
  });

  if (!membership) {
    throw ResourceErrors.permissionDenied('household access');
  }

  const roleHierarchy: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };
  if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
    throw ResourceErrors.permissionDenied(`${minRole} role access`);
  }

  return membership;
}

export async function requireKitchenAccess(
  context: Context, 
  kitchenId: string, 
  minRole: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER' = 'VIEWER'
) {
  const kitchen = await context.prisma.kitchen.findUnique({
    where: { id: kitchenId },
    select: { householdId: true },
  });

  if (!kitchen) {
    throw ResourceErrors.resourceNotFound('Kitchen');
  }

  return requireHouseholdAccess(context, kitchen.householdId, minRole);
}