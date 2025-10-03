import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function updateUrlsDirect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Starting URL update process...');
    
    // Update resumeUrl
    console.log('Updating resumeUrl...');
    const resumeResult = await client.query(`
      UPDATE applications 
      SET "resumeUrl" = REPLACE("resumeUrl", 'http://localhost:3001', 'https://uconsultingats.com')
      WHERE "resumeUrl" LIKE '%localhost:3001%'
    `);
    console.log(`Updated ${resumeResult.rowCount} resume URLs`);

    // Update blindResumeUrl
    console.log('Updating blindResumeUrl...');
    const blindResumeResult = await client.query(`
      UPDATE applications 
      SET "blindResumeUrl" = REPLACE("blindResumeUrl", 'http://localhost:3001', 'https://uconsultingats.com')
      WHERE "blindResumeUrl" LIKE '%localhost:3001%'
    `);
    console.log(`Updated ${blindResumeResult.rowCount} blind resume URLs`);

    // Update headshotUrl
    console.log('Updating headshotUrl...');
    const headshotResult = await client.query(`
      UPDATE applications 
      SET "headshotUrl" = REPLACE("headshotUrl", 'http://localhost:3001', 'https://uconsultingats.com')
      WHERE "headshotUrl" LIKE '%localhost:3001%'
    `);
    console.log(`Updated ${headshotResult.rowCount} headshot URLs`);

    // Update coverLetterUrl
    console.log('Updating coverLetterUrl...');
    const coverLetterResult = await client.query(`
      UPDATE applications 
      SET "coverLetterUrl" = REPLACE("coverLetterUrl", 'http://localhost:3001', 'https://uconsultingats.com')
      WHERE "coverLetterUrl" LIKE '%localhost:3001%'
    `);
    console.log(`Updated ${coverLetterResult.rowCount} cover letter URLs`);

    // Update videoUrl
    console.log('Updating videoUrl...');
    const videoResult = await client.query(`
      UPDATE applications 
      SET "videoUrl" = REPLACE("videoUrl", 'http://localhost:3001', 'https://uconsultingats.com')
      WHERE "videoUrl" LIKE '%localhost:3001%'
    `);
    console.log(`Updated ${videoResult.rowCount} video URLs`);

    const totalUpdated = resumeResult.rowCount + blindResumeResult.rowCount + headshotResult.rowCount + coverLetterResult.rowCount + videoResult.rowCount;
    console.log(`\nUpdate complete! Total URLs updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Error updating URLs:', error);
  } finally {
    await client.end();
  }
}

// Run the update
updateUrlsDirect();
