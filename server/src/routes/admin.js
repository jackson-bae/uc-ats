import express from 'express';
import prisma from '../prismaClient.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { syncEventAttendance, syncEventRSVP, syncAllEventForms } from '../services/syncEventResponses.js';

const router = express.Router();

// Protect all admin routes
router.use(requireAuth, requireAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.json({ totalApplicants: 0, tasks: 0, candidates: 0, currentRound: 'SUBMITTED' });
    }

    const [totalApplicants, totalGrades, candidates] = await Promise.all([
      prisma.application.count({ where: { cycleId: active.id } }),
      prisma.grade.count(), // grades are not linked to cycles; consider linking in future
      prisma.application.findMany({
        where: {
          cycleId: active.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'] }
        }
      })
    ]);

    const statusCounts = candidates.reduce((acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1;
      return acc;
    }, {});

    const currentRound = Object.keys(statusCounts).length > 0 
      ? Object.keys(statusCounts).reduce((a, b) =>
          statusCounts[a] > statusCounts[b] ? a : b
        )
      : 'SUBMITTED';

    res.json({ totalApplicants, tasks: totalGrades, candidates: candidates.length, currentRound });
  } catch (error) {
    console.error('[GET /api/admin/stats]', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get all candidates
router.get('/candidates', async (req, res) => {
  try {
    // Scope to active cycle if present
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.json([]);
    }
    const candidates = await prisma.application.findMany({
      where: { cycleId: active.id },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(candidates);
  } catch (error) {
    console.error('[GET /api/admin/candidates]', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get all users (with optional role filter)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    
    // Map INTERVIEWER to MEMBER role since that's what we have in the enum
    let whereClause = {};
    if (role === 'INTERVIEWER') {
      whereClause = { role: 'MEMBER' };
    } else if (role) {
      whereClause = { role };
    }
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        graduationClass: true,
        profileImage: true
      },
      orderBy: { fullName: 'asc' }
    });
    
    res.json(users);
  } catch (error) {
    console.error('[GET /api/admin/users]', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/advance-candidate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚀 Advancing candidate ${id}...`);

    const candidate = await prisma.application.findUnique({
      where: { id }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let nextStatus;
    if (candidate.status === 'SUBMITTED') {
      nextStatus = 'UNDER_REVIEW';
    } else if (candidate.status === 'UNDER_REVIEW') {
      nextStatus = 'ACCEPTED';
    } else if (candidate.status === 'WAITLISTED') {
      nextStatus = 'UNDER_REVIEW';
    } else {
      return res.status(400).json({ error: 'Candidate cannot be advanced further' });
    }

    await prisma.application.update({
      where: { id },
      data: {
        status: nextStatus,
        approved: null
      }
    });

    res.json({ message: `Candidate advanced to ${nextStatus}` });

  } catch (error) {
    console.error(`[POST /api/admin/advance-candidate/:id]`, error);
    res.status(500).json({ error: 'Failed to advance candidate' });
  }
});

router.put('/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`Updating candidate ${id}...`, updateData);

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || key === 'rejectedAtRound') {
        delete updateData[key];
      }
    });

    if (updateData.cumulativeGpa !== undefined) {
      const gpa = parseFloat(updateData.cumulativeGpa);
      if (isNaN(gpa) || gpa < 0 || gpa > 4) {
        return res.status(400).json({ error: 'Invalid cumulative GPA' });
      }
      updateData.cumulativeGpa = gpa;
    }

    if (updateData.majorGpa !== undefined) {
      const gpa = parseFloat(updateData.majorGpa);
      if (isNaN(gpa) || gpa < 0 || gpa > 4) {
        return res.status(400).json({ error: 'Invalid major GPA' });
      }
      updateData.majorGpa = gpa;
    }

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED'];
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (updateData.currentRound && !updateData.status) {
      const statusMap = {
        'SUBMITTED': 'SUBMITTED',
        'UNDER_REVIEW': 'UNDER_REVIEW',
        'ACCEPTED': 'ACCEPTED',
        'REJECTED': 'REJECTED',
        'WAITLISTED': 'WAITLISTED'
      };
      updateData.status = statusMap[updateData.currentRound] || updateData.currentRound;
      delete updateData.currentRound;
    }

    const updatedCandidate = await prisma.application.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Candidate updated successfully',
      candidate: updatedCandidate
    });
  } catch (error) {
    console.error(`[PUT /api/admin/candidates/:id]`, error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

router.post('/reject-candidate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Rejecting candidate ${id}...`);

    await prisma.application.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved: false
      }
    });

    res.json({ message: 'Candidate rejected' });
  } catch (error) {
    console.error(`[POST /api/admin/reject-candidate/:id]`, error);
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
});

