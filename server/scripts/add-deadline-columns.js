import prisma from '../src/prismaClient.js';

async function addDeadlineColumns() {
  try {
    console.log('Adding deadline columns to recruiting_cycles table...');
    
    await prisma.$executeRaw`
      ALTER TABLE recruiting_cycles 
      ADD COLUMN IF NOT EXISTS "resumeDeadline" TEXT,
      ADD COLUMN IF NOT EXISTS "coverLetterDeadline" TEXT,
      ADD COLUMN IF NOT EXISTS "videoDeadline" TEXT;
    `;
    
    console.log('Successfully added deadline columns!');
  } catch (error) {
    console.error('Error adding deadline columns:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDeadlineColumns();

