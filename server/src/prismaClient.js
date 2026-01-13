// /server/src/prismaClient.js
import { PrismaClient } from '@prisma/client';

// Enhance database URL with connection pool parameters
const enhanceDatabaseUrl = (url) => {
  if (!url) return url;
  
  // Add connection pool parameters if not already present
  const urlObj = new URL(url);
  
  // Optimized settings for Supabase pooler
  urlObj.searchParams.set('connection_limit', '20');     // Increased for pooler
  urlObj.searchParams.set('pool_timeout', '10');         // Reduced for pooler
  urlObj.searchParams.set('connect_timeout', '5');       // Reduced for pooler
  urlObj.searchParams.set('pgbouncer', 'true');          // Enable pgbouncer mode
  
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
    maxWait: 2000,    // Reduced for pooler
    timeout: 5000,    // Reduced for pooler
    isolationLevel: 'ReadCommitted',
  },
  // Optimized for Supabase pooler
  __internal: {
    engine: {
      connectTimeout: 5000,  // Reduced for pooler
      queryTimeout: 15000,   // Reduced for pooler
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

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;