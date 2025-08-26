import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// Get all active events for candidates with RSVP status
router.get('/events', async (req, res) => {
  try {
    const userEmail = req.query.userEmail; // Get user email from query parameter
    
    const events = await prisma.events.findMany({
      where: {
        showToCandidates: true // Only show events that are meant to be visible to candidates
      },
      include: {
        cycle: true,
        eventRsvp: {
          include: {
            candidate: true
          }
        },
        eventAttendance: {
          include: {
            candidate: true
          }
        }
      },
      orderBy: {
        eventStartDate: 'asc'
      }
    });

    // Filter to only show events from active cycles
    const activeEvents = events.filter(event => event.cycle?.isActive);

    // Find the user by email to get their studentId (if provided)
    let user = null;
    if (userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail }
      });
    }

    // Add RSVP and attendance status for each event
    const eventsWithStatus = activeEvents.map(event => {
      let hasRsvpd = false;
      let hasAttended = false;
      
      if (user && user.studentId) {
        // Check if user has RSVP'd by looking for a candidate with matching studentId
        hasRsvpd = event.eventRsvp.some(rsvp => 
          rsvp.candidate.studentId === user.studentId
        );
        
        // Check if user has attended by looking for a candidate with matching studentId
        hasAttended = event.eventAttendance.some(attendance => 
          attendance.candidate.studentId === user.studentId
        );
      }

      return {
        ...event,
        hasRsvpd,
        hasAttended,
        eventRsvp: undefined, // Remove the full RSVP data from response
        eventAttendance: undefined // Remove the full attendance data from response
      };
    });

    res.json(eventsWithStatus);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get all events from active cycle for member timeline (no candidate visibility filter)
router.get('/member/events', async (req, res) => {
  try {
    const events = await prisma.events.findMany({
      include: {
        cycle: true
      },
      orderBy: {
        eventStartDate: 'asc'
      }
    });

    // Filter to only show events from active cycles
    const activeEvents = events.filter(event => event.cycle?.isActive);

    // Ensure memberRsvpUrl is included in the response
    const eventsWithMemberRsvp = activeEvents.map(event => ({
      ...event,
      memberRsvpUrl: event.memberRsvpUrl || null
    }));

    res.json(eventsWithMemberRsvp);
  } catch (error) {
    console.error('Error fetching member events:', error);
    res.status(500).json({ error: 'Failed to fetch member events' });
  }
});

export default router;
