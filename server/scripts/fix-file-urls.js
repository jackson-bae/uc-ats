// Script to fix file URLs in the database
// Converts absolute URLs (localhost or production) to relative URLs

import { PrismaClient } from '@prisma/client';

// Use DIRECT_URL to bypass pgbouncer for this migration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const URL_PREFIXES_TO_REMOVE = [
  'http://localhost:3001',
  'http://localhost:5173',
  'https://uconsultingats.com',
  'https://www.uconsultingats.com',
];

async function fixFileUrls() {
  console.log('Starting URL migration...\n');

  // Fix Application URLs
  const applications = await prisma.application.findMany({
    where: {
      OR: [
        { resumeUrl: { startsWith: 'http' } },
        { coverLetterUrl: { startsWith: 'http' } },
        { videoUrl: { startsWith: 'http' } },
        { headshotUrl: { startsWith: 'http' } },
      ]
    },
    select: {
      id: true,
      resumeUrl: true,
      coverLetterUrl: true,
      videoUrl: true,
      headshotUrl: true,
    }
  });

  console.log(`Found ${applications.length} applications with absolute URLs to fix\n`);

  let updatedCount = 0;

  for (const app of applications) {
    const updates = {};

    if (app.resumeUrl) {
      const fixed = fixUrl(app.resumeUrl);
      if (fixed !== app.resumeUrl) updates.resumeUrl = fixed;
    }
    if (app.coverLetterUrl) {
      const fixed = fixUrl(app.coverLetterUrl);
      if (fixed !== app.coverLetterUrl) updates.coverLetterUrl = fixed;
    }
    if (app.videoUrl) {
      const fixed = fixUrl(app.videoUrl);
      if (fixed !== app.videoUrl) updates.videoUrl = fixed;
    }
    if (app.headshotUrl) {
      const fixed = fixUrl(app.headshotUrl);
      if (fixed !== app.headshotUrl) updates.headshotUrl = fixed;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.application.update({
        where: { id: app.id },
        data: updates
      });
      updatedCount++;
      console.log(`Updated application ${app.id}`);
    }
  }

  console.log(`\nUpdated ${updatedCount} applications`);
  console.log('\nURL migration complete!');
}

function fixUrl(url) {
  if (!url) return url;

  for (const prefix of URL_PREFIXES_TO_REMOVE) {
    if (url.startsWith(prefix)) {
      return url.replace(prefix, '');
    }
  }

  return url;
}

fixFileUrls()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
