import { PrismaClient } from '@prisma/client';
import config from '../src/config.js';

const prisma = new PrismaClient();

async function updateFileUrls() {
  try {
    console.log('Starting file URL update process...');
    console.log('Using base URL:', config.baseUrl);
    
    // Get all applications with file URLs
    const applications = await prisma.application.findMany({
      select: {
        id: true,
        resumeUrl: true,
        blindResumeUrl: true,
        headshotUrl: true,
        coverLetterUrl: true,
        videoUrl: true,
      },
    });

    console.log(`Found ${applications.length} applications to process`);

    let updatedCount = 0;

    for (const app of applications) {
      const updates = {};
      let hasUpdates = false;

      // Update resumeUrl
      if (app.resumeUrl && app.resumeUrl.includes('localhost:3001')) {
        updates.resumeUrl = app.resumeUrl.replace('http://localhost:3001', config.baseUrl);
        hasUpdates = true;
      }

      // Update blindResumeUrl
      if (app.blindResumeUrl && app.blindResumeUrl.includes('localhost:3001')) {
        updates.blindResumeUrl = app.blindResumeUrl.replace('http://localhost:3001', config.baseUrl);
        hasUpdates = true;
      }

      // Update headshotUrl
      if (app.headshotUrl && app.headshotUrl.includes('localhost:3001')) {
        updates.headshotUrl = app.headshotUrl.replace('http://localhost:3001', config.baseUrl);
        hasUpdates = true;
      }

      // Update coverLetterUrl
      if (app.coverLetterUrl && app.coverLetterUrl.includes('localhost:3001')) {
        updates.coverLetterUrl = app.coverLetterUrl.replace('http://localhost:3001', config.baseUrl);
        hasUpdates = true;
      }

      // Update videoUrl
      if (app.videoUrl && app.videoUrl.includes('localhost:3001')) {
        updates.videoUrl = app.videoUrl.replace('http://localhost:3001', config.baseUrl);
        hasUpdates = true;
      }

      if (hasUpdates) {
        await prisma.application.update({
          where: { id: app.id },
          data: updates,
        });
        updatedCount++;
        console.log(`Updated application ${app.id}`);
      }
    }

    console.log(`\nUpdate complete! Updated ${updatedCount} applications.`);
    
  } catch (error) {
    console.error('Error updating file URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateFileUrls();

