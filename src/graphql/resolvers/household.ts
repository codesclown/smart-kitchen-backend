import { Context, requireAuth, requireHouseholdAccess } from '../context';

export const householdResolvers = {
  Query: {
    households: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      
      const memberships = await context.prisma.householdMember.findMany({
        where: { userId: user.id },
        include: { household: true },
      });

      return memberships.map((m: any) => m.household);
    },

    household: async (_: any, { id }: any, context: Context) => {
      await requireHouseholdAccess(context, id);
      
      return context.prisma.household.findUnique({
        where: { id },
      });
    },
  },

  Mutation: {
    createHousehold: async (_: any, { input }: any, context: Context) => {
      const user = requireAuth(context);
      const { name, description } = input;

      // Generate a unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const household = await context.prisma.household.create({
        data: {
          name,
          description,
          inviteCode,
          createdById: user.id,
        },
      });

      // Add creator as owner
      await context.prisma.householdMember.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      return household;
    },

    updateHousehold: async (_: any, { id, input }: any, context: Context) => {
      await requireHouseholdAccess(context, id, 'ADMIN');
      
      return context.prisma.household.update({
        where: { id },
        data: input,
      });
    },

    deleteHousehold: async (_: any, { id }: any, context: Context) => {
      await requireHouseholdAccess(context, id, 'OWNER');
      
      // Delete all related data (cascade should handle this, but being explicit)
      await context.prisma.household.delete({
        where: { id },
      });

      return true;
    },

    inviteMember: async (_: any, { householdId, email, role }: any, context: Context) => {
      await requireHouseholdAccess(context, householdId, 'ADMIN');

      // Find user by email
      const invitedUser = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!invitedUser) {
        throw new Error('User with this email does not exist');
      }

      // Check if already a member
      const existingMember = await context.prisma.householdMember.findFirst({
        where: {
          userId: invitedUser.id,
          householdId,
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this household');
      }

      // Add member
      await context.prisma.householdMember.create({
        data: {
          userId: invitedUser.id,
          householdId,
          role,
        },
      });

      // TODO: Send invitation email

      return true;
    },
  },
};