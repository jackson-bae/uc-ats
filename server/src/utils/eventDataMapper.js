import fs from 'node:fs';
import path from 'node:path';

// Load event form configurations
function loadEventFormConfig(configType) {
  const configPath = path.resolve(process.cwd(), `event-${configType}-config.json`);
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.warn(`Warning: Could not load event ${configType} config:`, error.message);
    return null;
  }
}

// Transform event form response using configuration mappings
export function transformEventFormResponse(formResponse, configType, eventId) {
  const config = loadEventFormConfig(configType);
  if (!config) {
    throw new Error(`No configuration found for event form type: ${configType}`);
  }

  const dbRecord = {
    responseId: formResponse.responseId,
    eventId: eventId,
    createdAt: new Date(formResponse.createTime),
    rawResponse: formResponse // Keep raw data as backup
  };

  // Transform each answer using the field mappings
  for (const [questionId, answerData] of Object.entries(formResponse.answers || {})) {
    let mapping = null;
    
    // First try direct questionId mapping (like your existing form-config.json)
    if (config.database_mappings && config.database_mappings[questionId]) {
      mapping = config.database_mappings[questionId];
    } else {
      // Try to match by field patterns (for forms without explicit question IDs)
      const questionTitle = getQuestionTitle(formResponse, questionId);
      mapping = findMappingByPatterns(config.field_patterns || {}, questionTitle);
    }
    
    if (!mapping) {
      console.warn(`No mapping found for question ID: ${questionId} with title: "${questionTitle}"`);
      continue;
    }

    const value = extractAnswerValue(answerData);
    const transformedValue = transformEventValue(value, mapping);
    
    dbRecord[mapping.field] = transformedValue;
  }

  return dbRecord;
}

// Extract question title from form response
function getQuestionTitle(formResponse, questionId) {
  // In a real implementation, this would require the form structure
  // For now, return empty string and rely on question ID mapping
  return '';
}

// Find mapping by field patterns
function findMappingByPatterns(fieldPatterns, questionTitle) {
  if (!questionTitle) return null;
  
  const title = questionTitle.toLowerCase().trim();
  
  // Check each field pattern configuration
  for (const [fieldKey, fieldConfig] of Object.entries(fieldPatterns)) {
    if (fieldConfig.patterns) {
      for (const pattern of fieldConfig.patterns) {
        if (title.includes(pattern.toLowerCase())) {
          return fieldConfig;
        }
      }
    }
  }
  
  return null;
}

// Extract the actual answer value from Google Form response structure
function extractAnswerValue(answerData) {
  if (answerData.textAnswers?.answers?.[0]?.value) {
    return answerData.textAnswers.answers[0].value;
  }
  if (answerData.fileUploadAnswers?.answers?.[0]) {
    return answerData.fileUploadAnswers.answers[0];
  }
  return null;
}

// Transform a value based on its mapping configuration
function transformEventValue(value, mapping) {
  if (value === null || value === undefined) {
    return mapping.required ? null : undefined;
  }

  switch (mapping.type) {
    case 'boolean':
      if (mapping.transform) {
        return mapping.transform[value] ?? null;
      }
      return Boolean(value);
    
    case 'decimal':
      const numValue = parseFloat(value);
      return isNaN(numValue) ? null : numValue;
    
    case 'string':
      let stringValue = String(value).trim();
      
      // Apply regex transformation if specified
      if (mapping.transform_regex && mapping.transform_replace !== undefined) {
        const regex = new RegExp(mapping.transform_regex, 'g');
        stringValue = stringValue.replace(regex, mapping.transform_replace);
      }
      
      return stringValue;
    
    default:
      return value;
  }
}

