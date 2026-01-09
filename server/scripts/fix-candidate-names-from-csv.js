import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL and add pgbouncer flag if not present
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.includes('pgbouncer=true') === false) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
}

// Initialize Prisma client with connection pooling fix
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

/**
 * Fix candidate names from a CSV file containing correct name data
 *
 * Usage:
 *   node scripts/fix-candidate-names-from-csv.js <path-to-csv>
 *
 * CSV should have columns:
 *   - UCLA Student ID (or any column with "student id" in the name)
 *   - What is your name? (or any column with "name" in the name)
 */

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: node scripts/fix-candidate-names-from-csv.js <path-to-csv>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/fix-candidate-names-from-csv.js ../new.csv');
  process.exit(1);
}

const resolvedPath = path.resolve(csvPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found: ${resolvedPath}`);
  process.exit(1);
}

console.log('='.repeat(80));
console.log('Fix Candidate Names from CSV');
console.log('='.repeat(80));
console.log('');
console.log('CSV file:', resolvedPath);
console.log('');

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      records.push(record);
    }
  }

  return records;
}

try {
  // Read and parse CSV
  const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
  const records = parseCSV(fileContent);

  console.log(`Found ${records.length} records in CSV`);
  console.log('');

  // Find the column names for student ID and name
  const firstRecord = records[0];
  const columns = Object.keys(firstRecord);

  const studentIdColumn = columns.find(col =>
    col.toLowerCase().includes('student id') ||
    col.toLowerCase().includes('studentid')
  );

  const nameColumn = columns.find(col =>
    col.toLowerCase().includes('name') &&
    !col.toLowerCase().includes('email')
  );

  if (!studentIdColumn) {
    console.error('Error: Could not find Student ID column in CSV');
    console.error('Available columns:', columns);
    process.exit(1);
  }

  if (!nameColumn) {
    console.error('Error: Could not find Name column in CSV');
    console.error('Available columns:', columns);
    process.exit(1);
  }

  console.log(`Using columns:`);
  console.log(`  Student ID: "${studentIdColumn}"`);
  console.log(`  Name: "${nameColumn}"`);
  console.log('');

  // Process each record
  let updatedCount = 0;
  let notFoundCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log('Processing records...');
  console.log('─'.repeat(80));

  for (const record of records) {
    const studentId = record[studentIdColumn]?.trim();
    const fullName = record[nameColumn]?.trim();

    if (!studentId || !fullName) {
      console.log(`⊘ Skipping record - missing data (studentId: ${studentId}, name: ${fullName})`);
      skippedCount++;
      continue;
    }

    // Split name into first and last
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      // Find candidate by student ID
      const candidate = await prisma.candidate.findUnique({
        where: { studentId }
      });

      if (!candidate) {
        console.log(`✗ Student ID ${studentId} not found in database (${fullName})`);
        notFoundCount++;
        continue;
      }

      // Check if update is needed
      const needsUpdate = candidate.firstName !== firstName || candidate.lastName !== lastName;

      if (!needsUpdate) {
        console.log(`✓ Student ID ${studentId} already has correct name: ${firstName} ${lastName}`);
        continue;
      }

      // Update the candidate
      await prisma.candidate.update({
        where: { studentId },
        data: {
          firstName,
          lastName
        }
      });

      console.log(`✓ Updated ${studentId}: "${candidate.firstName} ${candidate.lastName}" → "${firstName} ${lastName}"`);
      updatedCount++;

    } catch (error) {
      console.log(`✗ Error processing ${studentId} (${fullName}): ${error.message}`);
      errorCount++;
    }
  }

  console.log('─'.repeat(80));
  console.log('');
  console.log('Summary:');
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Already correct: ${records.length - updatedCount - notFoundCount - skippedCount - errorCount}`);
  console.log(`  Not found in database: ${notFoundCount}`);
  console.log(`  Skipped (missing data): ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('');
  console.log('='.repeat(80));

} catch (error) {
  console.error('Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
