import express from 'express';
import prisma from '../prismaClient.js';
import { sendMeetingSignupConfirmation, sendMeetingSignupNotification } from '../services/emailNotifications.js';

const router = express.Router();

// Public: list available meeting slots with remaining capacity and signups
router.get('/meeting-slots', async (req, res) => {
  try {
    const slots = await prisma.meetingSlot.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        member: {
          select: { id: true, fullName: true, email: true }
        },
        signups: {
          select: { id: true }
        }
      }
    });

    const formatted = slots.map(slot => ({
      id: slot.id,
      memberName: slot.member?.fullName || 'Member',
      memberEmail: slot.member?.email || null,
      location: slot.location,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      taken: slot.signups.length,
      remaining: Math.max(0, slot.capacity - slot.signups.length)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[GET /api/meeting-slots]', error);
    res.status(500).json({ error: 'Failed to fetch meeting slots' });
  }
});

// Public: sign up for a meeting slot
router.post('/meeting-slots/:id/signup', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, studentId } = req.body || {};

    if (!fullName || !email || !studentId) {
      return res.status(400).json({ error: 'Name, email, and student ID are required' });
    }

    // Get the active recruiting cycle to check for cycle-specific signups
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });

    // Check if user has already signed up for a meeting slot in the current cycle
    if (activeCycle && (activeCycle.startDate || activeCycle.endDate)) {
      const cycleStartDate = activeCycle.startDate ? new Date(activeCycle.startDate) : null;
      const cycleEndDate = activeCycle.endDate ? new Date(activeCycle.endDate) : null;

      // Find existing signups for this email
      const existingSignups = await prisma.meetingSignup.findMany({
        where: { email },
        include: { slot: true }
      });

      // Check if any existing signup falls within the current cycle's date range
      const existingSignupInCycle = existingSignups.find(signup => {
        const slotDate = new Date(signup.slot.startTime);
        const isAfterStart = !cycleStartDate || slotDate >= cycleStartDate;
        const isBeforeEnd = !cycleEndDate || slotDate <= cycleEndDate;
        return isAfterStart && isBeforeEnd;
      });

      if (existingSignupInCycle) {
        return res.status(400).json({ 
          error: `You have already signed up for a meeting on ${new Date(existingSignupInCycle.slot.startTime).toLocaleDateString()}. You can only sign up for one meeting slot per cycle.` 
        });
      }
    } else {
      // If no active cycle or no date range, fall back to checking all signups
      // (for backwards compatibility)
      const existingSignup = await prisma.meetingSignup.findFirst({
        where: { email },
        include: { slot: true }
      });

      if (existingSignup) {
        return res.status(400).json({ 
          error: `You have already signed up for a meeting on ${new Date(existingSignup.slot.startTime).toLocaleDateString()}. You can only sign up for one meeting slot.` 
        });
      }
    }

    // Check if user exists in the system (has an account)
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    const slot = await prisma.meetingSlot.findUnique({
      where: { id },
      include: { 
        signups: true,
        member: {
          select: { fullName: true, email: true }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.signups.length >= slot.capacity) {
      return res.status(400).json({ error: 'This time slot is full' });
    }

    const signup = await prisma.meetingSignup.create({
      data: {
        slotId: id,
        fullName,
        email,
        studentId
      }
    });

    // Send confirmation email to candidate
    try {
      await sendMeetingSignupConfirmation(
        email,
        fullName,
        slot.member?.fullName || 'UC Consulting Member',
        slot.location,
        slot.startTime,
        slot.endTime
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the signup if email fails, just log the error
    }

    // Send notification email to member
    try {
      if (slot.member?.email) {
        await sendMeetingSignupNotification(
          slot.member.email,
          slot.member.fullName || 'UC Consulting Member',
          fullName,
          email,
          studentId,
          slot.location,
          slot.startTime,
          slot.endTime
        );
      }
    } catch (emailError) {
      console.error('Failed to send notification email to member:', emailError);
      // Don't fail the signup if email fails, just log the error
    }

    res.json({ 
      success: true, 
      signup,
      needsAccount: !existingUser,
      message: existingUser 
        ? 'Successfully signed up! You will receive a confirmation email shortly.'
        : 'Successfully signed up! You will receive a confirmation email shortly. We recommend creating an account to track your application status.'
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'You are already signed up for this slot' });
    }
    console.error('[POST /api/meeting-slots/:id/signup]', error);
    res.status(500).json({ error: 'Failed to create signup' });
  }
});

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
        rsvpCount: event.eventRsvp.length,
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

// Public: get active recruiting cycle (for filtering meeting slots by cycle)
router.get('/active-cycle', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    res.json(active || null);
  } catch (error) {
    console.error('[GET /api/active-cycle]', error);
    res.json(null);
  }
});

export default router;
