import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function updateSchemaRelations() {
  console.log('Updating Prisma schema to enhance candidate-application relationship...');
  
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  
  try {
    // Read the current schema
    let schema = readFileSync(schemaPath, 'utf8');
    
    // Update the Application model to make candidateId required
    schema = schema.replace(
      /candidateId\s+String\?\s*\n\s*candidate\s+Candidate\?\s*@relation\(fields:\s*\[candidateId\],\s*references:\s*\[id\]\)/g,
      'candidateId           String\n  candidate             Candidate           @relation(fields: [candidateId], references: [id])'
    );
    
    // Add a comment to document the enhanced relationship
    schema = schema.replace(
      /\/\/ Candidate relation\n\s*candidateId\s+String\n\s*candidate\s+Candidate\s+@relation\(fields:\s*\[candidateId\],\s*references:\s*\[id\]\)/g,
      '// Enhanced Candidate relation - now required and automatically linked\n  candidateId           String\n  candidate             Candidate           @relation(fields: [candidateId], references: [id])'
    );
    
    // Write the updated schema back
    writeFileSync(schemaPath, schema, 'utf8');
    
    console.log('✅ Schema updated successfully!');
    console.log('📝 Changes made:');
    console.log('   - Made candidateId required (removed ?)');
    console.log('   - Made candidate relation required (removed ?)');
    console.log('   - Added documentation comment');
    
    console.log('\n🔄 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Run: npx prisma db push (or npx prisma migrate dev)');
    console.log('   3. Run: npm run backfill-candidates (if you haven\'t already)');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateSchemaRelations();
}

export { updateSchemaRelations };
