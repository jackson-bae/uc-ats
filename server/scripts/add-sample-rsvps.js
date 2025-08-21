import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleRsvps() {
  try {
    // Get the first event
    const event = await prisma.events.findFirst({
      where: {
        eventName: 'Case Interview Workshop'
      }
    });

    if (!event) {
      console.log('No events found. Please run add-sample-events.js first.');
      return;
    }

    // Create a test candidate
    const candidate = await prisma.candidate.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        studentId: 12345,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }
    });

    // Check if RSVP already exists
    const existingRsvp = await prisma.eventRsvp.findFirst({
      where: {
        eventId: event.id,
        candidateId: candidate.id
      }
    });

    if (!existingRsvp) {
      // Create RSVP
      const rsvp = await prisma.eventRsvp.create({
        data: {
          responseId: `rsvp-${Date.now()}`,
          eventId: event.id,
          candidateId: candidate.id
        }
      });
      console.log('Created RSVP for:', event.eventName);
    } else {
      console.log('RSVP already exists for:', event.eventName);
    }

    console.log('Sample RSVP data added successfully!');
  } catch (error) {
    console.error('Error adding sample RSVPs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleRsvps();
