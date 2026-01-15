import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import config from '../src/config.js';

dotenv.config();

// Use DIRECT_URL for scripts to avoid prepared statement issues with connection poolers
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

/**
 * Replaces localhost URLs with the base URL
 * Handles various localhost formats:
 * - http://localhost:3001/path
 * - https://localhost:3001/path
 * - http://localhost/path
 * - https://localhost/path
 * - localhost:3001/path (no protocol)
 * - localhost/path (no protocol)
 */
function replaceLocalhostUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Match any localhost URL (with or without protocol, with or without port)
  const localhostPattern = /^(https?:\/\/)?localhost(:\d+)?/i;
  
  if (localhostPattern.test(url)) {
    let pathAndQuery = '';
    
    // Try to parse as URL (works if protocol is present)
    try {
      const urlObj = new URL(url);
      pathAndQuery = urlObj.pathname + urlObj.search + urlObj.hash;
    } catch (e) {
      // If URL parsing fails (no protocol), extract path manually
      // Match: localhost:port/path or localhost/path
      const match = url.match(/^localhost(:\d+)?(\/.*)?$/i);
      if (match && match[2]) {
        // match[2] contains the path (including leading slash)
        pathAndQuery = match[2];
      } else if (match) {
        // Just localhost or localhost:port with no path
        pathAndQuery = '/';
      } else {
        // If we can't parse it, return as-is
        return url;
      }
    }
    
    // Construct new URL with base URL
    const baseUrlObj = new URL(baseUrl);
    return baseUrlObj.origin + pathAndQuery;
  }
  
  return url;
}

async function updateLocalhostUrls() {
  console.log('Starting localhost URL update process...');
  console.log(`Base URL: ${config.baseUrl}`);
  
  try {
    // Find all applications with at least one URL field containing localhost
    // Using contains to catch URLs with or without protocol
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { resumeUrl: { contains: 'localhost' } },
          { blindResumeUrl: { contains: 'localhost' } },
          { headshotUrl: { contains: 'localhost' } },
          { coverLetterUrl: { contains: 'localhost' } },
          { videoUrl: { contains: 'localhost' } },
        ],
      },
      select: {
        id: true,
        resumeUrl: true,
        blindResumeUrl: true,
        headshotUrl: true,
        coverLetterUrl: true,
        videoUrl: true,
      },
    });

    console.log(`Found ${applications.length} applications with localhost URLs`);

    if (applications.length === 0) {
      console.log('No applications with localhost URLs found. Nothing to update.');
      return;
    }

    let totalUpdated = 0;
    let fieldsUpdated = 0;

    // Update each application
    for (const app of applications) {
      const updateData = {};
      let hasChanges = false;

      // Check and update each URL field
      // Check if URL contains localhost (with or without protocol)
      const localhostRegex = /localhost/i;
      
      if (app.resumeUrl && localhostRegex.test(app.resumeUrl)) {
        const newUrl = replaceLocalhostUrl(app.resumeUrl, config.baseUrl);
        if (newUrl !== app.resumeUrl) {
          updateData.resumeUrl = newUrl;
          hasChanges = true;
          fieldsUpdated++;
        }
      }

      if (app.blindResumeUrl && localhostRegex.test(app.blindResumeUrl)) {
        const newUrl = replaceLocalhostUrl(app.blindResumeUrl, config.baseUrl);
        if (newUrl !== app.blindResumeUrl) {
          updateData.blindResumeUrl = newUrl;
          hasChanges = true;
          fieldsUpdated++;
        }
      }

      if (app.headshotUrl && localhostRegex.test(app.headshotUrl)) {
        const newUrl = replaceLocalhostUrl(app.headshotUrl, config.baseUrl);
        if (newUrl !== app.headshotUrl) {
          updateData.headshotUrl = newUrl;
          hasChanges = true;
          fieldsUpdated++;
        }
      }

      if (app.coverLetterUrl && localhostRegex.test(app.coverLetterUrl)) {
        const newUrl = replaceLocalhostUrl(app.coverLetterUrl, config.baseUrl);
        if (newUrl !== app.coverLetterUrl) {
          updateData.coverLetterUrl = newUrl;
          hasChanges = true;
          fieldsUpdated++;
        }
      }

      if (app.videoUrl && localhostRegex.test(app.videoUrl)) {
        const newUrl = replaceLocalhostUrl(app.videoUrl, config.baseUrl);
        if (newUrl !== app.videoUrl) {
          updateData.videoUrl = newUrl;
          hasChanges = true;
          fieldsUpdated++;
        }
      }

      if (hasChanges) {
        await prisma.application.update({
          where: { id: app.id },
          data: updateData,
        });
        totalUpdated++;
        
        if (totalUpdated % 10 === 0) {
          console.log(`Updated ${totalUpdated} applications...`);
        }
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Applications processed: ${applications.length}`);
    console.log(`Applications updated: ${totalUpdated}`);
    console.log(`Total URL fields updated: ${fieldsUpdated}`);
    console.log('Update completed successfully!');

  } catch (error) {
    console.error('Error updating URLs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateLocalhostUrls()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { updateLocalhostUrls, replaceLocalhostUrl };

