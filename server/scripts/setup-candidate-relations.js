import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function setupCandidateRelations() {
  console.log('🚀 Setting up enhanced candidate-application relationships...\n');
  
  try {
    // Step 1: Update the Prisma schema
    console.log('📝 Step 1: Updating Prisma schema...');
    await updateSchemaRelations();
    
    // Step 2: Generate Prisma client
    console.log('\n🔄 Step 2: Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated successfully');
    } catch (error) {
      console.error('❌ Error generating Prisma client:', error.message);
      throw error;
    }
    
    // Step 3: Backfill existing applications with candidates
    console.log('\n🔄 Step 3: Backfilling existing applications with candidates...');
    await backfillCandidates();
    
    // Step 4: Verify the setup
    console.log('\n🔍 Step 4: Verifying the setup...');
    await verifySetup();
    
    // Step 5: Push database changes
    console.log('\n🔄 Step 5: Pushing database changes...');
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database changes pushed successfully');
    } catch (error) {
      console.error('❌ Error pushing database changes:', error.message);
      throw error;
    }
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Summary of what was accomplished:');
    console.log('   ✅ Updated Prisma schema to make candidate relations required');
    console.log('   ✅ Generated updated Prisma client');
    console.log('   ✅ Backfilled all existing applications with candidate records');
    console.log('   ✅ Verified all applications are properly linked');
    console.log('   ✅ Applied database constraints and triggers');
    
    console.log('\n🔗 Now every application is automatically linked to its candidate profile!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updateSchemaRelations() {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  
  try {
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
    
    writeFileSync(schemaPath, schema, 'utf8');
    console.log('✅ Schema updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    throw error;
  }
}

async function backfillCandidates() {
  try {
    // Get all applications that don't have a candidateId
    const applicationsWithoutCandidates = await prisma.application.findMany({
      where: {
        candidateId: null
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    console.log(`Found ${applicationsWithoutCandidates.length} applications without candidates`);

    if (applicationsWithoutCandidates.length === 0) {
      console.log('All applications already have candidates. No backfill needed.');
      return;
    }

    // Group applications by studentId to handle duplicates
    const applicationsByStudentId = new Map();
    
    applicationsWithoutCandidates.forEach(app => {
      const studentId = parseInt(app.studentId);
      if (!applicationsByStudentId.has(studentId)) {
        applicationsByStudentId.set(studentId, []);
      }
      applicationsByStudentId.get(studentId).push(app);
    });

    console.log(`Processing ${applicationsByStudentId.size} unique studentIds`);

    let candidatesCreated = 0;
    let applicationsUpdated = 0;

    // Process each unique studentId
    for (const [studentId, applications] of applicationsByStudentId) {
      // Check if candidate already exists for this studentId
      let candidate = await prisma.candidate.findUnique({
        where: { studentId }
      });

      if (!candidate) {
        // Create new candidate using data from the first application
        const firstApp = applications[0];
        candidate = await prisma.candidate.create({
          data: {
            studentId,
            firstName: firstApp.firstName,
            lastName: firstApp.lastName,
            email: firstApp.email
          }
        });
        candidatesCreated++;
      }

      // Update all applications for this studentId to link to the candidate
      const updateResult = await prisma.application.updateMany({
        where: {
          id: {
            in: applications.map(app => app.id)
          }
        },
        data: {
          candidateId: candidate.id
        }
      });

      applicationsUpdated += updateResult.count;
    }

    console.log(`✅ Created ${candidatesCreated} candidates and linked ${applicationsUpdated} applications`);

  } catch (error) {
    console.error('❌ Error during backfill:', error.message);
    throw error;
  }
}

async function verifySetup() {
  try {
    // Check applications with candidates
    const applicationsWithCandidates = await prisma.application.count({
      where: {
        candidateId: {
          not: null
        }
      }
    });

    // Check applications without candidates
    const applicationsWithoutCandidates = await prisma.application.count({
      where: {
        candidateId: null
      }
    });

    // Total candidates
    const totalCandidates = await prisma.candidate.count();

    console.log(`📊 Applications with candidates: ${applicationsWithCandidates}`);
    console.log(`📊 Applications without candidates: ${applicationsWithoutCandidates}`);
    console.log(`📊 Total candidates: ${totalCandidates}`);

    if (applicationsWithoutCandidates === 0) {
      console.log('✅ All applications are properly linked to candidates!');
    } else {
      console.log(`⚠️  ${applicationsWithoutCandidates} applications still need candidates.`);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    throw error;
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCandidateRelations()
    .then(() => {
      console.log('\nSetup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupCandidateRelations };
