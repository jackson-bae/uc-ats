import { PrismaClient } from '@prisma/client';
import config from '../src/config.js';

const prisma = new PrismaClient();

async function testFileAccess() {
  try {
    console.log('Testing file access configuration...');
    console.log('Base URL:', config.baseUrl);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    // Get a sample application with file URLs
    const sampleApp = await prisma.application.findFirst({
      select: {
        id: true,
        resumeUrl: true,
        blindResumeUrl: true,
        headshotUrl: true,
        coverLetterUrl: true,
        videoUrl: true,
      },
    });

    if (!sampleApp) {
      console.log('No applications with file URLs found.');
      return;
    }

    console.log('\nSample application file URLs:');
    console.log('Application ID:', sampleApp.id);
    console.log('Resume URL:', sampleApp.resumeUrl);
    console.log('Blind Resume URL:', sampleApp.blindResumeUrl);
    console.log('Headshot URL:', sampleApp.headshotUrl);
    console.log('Cover Letter URL:', sampleApp.coverLetterUrl);
    console.log('Video URL:', sampleApp.videoUrl);

    // Check if URLs are using the correct base URL
    const urls = [sampleApp.resumeUrl, sampleApp.blindResumeUrl, sampleApp.headshotUrl, sampleApp.coverLetterUrl, sampleApp.videoUrl];
    const localhostUrls = urls.filter(url => url && url.includes('localhost:3001'));
    
    if (localhostUrls.length > 0) {
      console.log('\n⚠️  WARNING: Found URLs still using localhost:3001:');
      localhostUrls.forEach(url => console.log('  -', url));
      console.log('\nRun the update script to fix these URLs:');
      console.log('  node scripts/update-file-urls.js');
    } else {
      console.log('\n✅ All file URLs are using the correct base URL');
    }

    // Test if we can construct a proper file URL
    if (sampleApp.resumeUrl) {
      const fileId = sampleApp.resumeUrl.split('/').slice(-2, -1)[0]; // Extract file ID
      const testUrl = `${config.baseUrl}/api/files/${fileId}/pdf`;
      console.log('\nTest file URL construction:');
      console.log('File ID:', fileId);
      console.log('Constructed URL:', testUrl);
    }

  } catch (error) {
    console.error('Error testing file access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFileAccess();
