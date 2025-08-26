// /server/src/prismaClient.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection management with retry logic
  log: ['error', 'warn'],
});

// Enhanced connection handling with retry logic
let connectionAttempts = 0;
const maxRetries = 3;

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    connectionAttempts = 0; // Reset on successful connection
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ Database connection attempt ${connectionAttempts} failed:`, error.message);
    
    if (connectionAttempts < maxRetries) {
      console.log(`🔄 Retrying connection in 5 seconds... (${connectionAttempts}/${maxRetries})`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('❌ Max connection attempts reached. Please check your Supabase project status.');
    }
  }
};

// Initial connection attempt
connectWithRetry();

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;