// Update approval status
router.patch('/candidates/:id/approval', async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    // Validate approved value
    if (approved !== null && typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { approved }
    });

    res.json({
      message: `Candidate ${approved === null ? 'approval reset' : approved ? 'approved' : 'rejected'} successfully`,
      candidate: updated
    });
  } catch (error) {
    console.error('[PATCH /api/admin/candidates/:id/approval]', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Advance round
router.post('/advance-round', async (req, res) => {
  try {
    console.log('Starting bulk advance...');
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    const approvedCandidates = await prisma.application.findMany({
      where: {
        cycleId: active.id,
        approved: true,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'] }
      }
    });

    console.log('Approved candidates to advance:', approvedCandidates.length);

    if (approvedCandidates.length === 0) {
      return res.status(400).json({ error: 'No approved candidates found to advance.' });
    }

    const updates = approvedCandidates.map(candidate => {
      let nextStatus;

      if (candidate.status === 'SUBMITTED') {
        nextStatus = 'UNDER_REVIEW';
      } else if (candidate.status === 'UNDER_REVIEW') {
        nextStatus = 'ACCEPTED';
      } else if (candidate.status === 'WAITLISTED') {
        nextStatus = 'UNDER_REVIEW';
      } else {
        return null;
      }

      return prisma.application.update({
        where: { id: candidate.id },
        data: {
          status: nextStatus,
          approved: null
        }
      });
    }).filter(Boolean);

    await Promise.all(updates);

    res.json({
      message: `Successfully advanced ${updates.length} candidates`,
      advancedCount: updates.length
    });

  } catch (error) {
    console.error('[POST /api/admin/advance-round]', error);
    res.status(500).json({ error: 'Failed to advance round', details: error.message });
  }
});

// Approval status of a specific candidate
router.post('/candidates/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { approved },
    });

    res.json({ success: true, updated });
  } catch (error) {
    console.error('[POST /api/admin/candidates/:id/approve]', error);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Fetch all application cycles
router.get('/cycles', async (req, res) => {
  try {
    const cycles = await prisma.recruitingCycle.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(cycles);
  } catch (error) {
    console.error('[GET /api/admin/cycles]', error);
    res.status(500).json({ error: 'Failed to fetch application cycles' });
  }
});

// Get active cycle
router.get('/cycles/active', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    res.json(active || null);
  } catch (error) {
    console.error('[GET /api/admin/cycles/active]', error);
    res.status(500).json({ error: 'Failed to fetch active cycle' });
  }
});

