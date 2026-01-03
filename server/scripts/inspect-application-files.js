import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectApplicationFiles(applicationId) {
  try {
    console.log(`Inspecting application: ${applicationId}\n`);
    
    // Get the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        responseID: true,
        email: true,
        firstName: true,
        lastName: true,
        resumeUrl: true,
        blindResumeUrl: true,
        headshotUrl: true,
        coverLetterUrl: true,
        videoUrl: true,
        rawResponses: true
      }
    });

    if (!application) {
      console.error(`Application ${applicationId} not found`);
      return;
    }

    console.log('Application Details:');
    console.log(`  Name: ${application.firstName} ${application.lastName}`);
    console.log(`  Email: ${application.email}`);
    console.log(`  Response ID: ${application.responseID}\n`);

    console.log('File URLs:');
    console.log(`  Resume: ${application.resumeUrl || 'N/A'}`);
    console.log(`  Blind Resume: ${application.blindResumeUrl || 'N/A'}`);
    console.log(`  Headshot: ${application.headshotUrl || 'N/A'}`);
    console.log(`  Cover Letter: ${application.coverLetterUrl || 'N/A'}`);
    console.log(`  Video: ${application.videoUrl || 'N/A'}\n`);

    // Extract file IDs from URLs
    console.log('Extracted File IDs:');
    const extractFileId = (url) => {
      if (!url) return null;
      // URL format: /api/files/{fileId}/pdf or /api/files/{fileId}/image
      const match = url.match(/\/api\/files\/([^\/]+)\/(pdf|image)/);
      return match ? match[1] : null;
    };

    const resumeFileId = extractFileId(application.resumeUrl);
    const blindResumeFileId = extractFileId(application.blindResumeUrl);
    const headshotFileId = extractFileId(application.headshotUrl);
    const coverLetterFileId = extractFileId(application.coverLetterUrl);
    const videoFileId = extractFileId(application.videoUrl);

    console.log(`  Resume File ID: ${resumeFileId || 'N/A'}`);
    console.log(`  Blind Resume File ID: ${blindResumeFileId || 'N/A'}`);
    console.log(`  Headshot File ID: ${headshotFileId || 'N/A'}`);
    console.log(`  Cover Letter File ID: ${coverLetterFileId || 'N/A'}`);
    console.log(`  Video File ID: ${videoFileId || 'N/A'}\n`);

    // Check raw responses for file upload data
    if (application.rawResponses) {
      console.log('Raw Response File Upload Data:');
      const rawResponses = typeof application.rawResponses === 'string' 
        ? JSON.parse(application.rawResponses) 
        : application.rawResponses;

      for (const [questionId, answerData] of Object.entries(rawResponses)) {
        if (answerData?.fileUploadAnswers?.answers) {
          console.log(`\n  Question ID: ${questionId}`);
          answerData.fileUploadAnswers.answers.forEach((answer, index) => {
            console.log(`    Answer ${index + 1}:`, JSON.stringify(answer, null, 2));
          });
        }
      }
    }

  } catch (error) {
    console.error('Error inspecting application:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get application ID from command line argument
const applicationId = process.argv[2];

if (!applicationId) {
  console.error('Usage: node inspect-application-files.js <application-id>');
  process.exit(1);
}

inspectApplicationFiles(applicationId);


