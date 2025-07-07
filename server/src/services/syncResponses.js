import prisma from '../prismaClient.js'; 
import config from '../config.js';
import { getResponses } from './google/forms.js'
import { transformFormResponse } from '../utils/dataMapper.js'

export default async function syncFormResponses() {
  try {
    console.log('Fetching new responses from Google Forms...');
    const responses = await getResponses(config.form.id)
    
    // Get existing response IDs
    const existingResponseIds = new Set(
      (await prisma.application.findMany({
        select: { responseID: true }
      })).map(r => r.responseID)
    )
    
    // Filter out responses that are already in the database
    const newResponses = responses.filter(response => !existingResponseIds.has(response.responseId))
    
    console.log(`Found ${newResponses.length} new responses to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const response of newResponses) {
      try {
        const dbRecord = transformFormResponse(response);
        
        await prisma.application.create({data: dbRecord});
        successCount++;

      } catch (error) {
        console.error(`Error processing response ${response.responseId}`);
        errorCount++;
      }
    }
    
    console.log(`Sync complete: ${successCount} processed successfully, ${errorCount} errored`);
    
  } catch (error) {
    console.error('Error syncing form responses:', error)
  }
} 