// Create a new cycle
router.post('/cycles', async (req, res) => {
  try {
    const { name, formUrl, startDate, endDate, isActive } = req.body;
    const created = await prisma.recruitingCycle.create({
      data: {
        name,
        formUrl: formUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: Boolean(isActive) || false,
      }
    });
    // If created as active, deactivate others
    if (created.isActive) {
      await prisma.recruitingCycle.updateMany({
        where: { id: { not: created.id }, isActive: true },
        data: { isActive: false }
      });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('[POST /api/admin/cycles]', error);
    res.status(500).json({ error: 'Failed to create cycle' });
  }
});

// Set a cycle as active
router.post('/cycles/:id/activate', async (req, res) => {
  const { id } = req.params;

  try {
    // Deactivate all current cycles
    await prisma.recruitingCycle.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Activate selected one
    const updated = await prisma.recruitingCycle.update({
      where: { id },
      data: { isActive: true }
    });

    res.json({ message: 'Cycle activated', cycle: updated });
  } catch (error) {
    console.error('[POST /api/admin/cycles/:id/activate]', error);
    res.status(500).json({ error: 'Failed to activate cycle' });
  }
});

// Update a cycle
router.patch('/cycles/:id', async (req, res) => {
  const { id } = req.params;
  const { name, formUrl, startDate, endDate, isActive } = req.body;
  try {
    const updated = await prisma.recruitingCycle.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(formUrl !== undefined ? { formUrl } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      }
    });
    if (isActive) {
      await prisma.recruitingCycle.updateMany({ where: { id: { not: id }, isActive: true }, data: { isActive: false } });
    }
    res.json(updated);
  } catch (error) {
    console.error('[PATCH /api/admin/cycles/:id]', error);
    res.status(500).json({ error: 'Failed to update cycle' });
  }
});

// Delete a cycle
router.delete('/cycles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.recruitingCycle.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/cycles/:id]', error);
    res.status(500).json({ error: 'Failed to delete cycle' });
  }
});

router.post('/reset-all', async (req, res) => {
  try {
    console.log('Resetting candidates for active cycle...');
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    await prisma.application.updateMany({
      where: { cycleId: active.id },
      data: { status: 'SUBMITTED', approved: null }
    });

    res.json({ message: 'All candidates reset to initial state' });
  } catch (error) {
    console.error('[POST /api/admin/reset-all]', error);
    res.status(500).json({ error: 'Failed to reset candidates' });
  }
});

