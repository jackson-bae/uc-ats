import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCandidates() {
  console.log('=== Candidate Verification Report ===\n');
  
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

    console.log(`📊 Applications with candidates: ${applicationsWithCandidates}`);
    console.log(`📊 Applications without candidates: ${applicationsWithoutCandidates}`);
    console.log(`📊 Total candidates: ${totalCandidates}`);
    console.log(`📊 Average applications per candidate: ${avgAppsPerCandidate.toFixed(2)}`);

    // Show candidates with multiple applications
    const candidatesWithMultipleApps = candidateAppCounts.filter(c => c._count.applications > 1);
    if (candidatesWithMultipleApps.length > 0) {
      console.log(`\n🔗 Candidates with multiple applications: ${candidatesWithMultipleApps.length}`);
    }

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

    console.log('\n📋 Sample of linked applications and candidates:');
    sampleLinked.forEach(app => {
      console.log(`  • App: ${app.firstName} ${app.lastName} (${app.studentId})`);
      console.log(`    → Candidate: ${app.candidate.firstName} ${app.candidate.lastName} (${app.candidate.studentId})`);
    });

    if (applicationsWithoutCandidates === 0) {
      console.log('\n✅ SUCCESS: All applications are now linked to candidates!');
    } else {
      console.log(`\n⚠️  WARNING: ${applicationsWithoutCandidates} applications still don't have candidates.`);
    }

    // Show some statistics about studentId distribution
    const studentIdStats = await prisma.application.groupBy({
      by: ['studentId'],
      _count: {
        studentId: true
      },
      orderBy: {
        _count: {
          studentId: 'desc'
        }
      },
      take: 5
    });

    if (studentIdStats.length > 0) {
      console.log('\n📈 Top studentIds by application count:');
      studentIdStats.forEach(stat => {
        console.log(`  • StudentId ${stat.studentId}: ${stat._count.studentId} applications`);
      });
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyCandidates()
    .then(() => {
      console.log('\nVerification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyCandidates };
