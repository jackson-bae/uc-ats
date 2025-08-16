import prisma from '../prismaClient.js'; 
import config from '../config.js';
import { getResponses } from './google/forms.js'
import { transformFormResponse } from '../utils/dataMapper.js'
import { extractFormIdFromUrl } from '../utils/formUtils.js'

export default async function syncFormResponses() {
  try {
    console.log('Fetching new responses from Google Forms...');

    // Require an active cycle and use its form URL exclusively
    const activeCycle = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!activeCycle) {
      console.warn('No active recruiting cycle. Skipping sync.');
      return;
    }
    
    console.log('Active cycle found:', {
      id: activeCycle.id,
      name: activeCycle.name,
      formUrl: activeCycle.formUrl
    });
    
    const formIdToUse = extractFormIdFromUrl(activeCycle.formUrl || '');
    console.log('Extracted form ID:', formIdToUse);
    
    if (!formIdToUse) {
      console.warn('Active cycle has no valid Google Form URL. Skipping sync.');
      console.warn('Form URL was:', activeCycle.formUrl);
      return;
    }

    console.log('Using form ID for API call:', formIdToUse);
    const responses = await getResponses(formIdToUse)
    
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
        // Associate with active cycle if exists
        const dataToCreate = {
          ...dbRecord,
          ...(activeCycle ? { cycleId: activeCycle.id } : {})
        };
        await prisma.application.create({ data: dataToCreate });
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