// Create a more flexible mapping function that tries to match form fields dynamically
export function createDynamicEventMapping(formResponse, eventId, configType) {
  const answers = formResponse.answers || {};
  const mappedData = {
    responseId: formResponse.responseId,
    eventId: eventId,
    createdAt: new Date(formResponse.createTime),
    rawResponse: formResponse
  };

  console.log(`Dynamic mapping for ${configType} - Raw answers:`, JSON.stringify(answers, null, 2));

  // First, check for respondentEmail at the top level (Google Forms provides this)
  if (formResponse.respondentEmail && !mappedData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(formResponse.respondentEmail)) {
      mappedData.email = formResponse.respondentEmail;
      console.log(`Found email from respondentEmail: ${formResponse.respondentEmail}`);
    }
  }

  // Try to extract common fields by analyzing answer values
  const nameValues = [];
  
  Object.entries(answers).forEach(([questionId, answerData]) => {
    const value = extractAnswerValue(answerData);
    if (!value) return;

    const stringValue = String(value).trim();
    console.log(`Processing question ${questionId}: "${stringValue}"`);
    
    // Email detection - more comprehensive (only if not already found)
    if (!mappedData.email && stringValue.includes('@') && stringValue.includes('.')) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(stringValue)) {
        mappedData.email = stringValue;
        console.log(`Found email from answer: ${stringValue}`);
      }
    }
    
    // Student ID detection (9 digits)
    if (/^\d{9}$/.test(stringValue) && !mappedData.studentId) {
      mappedData.studentId = stringValue;
      console.log(`Found student ID: ${stringValue}`);
    }
    
    // Collect potential name values for later processing
    if (/^[a-zA-Z\s\-']+$/.test(stringValue) && stringValue.length < 50 && stringValue.length > 1) {
      nameValues.push(stringValue);
    }
  });

  // Process collected name values to find first and last names
  if (nameValues.length > 0) {
    // Sort name values by length (shorter names are more likely to be first names)
    const sortedNames = nameValues.sort((a, b) => a.length - b.length);
    
    // Assign first name (shortest name that looks like a first name)
    if (!mappedData.firstName && sortedNames.length > 0) {
      mappedData.firstName = sortedNames[0];
      console.log(`Found first name: ${sortedNames[0]}`);
    }
    
    // Assign last name (second shortest name, or longest if only one name provided)
    if (!mappedData.lastName && sortedNames.length > 1) {
      mappedData.lastName = sortedNames[1];
      console.log(`Found last name: ${sortedNames[1]}`);
    } else if (!mappedData.lastName && sortedNames.length === 1) {
      // If only one name is provided, try to split it
      const nameParts = sortedNames[0].split(/\s+/);
      if (nameParts.length > 1) {
        mappedData.firstName = nameParts[0];
        mappedData.lastName = nameParts.slice(1).join(' ');
        console.log(`Split single name into first: ${nameParts[0]}, last: ${nameParts.slice(1).join(' ')}`);
      } else {
        // Single name - use it as first name and set last name to empty or a default
        mappedData.lastName = '';
        console.log(`Only one name found, setting last name to empty`);
      }
    }
  }

  console.log(`Final mapped data:`, JSON.stringify(mappedData, null, 2));
  return mappedData;
}

// Get supported event form types
export function getSupportedEventFormTypes() {
  return ['attendance', 'rsvp'];
}

// Validate event form configuration
export function validateEventFormConfig(configType) {
  const config = loadEventFormConfig(configType);
  if (!config) {
    return { valid: false, error: `Configuration file not found for ${configType}` };
  }

  if (!config.database_mappings) {
    return { valid: false, error: 'database_mappings not found in configuration' };
  }

  // Check for required fields
  const mappings = config.database_mappings;
  const hasEmail = Object.values(mappings).some(m => m.field === 'email');
  const hasStudentId = Object.values(mappings).some(m => m.field === 'studentId');

  if (!hasEmail || !hasStudentId) {
    return { 
      valid: false, 
      error: 'Configuration must include mappings for email and studentId fields' 
    };
  }

  return { valid: true };
}