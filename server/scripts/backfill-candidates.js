import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillCandidates() {
  console.log('Starting candidate backfill process...');
  
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

    console.log(`Found ${applicationsByStudentId.size} unique studentIds to process`);

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
        console.log(`Created candidate for studentId ${studentId}: ${firstApp.firstName} ${firstApp.lastName}`);
      } else {
        console.log(`Candidate already exists for studentId ${studentId}: ${candidate.firstName} ${candidate.lastName}`);
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
      console.log(`Linked ${updateResult.count} applications to candidate ${candidate.id}`);
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Candidates created: ${candidatesCreated}`);
    console.log(`Applications updated: ${applicationsUpdated}`);
    console.log('Backfill completed successfully!');

    // Verify the results
    await verifyBackfill();

  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyBackfill() {
  console.log('\n=== Verification ===');
  
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

    // Average applications per candidate
    const candidateAppCounts = await prisma.candidate.findMany({
      select: {
        id: true,
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    const avgAppsPerCandidate = candidateAppCounts.length > 0 
      ? candidateAppCounts.reduce((sum, c) => sum + c._count.applications, 0) / candidateAppCounts.length
      : 0;

    console.log(`Applications with candidates: ${applicationsWithCandidates}`);
    console.log(`Applications without candidates: ${applicationsWithoutCandidates}`);
    console.log(`Total candidates: ${totalCandidates}`);
    console.log(`Average applications per candidate: ${avgAppsPerCandidate.toFixed(2)}`);

    // Show sample of linked data
    const sampleLinked = await prisma.application.findMany({
      where: {
        candidateId: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      },
      take: 5
    });

    console.log('\nSample of linked applications and candidates:');
    sampleLinked.forEach(app => {
      console.log(`  App: ${app.firstName} ${app.lastName} (${app.studentId}) -> Candidate: ${app.candidate.firstName} ${app.candidate.lastName} (${app.candidate.studentId})`);
    });

    if (applicationsWithoutCandidates === 0) {
      console.log('\n✅ All applications are now linked to candidates!');
    } else {
      console.log(`\n⚠️  ${applicationsWithoutCandidates} applications still don't have candidates.`);
    }

  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the backfill if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillCandidates()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { backfillCandidates, verifyBackfill };
