import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleAttendance() {
  try {
    // Get the first event
    const event = await prisma.events.findFirst({
      where: {
        eventName: 'Networking Mixer'
      }
    });

    if (!event) {
      console.log('No events found. Please run add-sample-events.js first.');
      return;
    }

    // Get the candidate (user with studentId 906117810)
    const candidate = await prisma.candidate.findFirst({
      where: { studentId: 906117810 }
    });

    if (!candidate) {
      console.log('No candidate found. Please run migrate-users-to-candidates.js first.');
      return;
    }

    // Check if attendance already exists
    const existingAttendance = await prisma.eventAttendance.findFirst({
      where: {
        eventId: event.id,
        candidateId: candidate.id
      }
    });

    if (!existingAttendance) {
      // Create attendance record
      const attendance = await prisma.eventAttendance.create({
        data: {
          responseId: `attendance-${Date.now()}`,
          eventId: event.id,
          candidateId: candidate.id
        }
      });
      console.log('Created attendance for:', event.eventName);
    } else {
      console.log('Attendance already exists for:', event.eventName);
    }

    console.log('Sample attendance data added successfully!');
  } catch (error) {
    console.error('Error adding sample attendance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleAttendance();
