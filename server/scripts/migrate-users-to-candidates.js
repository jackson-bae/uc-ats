import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUsersToCandidates() {
  try {
    console.log('Starting migration of users to candidates...');
    
    // Find all users with USER role
    const users = await prisma.user.findMany({
      where: {
        role: 'USER'
      }
    });
    
    console.log(`Found ${users.length} users with USER role`);
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Check if candidate already exists for this user
        const existingCandidate = await prisma.candidate.findFirst({
          where: {
            OR: [
              { email: user.email },
              { studentId: user.studentId }
            ]
          }
        });
        
        if (existingCandidate) {
          console.log(`Skipped ${user.email} - candidate already exists`);
          skippedCount++;
          continue;
        }
        
        // Split full name into first and last name
        const nameParts = user.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Create candidate record
        const candidate = await prisma.candidate.create({
          data: {
            studentId: user.studentId || 0, // Use 0 if no studentId
            firstName,
            lastName,
            email: user.email,
          }
        });
        
        console.log(`Created candidate for ${user.email} (Student ID: ${user.studentId || 'N/A'})`);
        createdCount++;
        
      } catch (error) {
        console.error(`Error creating candidate for ${user.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`- Created: ${createdCount} candidates`);
    console.log(`- Skipped: ${skippedCount} (already existed)`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUsersToCandidates();
