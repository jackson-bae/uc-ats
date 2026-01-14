#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function checkGenderData() {
  console.log('Checking gender data in applications...\n');

  // Get the active cycle
  const activeCycle = await prisma.recruitingCycle.findFirst({
    where: { isActive: true }
  });

  console.log('Active cycle:', activeCycle?.name || 'None');

  // Get all applications with their gender field
  const applications = await prisma.application.findMany({
    where: activeCycle ? { cycleId: activeCycle.id } : {},
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      cycleId: true
    },
    take: 50
  });

  console.log(`\nFound ${applications.length} applications\n`);

  // Count gender values
  const genderCounts = {};
  applications.forEach(app => {
    const gender = app.gender || 'NULL';
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;
  });

  console.log('Gender breakdown:');
  Object.entries(genderCounts).forEach(([gender, count]) => {
    console.log(`  ${gender}: ${count}`);
  });

  // Show sample of applications with gender
  console.log('\nSample applications:');
  applications.slice(0, 10).forEach(app => {
    console.log(`  ${app.firstName} ${app.lastName}: ${app.gender || 'NULL'}`);
  });

  await prisma.$disconnect();
}

checkGenderData().catch(console.error);
