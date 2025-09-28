import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config();

// Handle missing FORM_CONFIG_PATH gracefully
let formConfig = {};
if (process.env.FORM_CONFIG_PATH) {
  try {
    const formConfigPath = path.resolve(process.env.FORM_CONFIG_PATH);
    formConfig = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'));
  } catch (error) {
    console.warn('Warning: Could not load form config:', error.message);
  }
}

const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key', 

  dbUrl: process.env.DATABASE_URL,
  gCloudKeyPath: process.env.GOOGLE_CLOUD_KEY_PATH ? path.resolve(process.env.GOOGLE_CLOUD_KEY_PATH) : null,
  
  // Base URL for file serving - defaults based on environment
  baseUrl: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://uconsultingats.com' : 'http://localhost:3001'),

  form: formConfig,
};

export default config;