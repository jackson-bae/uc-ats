#!/usr/bin/env node

/**
 * Test script to compare database performance with and without pooler
 * Run this to verify your pooler configuration is working
 */

import prisma from '../src/prismaClient.js';
import { performance } from 'perf_hooks';

async function testQueryPerformance(queryName, queryFn, iterations = 10) {
  console.log(`\n🧪 Testing ${queryName}...`);
  
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await queryFn();
      const end = performance.now();
      times.push(end - start);
    } catch (error) {
      console.error(`❌ Query failed on iteration ${i + 1}:`, error.message);
      return null;
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  console.log(`✅ ${queryName} Results:`);
  console.log(`   Average: ${avgTime.toFixed(2)}ms`);
  console.log(`   Min: ${minTime.toFixed(2)}ms`);
  console.log(`   Max: ${maxTime.toFixed(2)}ms`);
  
  return { avgTime, minTime, maxTime, times };
}

async function testConnectionPool() {
  console.log('🚀 Testing Database Connection Pool Performance\n');
  
  // Test 1: Simple count query
  const countResult = await testQueryPerformance(
    'User Count Query',
    () => prisma.user.count(),
    5
  );
  
  // Test 2: Complex join query
  const joinResult = await testQueryPerformance(
    'Complex Join Query (Users with Applications)',
    () => prisma.user.findMany({
      take: 10,
      include: {
        comments: true,
        evaluations: true
      }
    }),
    5
  );
  
  // Test 3: Concurrent queries (simulate real load)
  console.log('\n🔄 Testing Concurrent Query Performance...');
  const concurrentStart = performance.now();
  
  const concurrentPromises = Array.from({ length: 20 }, (_, i) => 
    prisma.user.findFirst({
      where: { id: { not: undefined } },
      select: { id: true, email: true }
    })
  );
  
  try {
    await Promise.all(concurrentPromises);
    const concurrentEnd = performance.now();
    const concurrentTime = concurrentEnd - concurrentStart;
    
    console.log(`✅ Concurrent Queries (20 parallel): ${concurrentTime.toFixed(2)}ms`);
    console.log(`   Average per query: ${(concurrentTime / 20).toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ Concurrent queries failed:', error.message);
  }
  
  // Test 4: Connection pool status
  console.log('\n📊 Connection Pool Status:');
  try {
    const poolStatus = await prisma.$queryRaw`
      SELECT 
        state,
        COUNT(*) as count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state;
    `;
    console.log('   Active connections:', poolStatus);
  } catch (error) {
    console.log('   Could not fetch pool status (this is normal for some configurations)');
  }
  
  // Summary
  console.log('\n📈 Performance Summary:');
  if (countResult) {
    console.log(`   Simple queries: ${countResult.avgTime.toFixed(2)}ms average`);
  }
  if (joinResult) {
    console.log(`   Complex queries: ${joinResult.avgTime.toFixed(2)}ms average`);
  }
  
  console.log('\n💡 Tips:');
  console.log('   - If you see significant improvements, your pooler is working!');
  console.log('   - Times under 50ms for simple queries are excellent');
  console.log('   - Times under 200ms for complex queries are good');
  console.log('   - If times are still high, check your DATABASE_URL is using port 6543');
}

async function main() {
  try {
    await testConnectionPool();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
