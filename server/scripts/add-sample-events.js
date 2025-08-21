import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleEvents() {
  try {
    // First, get or create an active recruiting cycle
    let cycle = await prisma.recruitingCycle.findFirst({
      where: { isActive: true }
    });

    if (!cycle) {
      cycle = await prisma.recruitingCycle.create({
        data: {
          name: 'Fall 2025 Recruitment',
          isActive: true,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-12-31')
        }
      });
      console.log('Created new active cycle:', cycle.name);
    }

    // Add sample events
    const events = [
      {
        eventName: 'Case Interview Workshop',
        eventStartDate: new Date('2025-09-09T18:00:00Z'),
        eventEndDate: new Date('2025-09-09T20:00:00Z'),
        eventLocation: 'Hanes Hall',
        rsvpForm: 'https://forms.gle/example1',
        cycleId: cycle.id
      },
      {
        eventName: 'Networking Mixer',
        eventStartDate: new Date('2025-09-15T19:00:00Z'),
        eventEndDate: new Date('2025-09-15T21:00:00Z'),
        eventLocation: 'Student Union',
        rsvpForm: 'https://forms.gle/example2',
        cycleId: cycle.id
      },
      {
        eventName: 'Consulting 101 Info Session',
        eventStartDate: new Date('2025-09-22T17:00:00Z'),
        eventEndDate: new Date('2025-09-22T18:30:00Z'),
        eventLocation: 'Business School Auditorium',
        rsvpForm: 'https://forms.gle/example3',
        cycleId: cycle.id
      }
    ];

    for (const eventData of events) {
      const existingEvent = await prisma.events.findFirst({
        where: {
          eventName: eventData.eventName,
          cycleId: cycle.id
        }
      });

      if (!existingEvent) {
        const event = await prisma.events.create({
          data: eventData
        });
        console.log('Created event:', event.eventName);
      } else {
        // Update existing event with RSVP form URL
        await prisma.events.update({
          where: { id: existingEvent.id },
          data: { rsvpForm: eventData.rsvpForm }
        });
        console.log('Updated event with RSVP form:', eventData.eventName);
      }
    }

    console.log('Sample events added successfully!');
  } catch (error) {
    console.error('Error adding sample events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleEvents();
