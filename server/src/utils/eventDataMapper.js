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

  // Try to extract common fields by analyzing answer values
  Object.entries(answers).forEach(([questionId, answerData]) => {
    const value = extractAnswerValue(answerData);
    if (!value) return;

    const stringValue = String(value).trim();
    
    // Email detection
    if (stringValue.includes('@') && !mappedData.email) {
      mappedData.email = stringValue;
    }
    
    // Student ID detection (9 digits)
    if (/^\d{9}$/.test(stringValue) && !mappedData.studentId) {
      mappedData.studentId = parseInt(stringValue);
    }
    
    // Name detection (basic heuristic - first alphabetic fields become names)
    if (/^[a-zA-Z\s]+$/.test(stringValue) && stringValue.length < 50) {
      if (!mappedData.firstName) {
        mappedData.firstName = stringValue;
      } else if (!mappedData.lastName) {
        mappedData.lastName = stringValue;
      }
    }
  });

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