import { google } from 'googleapis';
import { getGoogleAuthClient } from './auth.js';

let formsClient;

async function getFormsClient() {
  if (!formsClient) {
    const authClient = await getGoogleAuthClient();
    formsClient = google.forms({ version: 'v1', auth: authClient });
  }
  return formsClient;
}

export async function getResponses(formId) {
  // Validate form ID
  if (!formId || typeof formId !== 'string' || formId.length < 10) {
    throw new Error(`Invalid form ID: ${formId}. Form ID should be a valid Google Form ID.`);
  }
  
  console.log('Making API call to get responses for form ID:', formId);
  
  const client = await getFormsClient();
  const res = await client.forms.responses.list({ formId });
  return res.data.responses ?? [];
}

// for testing
export async function getFormQuestions(formId) {
  // Validate form ID
  if (!formId || typeof formId !== 'string' || formId.length < 10) {
    throw new Error(`Invalid form ID: ${formId}. Form ID should be a valid Google Form ID.`);
  }
  
  console.log('Making API call to get questions for form ID:', formId);
  
  const client = await getFormsClient();
  const res = await client.forms.get({ formId });
  return res.data.items ?? [];
} 