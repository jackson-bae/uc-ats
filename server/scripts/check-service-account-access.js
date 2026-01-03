import { getGoogleAuthClient } from '../src/services/google/auth.js';
import { getFileMetadata } from '../src/services/google/drive.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServiceAccountAccess() {
  try {
    console.log('Checking service account configuration...\n');
    
    // Get service account email
    const authClient = await getGoogleAuthClient();
    const credentials = await authClient.getCredentials();
    const serviceAccountEmail = credentials.client_email;
    
    console.log(`Service Account Email: ${serviceAccountEmail}\n`);
    console.log('⚠️  IMPORTANT: This service account needs access to the files in Google Drive.\n');
    
    // Get a sample application with file URLs
    const sampleApp = await prisma.application.findFirst({
      where: {
        OR: [
          { resumeUrl: { not: null } },
          { headshotUrl: { not: null } },
          { coverLetterUrl: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        resumeUrl: true,
        headshotUrl: true,
        coverLetterUrl: true
      }
    });
    
    if (!sampleApp) {
      console.log('No applications with files found in database.');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`Testing file access for application: ${sampleApp.firstName} ${sampleApp.lastName} (${sampleApp.email})\n`);
    
    // Extract and test file IDs
    const extractFileId = (url) => {
      if (!url) return null;
      const match = url.match(/\/api\/files\/([^\/]+)\/(pdf|image)/);
      return match ? match[1] : null;
    };
    
    const filesToTest = [
      { name: 'Resume', url: sampleApp.resumeUrl },
      { name: 'Headshot', url: sampleApp.headshotUrl },
      { name: 'Cover Letter', url: sampleApp.coverLetterUrl }
    ].filter(f => f.url);
    
    let accessibleCount = 0;
    let inaccessibleCount = 0;
    
    for (const file of filesToTest) {
      const fileId = extractFileId(file.url);
      if (!fileId) continue;
      
      console.log(`Testing ${file.name} (File ID: ${fileId})...`);
      try {
        const metadata = await getFileMetadata(fileId);
        console.log(`  ✓ Accessible: ${metadata.name || 'Unknown'}`);
        accessibleCount++;
      } catch (error) {
        console.log(`  ✗ Not accessible: ${error.message}`);
        inaccessibleCount++;
      }
    }
    
    console.log(`\nResults: ${accessibleCount} accessible, ${inaccessibleCount} inaccessible\n`);
    
    if (inaccessibleCount > 0) {
      console.log('🔧 SOLUTION:');
      console.log('The service account needs access to the files. Here are the steps:\n');
      console.log('1. Find the Google Drive folder where form uploads are stored');
      console.log('   (Usually in the form owner\'s Google Drive)');
      console.log('2. Share that folder with the service account:');
      console.log(`   ${serviceAccountEmail}`);
      console.log('3. Grant "Viewer" or "Editor" permissions');
      console.log('4. If files are in a Shared Drive, add the service account as a member\n');
      console.log('Alternatively, if you have domain-wide delegation:');
      console.log('- Enable domain-wide delegation in Google Workspace Admin');
      console.log('- The service account can then access files on behalf of users\n');
    } else {
      console.log('✓ All files are accessible!\n');
    }
    
  } catch (error) {
    console.error('Error checking service account access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceAccountAccess();


