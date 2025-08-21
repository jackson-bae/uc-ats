import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        fullName: 'Test User',
        graduationClass: '2026',
        studentId: 123456789, // 9-digit student ID
        role: 'USER'
      }
    });

    console.log('Created test user:', user.email);
    console.log('Student ID:', user.studentId);
    console.log('Password: password123');

    // Also create a corresponding candidate record
    const candidate = await prisma.candidate.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        studentId: 123456789,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }
    });

    console.log('Created corresponding candidate record');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestUser();
