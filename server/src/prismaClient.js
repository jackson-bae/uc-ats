// /server/src/prismaClient.js
import { PrismaClient } from '@prisma/client';

// Enhance database URL with connection pool parameters
const enhanceDatabaseUrl = (url) => {
  if (!url) return url;
  
  // Add connection pool parameters if not already present
  const urlObj = new URL(url);
  
  // Set connection pool parameters
  urlObj.searchParams.set('connection_limit', '10');  // Allow up to 10 connections
  urlObj.searchParams.set('pool_timeout', '20');      // 20 second pool timeout
  urlObj.searchParams.set('connect_timeout', '10');   // 10 second connection timeout
  
  return urlObj.toString();
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: enhanceDatabaseUrl(process.env.DATABASE_URL),
    },
  },
  log: ['error', 'warn'],
  transactionOptions: {
    maxWait: 5000,    // Increased to 5s
    timeout: 10000,   // Increased to 10s
    isolationLevel: 'ReadCommitted',
  },
  // Add connection pooling configuration
  __internal: {
    engine: {
      connectTimeout: 10000, // 10 seconds
      queryTimeout: 30000,   // 30 seconds
    }
  }
});

// Enhanced connection handling with retry logic and circuit breaker
let connectionAttempts = 0;
const maxRetries = 3;
let isCircuitOpen = false;
let circuitOpenTime = null;
const circuitTimeout = 30000; // 30 seconds

const connectWithRetry = async () => {
  // Check circuit breaker
  if (isCircuitOpen) {
    if (Date.now() - circuitOpenTime > circuitTimeout) {
      console.log('🔄 Circuit breaker timeout reached, attempting reconnection...');
      isCircuitOpen = false;
      connectionAttempts = 0;
    } else {
      console.log('🚫 Circuit breaker is open, skipping connection attempt');
      return;
    }
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    connectionAttempts = 0; // Reset on successful connection
    isCircuitOpen = false; // Reset circuit breaker
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ Database connection attempt ${connectionAttempts} failed:`, error.message);
    
    if (connectionAttempts < maxRetries) {
      console.log(`🔄 Retrying connection in 5 seconds... (${connectionAttempts}/${maxRetries})`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('❌ Max connection attempts reached. Opening circuit breaker.');
      isCircuitOpen = true;
      circuitOpenTime = Date.now();
    }
  }
};

// Initial connection attempt
connectWithRetry();

// Enhanced middleware for connection error handling with exponential backoff and circuit breaker
prisma.$use(async (params, next) => {
  // Check circuit breaker before attempting query
  if (isCircuitOpen) {
    if (Date.now() - circuitOpenTime > circuitTimeout) {
      console.log('🔄 Circuit breaker timeout reached, attempting query...');
      isCircuitOpen = false;
    } else {
      console.log('🚫 Circuit breaker is open, returning default values');
      // Return appropriate default values based on query type
      if (params.action === 'findMany') return [];
      if (params.action === 'count') return 0;
      if (params.action === 'findFirst' || params.action === 'findUnique') return null;
      return null;
    }
  }

  const maxRetries = 2; // Reduced from 3 to 2
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Set timeout for the query to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000); // Reduced from 15s to 10s
      });
      
      const queryPromise = next(params);
      return await Promise.race([queryPromise, timeoutPromise]);
      
    } catch (error) {
      attempt++;
      
      // Handle connection errors, timeouts, and cached plan errors
      if ((error.code === 'P1001' || error.code === 'P1008' || error.message?.includes('timeout') || error.message?.includes('cached plan must not change result type')) && attempt < maxRetries) {
        const backoffDelay = Math.min(2000 * Math.pow(2, attempt - 1), 8000); // Increased base delay, max 8s
        console.error(`Database error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${backoffDelay}ms...`);
        
        try {
          // For cached plan errors, force a complete reconnection
          if (error.message?.includes('cached plan must not change result type')) {
            console.log('🔄 Cached plan error detected, forcing complete reconnection...');
            await prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            await prisma.$connect();
            console.log('✅ Database reconnected after cached plan error');
          }
          
          // Graceful reconnection attempt without $queryRaw to avoid cascade failures
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          
          // Skip the $queryRaw check to avoid additional connection attempts
          console.log('✅ Database connection retry attempted');
          
          continue; // Retry the operation
        } catch (reconnectError) {
          console.error(`❌ Reconnection attempt ${attempt} failed:`, reconnectError.message);
          if (attempt === maxRetries) {
            // Open circuit breaker on max retries
            isCircuitOpen = true;
            circuitOpenTime = Date.now();
            console.log('🚫 Opening circuit breaker due to repeated failures');
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