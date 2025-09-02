// /server/src/prismaClient.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
  transactionOptions: {
    maxWait: 5000,    // Maximum time to wait for a connection (5s)
    timeout: 10000,   // Maximum time for a transaction (10s)
    isolationLevel: 'ReadCommitted',
  },
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

// Enhanced middleware for connection error handling with exponential backoff
prisma.$use(async (params, next) => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Set timeout for the query to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000);
      });
      
      const queryPromise = next(params);
      return await Promise.race([queryPromise, timeoutPromise]);
      
    } catch (error) {
      attempt++;
      
      // Handle connection errors and timeouts
      if ((error.code === 'P1001' || error.code === 'P1008' || error.message?.includes('timeout')) && attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.error(`Database error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${backoffDelay}ms...`);
        
        try {
          // Graceful reconnection attempt
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          
          // Check if we can connect
          await prisma.$queryRaw`SELECT 1`;
          console.log('✅ Database connection restored');
          
          continue; // Retry the operation
        } catch (reconnectError) {
          console.error(`❌ Reconnection attempt ${attempt} failed:`, reconnectError.message);
          if (attempt === maxRetries) {
            throw error; // Throw the original error after max retries
          }
        }
      } else {
        throw error; // Throw immediately for non-connection errors or after max retries
      }
    }
  }
});

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;