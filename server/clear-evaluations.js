const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearEvaluations() {
  try {
    console.log('Clearing interview_evaluations table...');
    
    const result = await prisma.interviewEvaluation.deleteMany({});
    
    console.log(`Deleted ${result.count} evaluation records`);
    console.log('Table cleared successfully!');
  } catch (error) {
    console.error('Error clearing evaluations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearEvaluations();





