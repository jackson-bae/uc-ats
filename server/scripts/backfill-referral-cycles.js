#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function backfillReferralCycles() {
  console.log('Starting referral cycle backfill...\n');

  // Get all referrals without a cycleId
  const referralsWithoutCycle = await prisma.referral.findMany({
    where: { cycleId: null },
    include: {
      candidate: {
        include: {
          applications: {
            orderBy: { submittedAt: 'desc' },
            select: { cycleId: true, submittedAt: true }
          }
        }
      }
    }
  });

  console.log(`Found ${referralsWithoutCycle.length} referrals without cycleId\n`);

  if (referralsWithoutCycle.length === 0) {
    console.log('No referrals need backfilling.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const referral of referralsWithoutCycle) {
    // Find the application that was active when the referral was created
    // by looking for applications submitted before or around the referral creation time
    const candidateApplications = referral.candidate.applications;

    if (candidateApplications.length === 0) {
      console.log(`Skipping referral ${referral.id} - candidate has no applications`);
      skipped++;
      continue;
    }

    // Find the most recent application submitted before or at the referral creation time
    // If referral was created after all applications, use the most recent one
    let matchingApplication = candidateApplications.find(
      app => app.submittedAt <= referral.createdAt
    );

    // If no application was submitted before the referral, use the earliest application
    // (the referral might have been created before the application was synced)
    if (!matchingApplication) {
      matchingApplication = candidateApplications[candidateApplications.length - 1];
    }

    if (!matchingApplication || !matchingApplication.cycleId) {
      console.log(`Skipping referral ${referral.id} - no matching application with cycleId found`);
      skipped++;
      continue;
    }

    // Update the referral with the cycleId
    await prisma.referral.update({
      where: { id: referral.id },
      data: { cycleId: matchingApplication.cycleId }
    });

    console.log(`Updated referral ${referral.id} -> cycleId: ${matchingApplication.cycleId}`);
    updated++;
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

async function main() {
  try {
    await backfillReferralCycles();
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
