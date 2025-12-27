import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTestToken() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      console.error('Test user not found');
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Test user token:');
    console.log(token);
    console.log('\nUser ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);

  } catch (error) {
    console.error('Error generating token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestToken();