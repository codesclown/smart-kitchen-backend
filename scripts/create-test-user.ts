import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      // Hash password
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Create test user
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: hashedPassword,
          phone: '+1234567890',
          location: 'New York, USA',
          emailVerified: true,
        },
      });

      console.log('Created test user:', user);
    } else {
      console.log('Test user already exists:', user);
    }

    // Check if settings exist
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: {
        notifications: true,
        privacy: true,
      },
    });

    if (!userSettings) {
      // Create default settings
      const notifications = await prisma.notificationSettings.create({
        data: {
          lowStock: true,
          expiry: true,
          shopping: false,
          mealPlan: true,
          push: true,
          email: false,
          sms: false,
        },
      });

      const privacy = await prisma.privacySettings.create({
        data: {
          profileVisibility: 'HOUSEHOLD_ONLY',
          dataSharing: false,
          analyticsOptOut: false,
        },
      });

      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          notificationId: notifications.id,
          privacyId: privacy.id,
        },
      });

      console.log('Created user settings');
    }

    // Check if preferences exist
    let userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    if (!userPreferences) {
      userPreferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          theme: 'DARK',
          language: 'en-US',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
        },
      });

      console.log('Created user preferences');
    }

    // Check if household exists
    let household = await prisma.household.findFirst({
      where: { createdById: user.id },
    });

    if (!household) {
      // Create test household
      household = await prisma.household.create({
        data: {
          name: 'My Home Kitchen',
          description: 'Main household kitchen',
          inviteCode: 'HOME123',
          createdById: user.id,
        },
      });

      // Add user as owner
      await prisma.householdMember.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      // Create test kitchens
      await prisma.kitchen.create({
        data: {
          householdId: household.id,
          name: 'Main Kitchen',
          description: 'Primary cooking area',
          type: 'HOME',
        },
      });

      await prisma.kitchen.create({
        data: {
          householdId: household.id,
          name: 'Pantry',
          description: 'Storage area',
          type: 'HOME',
        },
      });

      console.log('Created test household and kitchens');
    }

    console.log('✅ Test setup complete!');
    console.log('Test user credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();