// Profile
router.put('/profile', async (req, res) => {
  const { email, fullName, graduationClass, originalEmail } = req.body;

  try {
    if (email !== originalEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }

    const result = await prisma.user.update({
      where: { email: originalEmail },
      data: { email, fullName, graduationClass }
    });

    res.json({ message: 'Profile updated successfully', user: result });
  } catch (error) {
    console.error('[PUT /api/admin/profile]', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

router.get('/profile', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('[GET /api/admin/profile]', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Event Management Routes

// Get all events
router.get('/events', async (req, res) => {
  try {
    const events = await prisma.events.findMany({
      orderBy: { eventStartDate: 'desc' },
      include: {
        cycle: {
          select: { name: true, isActive: true }
        }
      }
    });
    res.json(events);
  } catch (error) {
    console.error('[GET /api/admin/events]', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event
router.post('/events', async (req, res) => {
  try {
    const {
      eventName,
      eventStartDate,
      eventEndDate,
      eventLocation,
      rsvpForm,
      attendanceForm,
      cycleId
    } = req.body;

    // Validate required fields
    if (!eventName || !eventStartDate || !eventEndDate || !cycleId) {
      return res.status(400).json({ error: 'Event name, start date, end date, and cycle ID are required' });
    }

    // Validate that the cycle exists
    const cycle = await prisma.recruitingCycle.findUnique({
      where: { id: cycleId }
    });

    if (!cycle) {
      return res.status(400).json({ error: 'Invalid recruiting cycle' });
    }

    const event = await prisma.events.create({
      data: {
        eventName,
        eventStartDate: new Date(eventStartDate),
        eventEndDate: new Date(eventEndDate),
        eventLocation: eventLocation || null,
        rsvpForm: rsvpForm || null,
        attendanceForm: attendanceForm || null,
        cycleId
      }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('[POST /api/admin/events]', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an event
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await prisma.events.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete the event
    await prisma.events.delete({
      where: { id }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/events/:id]', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Update an event
router.patch('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      eventName,
      eventStartDate,
      eventEndDate,
      eventLocation,
      rsvpForm,
      attendanceForm,
      cycleId
    } = req.body;

    // Check if event exists
    const existingEvent = await prisma.events.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If cycleId is being updated, validate it exists
    if (cycleId && cycleId !== existingEvent.cycleId) {
      const cycle = await prisma.recruitingCycle.findUnique({
        where: { id: cycleId }
      });

      if (!cycle) {
        return res.status(400).json({ error: 'Invalid recruiting cycle' });
      }
    }

    // Update the event
    const updatedEvent = await prisma.events.update({
      where: { id },
      data: {
        ...(eventName !== undefined && { eventName }),
        ...(eventStartDate !== undefined && { eventStartDate: new Date(eventStartDate) }),
        ...(eventEndDate !== undefined && { eventEndDate: new Date(eventEndDate) }),
        ...(eventLocation !== undefined && { eventLocation: eventLocation || null }),
        ...(rsvpForm !== undefined && { rsvpForm: rsvpForm || null }),
        ...(attendanceForm !== undefined && { attendanceForm: attendanceForm || null }),
        ...(cycleId !== undefined && { cycleId })
      }
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('[PATCH /api/admin/events/:id]', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Event Form Sync Routes

// Sync all event forms (both RSVP and attendance)
router.post('/events/sync-all', async (req, res) => {
  try {
    console.log('Admin triggering sync for all event forms...');
    const results = await syncAllEventForms();
    res.json({ 
      message: 'Event forms sync completed',
      results: results 
    });
  } catch (error) {
    console.error('[POST /api/admin/events/sync-all]', error);
    res.status(500).json({ error: 'Failed to sync event forms' });
  }
});

// Sync RSVP responses for a specific event
router.post('/events/:id/sync-rsvp', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Admin triggering RSVP sync for event ${id}...`);
    
    const result = await syncEventRSVP(id);
    res.json({ 
      message: `RSVP sync completed for event ${id}`,
      result: result 
    });
  } catch (error) {
    console.error(`[POST /api/admin/events/${req.params.id}/sync-rsvp]`, error);
    res.status(500).json({ error: 'Failed to sync event RSVP responses' });
  }
});

// Sync attendance responses for a specific event
router.post('/events/:id/sync-attendance', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Admin triggering attendance sync for event ${id}...`);
    
    const result = await syncEventAttendance(id);
    res.json({ 
      message: `Attendance sync completed for event ${id}`,
      result: result 
    });
  } catch (error) {
    console.error(`[POST /api/admin/events/${req.params.id}/sync-attendance]`, error);
    res.status(500).json({ error: 'Failed to sync event attendance responses' });
  }
});

// Get event statistics (RSVP and attendance counts)
router.get('/events/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const [event, rsvpCount, attendanceCount] = await Promise.all([
      prisma.events.findUnique({
        where: { id },
        select: { 
          eventName: true, 
          eventStartDate: true, 
          eventEndDate: true,
          rsvpForm: true,
          attendanceForm: true
        }
      }),
      prisma.eventRsvp.count({ where: { eventId: id } }),
      prisma.eventAttendance.count({ where: { eventId: id } })
    ]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      event: event,
      stats: {
        rsvpCount: rsvpCount,
        attendanceCount: attendanceCount,
        hasRsvpForm: !!event.rsvpForm,
        hasAttendanceForm: !!event.attendanceForm
      }
    });
  } catch (error) {
    console.error(`[GET /api/admin/events/${req.params.id}/stats]`, error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

// Get detailed RSVP list for an event
router.get('/events/:id/rsvps', async (req, res) => {
  try {
    const { id } = req.params;

    const rsvps = await prisma.eventRsvp.findMany({
      where: { eventId: id },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            studentId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rsvps);
  } catch (error) {
    console.error(`[GET /api/admin/events/${req.params.id}/rsvps]`, error);
    res.status(500).json({ error: 'Failed to fetch event RSVPs' });
  }
});

// Get detailed attendance list for an event
router.get('/events/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.eventAttendance.findMany({
      where: { eventId: id },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            studentId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(attendance);
  } catch (error) {
    console.error(`[GET /api/admin/events/${req.params.id}/attendance]`, error);
    res.status(500).json({ error: 'Failed to fetch event attendance' });
  }
});

// Interview Management Routes

// Get all interviews
router.get('/interviews', async (req, res) => {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        cycle: true
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(interviews);
  } catch (error) {
    console.error('[GET /api/admin/interviews]', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Create new interview
router.post('/interviews', async (req, res) => {
  try {
    const { name, type, startDate, endDate, location, maxCandidates, description, cycleId } = req.body;
    
    // Validate required fields
    if (!name || !type || !startDate || !endDate || !cycleId) {
      return res.status(400).json({ error: 'Interview name, type, start date, end date, and cycle ID are required' });
    }

    // Validate that the cycle exists
    const cycle = await prisma.recruitingCycle.findUnique({
      where: { id: cycleId }
    });

    if (!cycle) {
      return res.status(400).json({ error: 'Invalid recruiting cycle' });
    }
    
    const interview = await prisma.interview.create({
      data: {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        maxCandidates,
        description,
        cycleId
      },
      include: {
        cycle: true
      }
    });
    
    res.json(interview);
  } catch (error) {
    console.error('[POST /api/admin/interviews]', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// Delete interview
router.delete('/interviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if interview exists
    const interview = await prisma.interview.findUnique({
      where: { id }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    await prisma.interview.delete({
      where: { id }
    });
    
    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/interviews/:id]', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

// Get interview details
router.get('/interviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        cycle: true
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json(interview);
  } catch (error) {
    console.error('[GET /api/admin/interviews/:id]', error);
    res.status(500).json({ error: 'Failed to fetch interview details' });
  }
});

// Update interview configuration
router.patch('/interviews/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, config } = req.body;
    
    const interview = await prisma.interview.findUnique({
      where: { id }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Update interview with configuration
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: {
        description: JSON.stringify(config) // Store config as JSON in description field
      },
      include: {
        cycle: true
      }
    });
    
    res.json(updatedInterview);
  } catch (error) {
    console.error('[PATCH /api/admin/interviews/:id/config]', error);
    res.status(500).json({ error: 'Failed to update interview configuration' });
  }
});

// Start interview
router.post('/interviews/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const interview = await prisma.interview.findUnique({
      where: { id }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // For now, just return success. In the future, this could:
    // - Set interview status to "ACTIVE"
    // - Initialize evaluation forms
    // - Send notifications to participants
    
    res.json({ message: 'Interview started successfully' });
  } catch (error) {
    console.error('[POST /api/admin/interviews/:id/start]', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// Add evaluation
router.post('/interviews/:id/evaluations', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateId, interviewerId, scores, comments } = req.body;
    
    const interview = await prisma.interview.findUnique({
      where: { id }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Calculate overall score
    const scoreValues = Object.values(scores);
    const overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    
    // Create evaluation based on interview type
    let evaluationData = {
      score: overallScore,
      feedback: comments,
      evaluatorId: interviewerId
    };
    
    // Determine which evaluation model to use based on interview type
    if (interview.type === 'COFFEE_CHAT') {
      evaluationData.coffeeChatId = candidateId; // This would need to be adjusted based on your schema
    } else if (interview.type === 'ROUND_ONE') {
      evaluationData.roundOneId = candidateId;
    } else if (interview.type === 'ROUND_TWO') {
      evaluationData.roundTwoId = candidateId;
    }
    
    const evaluation = await prisma.evaluation.create({
      data: evaluationData
    });
    
    res.json(evaluation);
  } catch (error) {
    console.error('[POST /api/admin/interviews/:id/evaluations]', error);
    res.status(500).json({ error: 'Failed to create evaluation' });
  }
});

export default router;