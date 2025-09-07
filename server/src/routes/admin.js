import express from 'express';
import prisma from '../prismaClient.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { syncEventAttendance, syncEventRSVP, syncAllEventForms } from '../services/syncEventResponses.js';
import { sendRSVPConfirmation, sendAttendanceConfirmation, formatEventDate } from '../services/emailNotifications.js';

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

    const [totalApplicants, resumeGrades, coverLetterGrades, videoGrades, candidates] = await Promise.all([
      prisma.application.count({ where: { cycleId: active.id } }),
      prisma.resumeScore.count(),
      prisma.coverLetterScore.count(),
      prisma.videoScore.count(),
      prisma.application.findMany({
        where: {
          cycleId: active.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'] }
        },
        select: {
          currentRound: true,
          status: true
        }
      })
    ]);

    const totalGrades = resumeGrades + coverLetterGrades + videoGrades;

    // Calculate current stage based on currentRound field instead of status
    const roundCounts = candidates.reduce((acc, candidate) => {
      const round = candidate.currentRound || '1'; // Default to round 1 if no currentRound
      acc[round] = (acc[round] || 0) + 1;
      return acc;
    }, {});

    // Determine the current stage based on the most common round
    let currentRound = 'SUBMITTED';
    if (Object.keys(roundCounts).length > 0) {
      const mostCommonRound = Object.keys(roundCounts).reduce((a, b) =>
        roundCounts[a] > roundCounts[b] ? a : b
      );
      
      // Map round numbers to stage names
      const roundToStage = {
        '1': 'RESUME_REVIEW',
        '2': 'COFFEE_CHAT',
        '3': 'FIRST_ROUND',
        '4': 'FINAL_ROUND'
      };
      
      currentRound = roundToStage[mostCommonRound] || 'RESUME_REVIEW';
    }

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

// Process decisions with emails and round advancement
router.post('/process-decisions', async (req, res) => {
  try {
    console.log('Starting decision processing...');
    
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    console.log('Active cycle:', active.name);

    // Get applications in Resume Review round (currentRound = '1') only
    const applications = await prisma.application.findMany({
      where: {
        cycleId: active.id,
        currentRound: '1'
      },
      include: {
        candidate: true // Just include the candidate, no need for nested user
      }
    });

    console.log('Applications to process:', applications.length);
    console.log('Sample application:', applications[0]);

    if (applications.length === 0) {
      return res.status(400).json({ error: 'No applications found in Resume Review round.' });
    }

    // Import email functions
    let sendAcceptanceEmail, sendRejectionEmail;
    try {
      const emailModule = await import('../services/emailNotifications.js');
      sendAcceptanceEmail = emailModule.sendAcceptanceEmail;
      sendRejectionEmail = emailModule.sendRejectionEmail;
      console.log('Email services imported successfully');
      
      // Verify the functions exist
      if (typeof sendAcceptanceEmail !== 'function' || typeof sendRejectionEmail !== 'function') {
        throw new Error('Email service functions not found');
      }
    } catch (importError) {
      console.error('Failed to import email services:', importError);
      return res.status(500).json({ 
        error: 'Failed to import email services', 
        details: importError.message 
      });
    }

    const results = {
      accepted: [],
      rejected: [],
      errors: [],
      emailsSent: 0,
      emailsFailed: 0
    };

    // Process each application
    for (const application of applications) {
      try {
        if (!application.candidate) {
          results.errors.push({
            applicationId: application.id,
            candidateName: `${application.firstName} ${application.lastName}`,
            error: 'No candidate associated with application'
          });
          continue;
        }

        console.log(`Processing application ${application.id} for candidate ${application.candidate.id}: ${application.firstName} ${application.lastName}`);
        
        // Get the decision from the database (approved field)
        let decision = null;
        if (application.approved === true) {
          decision = 'yes';
        } else if (application.approved === false) {
          decision = 'no';
        }
        // Note: approved === null means no decision or intermediate decision (maybe_yes/maybe_no)
        
        console.log(`Application ${application.id}: decision = ${decision} (approved = ${application.approved})`);
        
        if (!decision) {
          // Check if there's a comment indicating an intermediate decision
          const latestComment = await prisma.comment.findFirst({
            where: { applicationId: application.id },
            orderBy: { createdAt: 'desc' }
          });
          
          let errorMessage = 'No decision provided (approved field is null)';
          if (latestComment && latestComment.content.includes('Maybe -')) {
            errorMessage = 'Intermediate decision provided (Maybe - Yes/No) - needs final decision';
          }
          
          results.errors.push({
            applicationId: application.id,
            candidateId: application.candidate.id,
            candidateName: `${application.firstName} ${application.lastName}`,
            error: errorMessage
          });
          continue;
        }

        if (decision === 'yes') {
          // Accept candidate - advance to coffee chat round
          console.log(`Updating application ${application.id} to coffee chat round`);
          
          const updatedApp = await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'UNDER_REVIEW', // This represents coffee chat round
              currentRound: '2', // Coffee chat round
              approved: null // reset for new round decisions
            }
          });
          
          console.log(`Application ${application.id} updated successfully:`, {
            id: updatedApp.id,
            status: updatedApp.status,
            currentRound: updatedApp.currentRound,
            approved: updatedApp.approved
          });

          // Send acceptance email
          let emailResult;
          try {
            emailResult = await sendAcceptanceEmail(
              application.email, // Use application email
              `${application.firstName} ${application.lastName}`,
              active.name
            );
            console.log(`Acceptance email result for ${application.email}:`, emailResult);
          } catch (emailError) {
            console.error(`Error sending acceptance email to ${application.email}:`, emailError);
            emailResult = { success: false, error: emailError.message };
          }

          if (emailResult.success) {
            results.emailsSent++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }

        } else if (decision === 'no') {
          // Reject candidate
          await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'REJECTED',
              currentRound: '1', // Resume review round (final)
              approved: false
            }
          });

          // Send rejection email
          const emailResult = await sendRejectionEmail(
            application.email, // Use application email
            `${application.firstName} ${application.lastName}`,
            active.name
          );

          console.log(`Rejection email result for ${application.email}:`, emailResult);

          if (emailResult.success) {
            results.emailsSent++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }

        } else {
          // Invalid decision
          results.errors.push({
            applicationId: application.id,
            candidateId: application.candidate.id,
            candidateName: `${application.firstName} ${application.lastName}`,
            error: `Invalid decision: ${decision}`
          });
        }

      } catch (error) {
        console.error(`Error processing application ${application.id}:`, error);
        results.errors.push({
          applicationId: application.id,
          candidateId: application.candidate?.id,
          candidateName: application.candidate ? `${application.firstName} ${application.lastName}` : 'Unknown',
          error: error.message
        });
      }
    }

    console.log('Decision processing completed:', results);
    console.log('Summary:', {
      totalApplications: applications.length,
      accepted: results.accepted.length,
      rejected: results.rejected.length,
      errors: results.errors.length,
      emailsSent: results.emailsSent,
      emailsFailed: results.emailsFailed
    });

    res.json({
      message: 'Decision processing completed',
      results,
      summary: {
        totalApplications: applications.length,
        accepted: results.accepted.length,
        rejected: results.rejected.length,
        errors: results.errors.length,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed
      }
    });

  } catch (error) {
    console.error('[POST /api/admin/process-decisions]', error);
    
    // Ensure we always return valid JSON with detailed error information
    const errorResponse = {
      error: 'Failed to process decisions',
      details: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.error('Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
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
  try {
    // Get current user from authentication middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        graduationClass: true,
        role: true,
        studentId: true,
        profileImage: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
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
      showToCandidates,
      memberRsvpUrl,
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
        showToCandidates: showToCandidates || false,
        memberRsvpUrl: memberRsvpUrl || null,
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
      showToCandidates,
      memberRsvpUrl,
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
        ...(showToCandidates !== undefined && { showToCandidates }),
        ...(memberRsvpUrl !== undefined && { memberRsvpUrl: memberRsvpUrl || null }),
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
    console.error('[GET /api/admin/interviews]', {
      message: error?.message,
      code: error?.code,
    });
    // If the interviews table/columns do not exist yet, return an empty list
    if (error?.code === 'P2021' || error?.code === 'P2022') {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Create new interview
router.post('/interviews', async (req, res) => {
  try {
    const {
      title,
      interviewType,
      startDate,
      endDate,
      location,
      maxCandidates,
      description,
      cycleId,
      dresscode,
      deliberationsStart,
      deliberationsEnd
    } = req.body;

    // Validate required fields
    if (!title || !interviewType || !startDate || !endDate || !cycleId) {
      return res.status(400).json({ error: 'Interview title, interviewType, start date, end date, and cycle ID are required' });
    }

    // Validate that the cycle exists
    const cycle = await prisma.recruitingCycle.findUnique({
      where: { id: cycleId }
    });

    if (!cycle) {
      return res.status(400).json({ error: 'Invalid recruiting cycle' });
    }

    const createdBy = req.user?.id;
    if (!createdBy) {
      return res.status(401).json({ error: 'Authenticated user required' });
    }
    // Ensure creator exists (avoid FK violation P2003)
    const creator = await prisma.user.findUnique({ where: { id: createdBy } });
    if (!creator) {
      return res.status(400).json({ error: 'Creator user not found' });
    }

    const interview = await prisma.interview.create({
      data: {
        title,
        interviewType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        maxCandidates: maxCandidates ?? null,
        description: typeof description === 'object' ? JSON.stringify(description) : (description ?? null),
        cycleId,
        createdBy,
        dresscode: dresscode ?? null,
        deliberationsStart: deliberationsStart ? new Date(deliberationsStart) : null,
        deliberationsEnd: deliberationsEnd ? new Date(deliberationsEnd) : null
      },
      include: {
        cycle: true
      }
    });

    res.json(interview);
  } catch (error) {
    console.error('[POST /api/admin/interviews]', {
      message: error?.message,
      code: error?.code,
    });
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid reference: cycleId or createdBy does not exist' });
    }
    if (error?.code === 'P2021' || error?.code === 'P2022') {
      return res.status(400).json({ error: 'Interview schema not found. Run migrations to create interview tables.' });
    }
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
    // Delete dependent records first to satisfy FK constraints
    const ops = [];
    if (prisma.interviewAssignment?.deleteMany) {
      ops.push(prisma.interviewAssignment.deleteMany({ where: { interviewId: id } }));
    }
    if (prisma.interviewActionItem?.deleteMany) {
      ops.push(prisma.interviewActionItem.deleteMany({ where: { interviewId: id } }));
    }
    if (prisma.interviewEvaluation?.deleteMany) {
      ops.push(prisma.interviewEvaluation.deleteMany({ where: { interviewId: id } }));
    }
    if (prisma.firstRoundInterviewEvaluation?.deleteMany) {
      ops.push(prisma.firstRoundInterviewEvaluation.deleteMany({ where: { interviewId: id } }));
    }
    ops.push(prisma.interview.delete({ where: { id } }));
    await prisma.$transaction(ops);

    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/interviews/:id]', error);
    if (error?.code === 'P2003') {
      return res.status(409).json({ error: 'Cannot delete interview due to related records' });
    }
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

// Get interview action items
router.get('/interviews/:id/action-items', async (req, res) => {
  try {
    const { id } = req.params;
    
    const actionItems = await prisma.interviewActionItem.findMany({
      where: { interviewId: id },
      orderBy: { order: 'asc' },
      include: {
        completedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    res.json(actionItems);
  } catch (error) {
    console.error('[GET /api/admin/interviews/:id/action-items]', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

// Create interview action item
router.post('/interviews/:id/action-items', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const actionItem = await prisma.interviewActionItem.create({
      data: {
        interviewId: id,
        title,
        description: description || null,
        order: order || 0
      },
      include: {
        completedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    res.json(actionItem);
  } catch (error) {
    console.error('[POST /api/admin/interviews/:id/action-items]', error);
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

// Update interview action item
router.patch('/interviews/:id/action-items/:actionItemId', async (req, res) => {
  try {
    const { id, actionItemId } = req.params;
    const { title, description, isCompleted, order } = req.body;
    
    const actionItem = await prisma.interviewActionItem.update({
      where: { 
        id: actionItemId,
        interviewId: id // Ensure the action item belongs to this interview
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isCompleted !== undefined && { 
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedBy: isCompleted ? req.user?.id : null
        }),
        ...(order !== undefined && { order })
      },
      include: {
        completedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    res.json(actionItem);
  } catch (error) {
    console.error('[PATCH /api/admin/interviews/:id/action-items/:actionItemId]', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// Delete interview action item
router.delete('/interviews/:id/action-items/:actionItemId', async (req, res) => {
  try {
    const { id, actionItemId } = req.params;
    
    await prisma.interviewActionItem.delete({
      where: { 
        id: actionItemId,
        interviewId: id // Ensure the action item belongs to this interview
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/interviews/:id/action-items/:actionItemId]', error);
    res.status(500).json({ error: 'Failed to delete action item' });
  }
});

// Get interview resources
router.get('/interviews/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get resources that are associated with this interview
    // For now, we'll get all resources and filter by round/interview type
    const interview = await prisma.interview.findUnique({
      where: { id },
      select: { interviewType: true }
    });
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    const resources = await prisma.interviewResource.findMany({
      where: { 
        round: interview.interviewType,
        isActive: true
      },
      orderBy: { order: 'asc' }
    });
    
    res.json(resources);
  } catch (error) {
    console.error('[GET /api/admin/interviews/:id/resources]', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Create interview resource
router.post('/interviews/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, fileUrl, type, category, icon, order } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const interview = await prisma.interview.findUnique({
      where: { id },
      select: { interviewType: true }
    });
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    const resource = await prisma.interviewResource.create({
      data: {
        title,
        description: description || null,
        url: url || null,
        fileUrl: fileUrl || null,
        type: type || null,
        category: category || null,
        icon: icon || 'book',
        order: order || 0,
        round: interview.interviewType,
        createdBy: req.user?.id || 'system'
      }
    });
    
    res.json(resource);
  } catch (error) {
    console.error('[POST /api/admin/interviews/:id/resources]', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// Update interview resource
router.patch('/interviews/:id/resources/:resourceId', async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const { title, description, url, fileUrl, type, category, icon, order, isActive } = req.body;
    
    const resource = await prisma.interviewResource.update({
      where: { id: resourceId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });
    
    res.json(resource);
  } catch (error) {
    console.error('[PATCH /api/admin/interviews/:id/resources/:resourceId]', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete interview resource
router.delete('/interviews/:id/resources/:resourceId', async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    await prisma.interviewResource.delete({
      where: { id: resourceId }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/interviews/:id/resources/:resourceId]', error);
    res.status(500).json({ error: 'Failed to delete resource' });
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

// Get all applications for admin document grading
router.get('/applications', async (req, res) => {
  try {
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.json([]);
    }

    // Get all applications for the active cycle directly
    const applications = await prisma.application.findMany({
      where: {
        cycleId: activeCycle.id
      },
      include: {
        candidate: {
          select: {
            id: true,
            assignedGroupId: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Get all groups and their members for the active cycle
    const groups = await prisma.groups.findMany({
      where: {
        cycleId: activeCycle.id
      },
      select: {
        id: true,
        memberOne: true,
        memberTwo: true,
        memberThree: true
      }
    });

    // Get all grading records for these candidates
    const resumeScores = await prisma.resumeScore.findMany({
      where: {
        candidateId: {
          in: applications.map(app => app.candidateId)
        }
      },
      select: {
        candidateId: true,
        evaluatorId: true,
        assignedGroupId: true
      }
    });

    const coverLetterScores = await prisma.coverLetterScore.findMany({
      where: {
        candidateId: {
          in: applications.map(app => app.candidateId)
        }
      },
      select: {
        candidateId: true,
        evaluatorId: true,
        assignedGroupId: true
      }
    });

    const videoScores = await prisma.videoScore.findMany({
      where: {
        candidateId: {
          in: applications.map(app => app.candidateId)
        }
      },
      select: {
        candidateId: true,
        evaluatorId: true,
        assignedGroupId: true
      }
    });

    // Helper function to check team completion and get missing grades count
    const checkTeamCompletion = (candidateId, groupId, scores, scoreType) => {
      if (!groupId) return { completed: false, missingGrades: 0, totalMembers: 0 };
      
      const group = groups.find(g => g.id === groupId);
      if (!group) return { completed: false, missingGrades: 0, totalMembers: 0 };
      
      // Get all assigned team members (filter out null/undefined)
      const teamMembers = [group.memberOne, group.memberTwo, group.memberThree].filter(Boolean);
      if (teamMembers.length === 0) return { completed: false, missingGrades: 0, totalMembers: 0 };
      
      // Get scores for this candidate and group
      const candidateScores = scores.filter(score => 
        score.candidateId === candidateId && score.assignedGroupId === groupId
      );
      
      // Check if all team members have completed their scores
      const completedEvaluators = candidateScores.map(score => score.evaluatorId);
      const allMembersCompleted = teamMembers.every(memberId => 
        completedEvaluators.includes(memberId)
      );
      
      const missingGrades = teamMembers.length - completedEvaluators.length;
      
      return {
        completed: allMembersCompleted,
        missingGrades,
        totalMembers: teamMembers.length
      };
    };

    // Transform the data
    const transformedApplications = [];
    
    applications.forEach(app => {
      const resumeStatus = checkTeamCompletion(app.candidateId, app.candidate.assignedGroupId, resumeScores, 'resume');
      const coverLetterStatus = checkTeamCompletion(app.candidateId, app.candidate.assignedGroupId, coverLetterScores, 'coverLetter');
      const videoStatus = checkTeamCompletion(app.candidateId, app.candidate.assignedGroupId, videoScores, 'video');
      
      transformedApplications.push({
        id: app.id,
        candidateId: app.candidateId,
        name: `${app.firstName} ${app.lastName}`,
        major: app.major1 || 'N/A',
        year: app.graduationYear || 'N/A',
        gpa: app.cumulativeGpa?.toString() || 'N/A',
        status: app.status || 'SUBMITTED',
        approved: app.approved, // Add approved field for decision status
        email: app.email,
        submittedAt: app.submittedAt,
        gender: app.gender || 'N/A',
        isFirstGeneration: app.isFirstGeneration,
        isTransferStudent: app.isTransferStudent,
        resumeUrl: app.resumeUrl,
        coverLetterUrl: app.coverLetterUrl,
        videoUrl: app.videoUrl,
        hasResumeScore: resumeStatus.completed,
        hasCoverLetterScore: coverLetterStatus.completed,
        hasVideoScore: videoStatus.completed,
        resumeMissingGrades: resumeStatus.missingGrades,
        coverLetterMissingGrades: coverLetterStatus.missingGrades,
        videoMissingGrades: videoStatus.missingGrades,
        resumeTotalMembers: resumeStatus.totalMembers,
        coverLetterTotalMembers: coverLetterStatus.totalMembers,
        videoTotalMembers: videoStatus.totalMembers
      });
    });

    res.json(transformedApplications);
  } catch (error) {
    console.error('Error fetching admin applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Test email notifications endpoint
router.post('/test-email-notifications', async (req, res) => {
  try {
    const { eventId, type, candidateEmail } = req.body;
    
    if (!eventId || !type || !candidateEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, type, candidateEmail' 
      });
    }
    
    if (!['rsvp', 'attendance'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "rsvp" or "attendance"' 
      });
    }
    
    // Get event details
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get candidate details
    const candidate = await prisma.candidate.findUnique({
      where: { email: candidateEmail }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const eventDate = formatEventDate(event.eventStartDate);
    
    let result;
    if (type === 'rsvp') {
      result = await sendRSVPConfirmation(
        candidateEmail,
        candidateName,
        event.eventName,
        eventDate,
        event.eventLocation
      );
    } else {
      result = await sendAttendanceConfirmation(
        candidateEmail,
        candidateName,
        event.eventName,
        eventDate,
        event.eventLocation
      );
    }
    
    if (result.success) {
      res.json({ 
        message: `${type.toUpperCase()} confirmation email sent successfully`,
        details: result
      });
    } else {
      res.status(500).json({ 
        error: `Failed to send ${type} confirmation email`,
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('[POST /api/admin/test-email-notifications]', error);
    res.status(500).json({ error: 'Failed to send test email notification' });
  }
});

// Test email service
router.post('/test-email', async (req, res) => {
  try {
    const { sendAcceptanceEmail, sendRejectionEmail } = await import('../services/emailNotifications.js');
    
    // Test acceptance email
    const acceptanceResult = await sendAcceptanceEmail(
      'test@example.com',
      'Test Candidate',
      'Test Cycle 2025'
    );
    
    // Test rejection email
    const rejectionResult = await sendRejectionEmail(
      'test@example.com',
      'Test Candidate',
      'Test Cycle 2025'
    );
    
    res.json({
      message: 'Email test completed',
      acceptance: acceptanceResult,
      rejection: rejectionResult
    });
    
  } catch (error) {
    console.error('[POST /api/admin/test-email]', error);
    res.status(500).json({ error: 'Failed to test email service', details: error.message });
  }
});

// Staging endpoints

// Get staging candidates with comprehensive data
router.get('/staging/candidates', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.json([]);
    }

    const applications = await prisma.application.findMany({
      where: { cycleId: active.id },
      include: {
        candidate: {
          include: {
            assignedGroup: {
              select: {
                id: true,
                memberOneUser: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                },
                memberTwoUser: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                },
                memberThreeUser: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                }
              }
            },
            eventAttendance: {
              include: {
                event: true
              }
            },
            eventRsvp: {
              include: {
                event: true
              }
            },
            resumeScores: {
              include: {
                evaluator: {
                  select: {
                    fullName: true
                  }
                }
              }
            },
            coverLetterScores: {
              include: {
                evaluator: {
                  select: {
                    fullName: true
                  }
                }
              }
            },
            videoScores: {
              include: {
                evaluator: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    const stagingCandidates = await Promise.all(applications.map(async app => {
      // Calculate average scores
      const resumeScores = app.candidate.resumeScores.map(s => s.overallScore);
      const coverLetterScores = app.candidate.coverLetterScores.map(s => s.overallScore);
      const videoScores = app.candidate.videoScores.map(s => s.overallScore);

      const avgResume = resumeScores.length > 0 ? 
        resumeScores.reduce((a, b) => a + b, 0) / resumeScores.length : 0;
      const avgCoverLetter = coverLetterScores.length > 0 ? 
        coverLetterScores.reduce((a, b) => a + b, 0) / coverLetterScores.length : 0;
      const avgVideo = videoScores.length > 0 ? 
        videoScores.reduce((a, b) => a + b, 0) / videoScores.length : 0;

      let overallScore = [avgResume, avgCoverLetter, avgVideo]
        .filter(score => score > 0)
        .reduce((a, b) => a + b, 0) / 3;

      // Add referral bonus if candidate has a referral
      const referral = await prisma.referral.findFirst({
        where: { candidateId: app.candidateId }
      });
      if (referral) {
        overallScore += 5;
      }

      // Add event points contribution (raw points, not scaled)
      const eventAttendance = await prisma.eventAttendance.findMany({
        where: { candidateId: app.candidateId },
        include: { event: true }
      });

      const totalEventPoints = eventAttendance.reduce((sum, attendance) => {
        return sum + (attendance.event.points || 0);
      }, 0);

      overallScore += totalEventPoints;

      // Build attendance object
      const attendance = {};
      app.candidate.eventAttendance.forEach(att => {
        attendance[att.event.eventName] = true;
      });

      // Use the actual currentRound from the database, fallback to status-based calculation
      let currentRound = app.currentRound ? parseInt(app.currentRound) : 1; // Default to Resume Review
      if (!app.currentRound) {
        // Fallback logic for legacy applications without currentRound
        if (app.status === 'UNDER_REVIEW') currentRound = 2; // First Interview
        else if (app.status === 'ACCEPTED') currentRound = 4; // Final Decision
        else if (app.status === 'REJECTED') currentRound = 4; // Final Decision
      }

      // Build review team information
      let reviewTeam = null;
      if (app.candidate.assignedGroup) {
        const members = [
          app.candidate.assignedGroup.memberOneUser,
          app.candidate.assignedGroup.memberTwoUser,
          app.candidate.assignedGroup.memberThreeUser
        ].filter(Boolean);

        reviewTeam = {
          id: app.candidate.assignedGroup.id,
          name: members.length > 0 
            ? `Team ${app.candidate.assignedGroup.id.slice(-4)} (${members.map(m => m.fullName.split(' ')[0]).join(', ')})`
            : `Team ${app.candidate.assignedGroup.id.slice(-4)}`,
          members: members,
          memberCount: members.length
        };
      }

      return {
        id: app.id,
        candidateId: app.candidateId,
        firstName: app.firstName,
        lastName: app.lastName,
        email: app.email,
        studentId: app.studentId,
        major: app.major1,
        graduationYear: app.graduationYear,
        cumulativeGpa: parseFloat(app.cumulativeGpa),
        majorGpa: parseFloat(app.majorGpa),
        status: app.status,
        currentRound,
        submittedAt: app.submittedAt,
        isTransferStudent: app.isTransferStudent,
        isFirstGeneration: app.isFirstGeneration,
        gender: app.gender,
        phoneNumber: app.phoneNumber,
        attendance,
        reviewTeam,
        scores: {
          resume: parseFloat(avgResume.toFixed(1)),
          coverLetter: parseFloat(avgCoverLetter.toFixed(1)),
          video: parseFloat(avgVideo.toFixed(1)),
          overall: parseFloat(overallScore.toFixed(1))
        },
        decisions: {
          resumeReview: app.status === 'SUBMITTED' ? null : 'ADVANCE',
          firstInterview: app.status === 'UNDER_REVIEW' ? null : 
                         app.status === 'ACCEPTED' || app.status === 'REJECTED' ? 'ADVANCE' : null,
          secondInterview: app.status === 'ACCEPTED' || app.status === 'REJECTED' ? 'ADVANCE' : null,
          final: app.status === 'ACCEPTED' ? 'ACCEPT' : 
                 app.status === 'REJECTED' ? 'REJECT' : null
        },
        notes: ''
      };
    }));

    res.json(stagingCandidates);
  } catch (error) {
    console.error('[GET /api/admin/staging/candidates]', error);
    res.status(500).json({ error: 'Failed to fetch staging candidates' });
  }
});

// Update candidate status for staging
router.patch('/staging/candidates/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await prisma.application.update({
      where: { id },
      data: { 
        status,
        approved: status === 'ACCEPTED' ? true : status === 'REJECTED' ? false : null
      }
    });

    // Add comment if notes provided
    if (notes && notes.trim()) {
      await prisma.comment.create({
        data: {
          applicationId: id,
          userId: req.user.id,
          content: notes
        }
      });
    }

    res.json(application);
  } catch (error) {
    console.error('[PATCH /api/admin/staging/candidates/:id/status]', error);
    res.status(500).json({ error: 'Failed to update candidate status' });
  }
});

// Submit final decision
router.post('/staging/candidates/:id/final-decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, feedback } = req.body;

    const status = decision === 'ACCEPT' ? 'ACCEPTED' : 
                   decision === 'REJECT' ? 'REJECTED' : 'WAITLISTED';

    const application = await prisma.application.update({
      where: { id },
      data: { 
        status,
        approved: decision === 'ACCEPT' ? true : decision === 'REJECT' ? false : null
      }
    });

    // Add comment if feedback provided
    if (feedback && feedback.trim()) {
      await prisma.comment.create({
        data: {
          applicationId: id,
          userId: req.user.id,
          content: `Final Decision: ${decision}. Feedback: ${feedback}`
        }
      });
    }

    res.json(application);
  } catch (error) {
    console.error('[POST /api/admin/staging/candidates/:id/final-decision]', error);
    res.status(500).json({ error: 'Failed to submit final decision' });
  }
});

// Get interview rounds configuration
router.get('/interview-rounds', async (req, res) => {
  try {
    const rounds = [
      { id: 1, name: 'Resume Review', status: 'completed' },
      { id: 2, name: 'First Interview', status: 'active' },
      { id: 3, name: 'Second Interview', status: 'pending' },
      { id: 4, name: 'Final Decision', status: 'pending' }
    ];

    res.json(rounds);
  } catch (error) {
    console.error('[GET /api/admin/interview-rounds]', error);
    res.status(500).json({ error: 'Failed to fetch interview rounds' });
  }
});

// Get review teams for filtering
router.get('/review-teams', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.json([]);
    }

    const reviewTeams = await prisma.groups.findMany({
      where: { cycleId: active.id },
      select: {
        id: true,
        memberOneUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        memberTwoUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        memberThreeUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform to include team name and member count
    const transformedTeams = reviewTeams.map(team => {
      const members = [
        team.memberOneUser,
        team.memberTwoUser,
        team.memberThreeUser
      ].filter(Boolean);

      const teamName = members.length > 0 
        ? `Team ${team.id.slice(-4)} (${members.map(m => m.fullName.split(' ')[0]).join(', ')})`
        : `Team ${team.id.slice(-4)}`;

      return {
        id: team.id,
        name: teamName,
        members: members,
        memberCount: members.length
      };
    });

    res.json(transformedTeams);
  } catch (error) {
    console.error('[GET /api/admin/review-teams]', error);
    res.status(500).json({ error: 'Failed to fetch review teams' });
  }
});

// Advance candidate to next round
router.post('/staging/candidates/:id/advance-round', async (req, res) => {
  try {
    const { id } = req.params;
    const { roundNumber } = req.body;

    // Determine next status based on round
    let nextStatus;
    if (roundNumber === 1) nextStatus = 'UNDER_REVIEW';
    else if (roundNumber === 2) nextStatus = 'UNDER_REVIEW'; // Could be different for second interview
    else if (roundNumber === 3) nextStatus = 'UNDER_REVIEW'; // Could be different for final round
    else nextStatus = 'ACCEPTED';

    const application = await prisma.application.update({
      where: { id },
      data: { status: nextStatus }
    });

    res.json(application);
  } catch (error) {
    console.error('[POST /api/admin/staging/candidates/:id/advance-round]', error);
    res.status(500).json({ error: 'Failed to advance candidate' });
  }
});

// Save individual decision
router.post('/save-decision', async (req, res) => {
  try {
    const { candidateId, decision, phase } = req.body;
    
    console.log('Saving decision:', { candidateId, decision, phase });
    
    if (!candidateId || !decision) {
      return res.status(400).json({ error: 'Missing required fields: candidateId and decision' });
    }

    // Find the application for this candidate in the active cycle
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    // Find the application - the candidateId parameter is actually the application ID
    const application = await prisma.application.findFirst({
      where: {
        id: candidateId, // Use the ID directly as it's the application ID
        cycleId: active.id
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found for this ID and cycle' });
    }

    console.log('Found application:', application.id, 'for candidate:', application.candidateId);

    // Save the decision based on the value
    let updateData = {};
    
    // Get user ID if available (from authentication middleware)
    const userId = req.user?.id || 'system';
    
    console.log('Processing decision:', decision, 'for application:', application.id);
    
    if (decision === 'yes') {
      updateData = {
        approved: true,
        // Store the decision in a comment for tracking
        comments: {
          create: {
            content: `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: Yes - Advanced to next round`,
            userId: userId
          }
        }
      };
    } else if (decision === 'no') {
      updateData = {
        approved: false,
        comments: {
          create: {
            content: `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: No - Not advanced`,
            userId: userId
          }
        }
      };
    } else if (decision === 'maybe_yes') {
      updateData = {
        approved: null, // Keep as null for intermediate decision
        comments: {
          create: {
            content: `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: Maybe - Yes (needs final decision)`,
            userId: userId
          }
        }
      };
    } else if (decision === 'maybe_no') {
      updateData = {
        approved: null, // Keep as null for intermediate decision
        comments: {
          create: {
            content: `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: Maybe - No (needs final decision)`,
            userId: userId
          }
        }
      };
    }

    console.log('Update data:', updateData);

    // Update the application
    console.log('Updating application with data:', updateData);
    
    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: updateData
    });

    console.log('Decision saved successfully for application:', updatedApplication.id);
    console.log('Updated application data:', {
      id: updatedApplication.id,
      approved: updatedApplication.approved,
      status: updatedApplication.status
    });

    res.json({
      success: true,
      message: 'Decision saved successfully',
      application: updatedApplication
    });

  } catch (error) {
    console.error('[POST /api/admin/save-decision]', error);
    res.status(500).json({ error: 'Failed to save decision', details: error.message });
  }
});

// Get existing decisions for the active cycle
router.get('/existing-decisions', async (req, res) => {
  try {
    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.json({ decisions: {} });
    }

    // Get all applications for the current cycle
    const applications = await prisma.application.findMany({
      where: {
        cycleId: active.id
      },
      select: {
        id: true,
        candidateId: true,
        approved: true
      }
    });

    // Convert to decisions object using application ID as key (matches frontend usage)
    const decisions = {};
    applications.forEach(app => {
      if (app.approved === true) {
        decisions[app.id] = 'yes'; // Use application ID as key
      } else if (app.approved === false) {
        decisions[app.id] = 'no'; // Use application ID as key
      }
      // Note: approved === null means no decision yet
    });

    res.json({ decisions });
  } catch (error) {
    console.error('[GET /api/admin/existing-decisions]', error);
    res.status(500).json({ error: 'Failed to fetch existing decisions', details: error.message });
  }
});

// Get applications for interview groups
router.get('/interviews/:id/applications', async (req, res) => {
  try {
    const { id: interviewId } = req.params;
    const { groupIds } = req.query;
    
    if (!groupIds) {
      return res.status(400).json({ error: 'Group IDs are required' });
    }
    
    const groupIdArray = groupIds.split(',');
    
    // Get interview configuration
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Parse interview configuration
    let config = {};
    try {
      config = typeof interview.description === 'string' 
        ? JSON.parse(interview.description) 
        : interview.description || {};
    } catch (e) {
      console.warn('Failed to parse interview description:', e);
    }
    
    // Get applications from selected groups
    const applicationIds = new Set();
    config.applicationGroups?.forEach(group => {
      if (groupIdArray.includes(group.id)) {
        group.applicationIds?.forEach(appId => applicationIds.add(appId));
      }
    });
    
    if (applicationIds.size === 0) {
      return res.json([]);
    }
    
    // Fetch applications
    const applications = await prisma.application.findMany({
      where: {
        id: { in: Array.from(applicationIds) }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        major1: true,
        graduationYear: true,
        resumeUrl: true,
        coverLetterUrl: true,
        videoUrl: true
      }
    });
    
    // Transform applications to include name field
    const transformedApplications = applications.map(app => ({
      ...app,
      name: `${app.firstName} ${app.lastName}`,
      major: app.major1,
      year: app.graduationYear
    }));
    
    res.json(transformedApplications);
  } catch (error) {
    console.error('[GET /api/admin/interviews/:id/applications]', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Get interview evaluations
router.get('/interviews/:id/evaluations', async (req, res) => {
  try {
    const { id: interviewId } = req.params;
    
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { interviewId },
      include: {
        rubricScores: true
      }
    });
    
    res.json(evaluations);
  } catch (error) {
    console.error('[GET /api/admin/interviews/:id/evaluations]', error);
    res.status(500).json({ error: 'Failed to fetch evaluations', details: error.message });
  }
});

// Create or update interview evaluation
router.post('/interviews/:id/evaluations', async (req, res) => {
  try {
    const { id: interviewId } = req.params;
    const { applicationId, notes, decision, rubricScores } = req.body;
    const evaluatorId = req.user.id;
    
    console.log('Creating evaluation:', { interviewId, applicationId, evaluatorId, decision, rubricScores });
    
    // Validate required fields
    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }
    
    // Check if evaluation already exists
    const existingEvaluation = await prisma.interviewEvaluation.findFirst({
      where: {
        interviewId,
        applicationId,
        evaluatorId
      },
      include: {
        rubricScores: true
      }
    });
    
    if (existingEvaluation) {
      // Update existing evaluation
      const updatedEvaluation = await prisma.interviewEvaluation.update({
        where: { id: existingEvaluation.id },
        data: {
          notes,
          decision
        }
      });
      
      // Update rubric scores
      if (rubricScores) {
        for (const [category, score] of Object.entries(rubricScores)) {
          await prisma.interviewRubricScore.upsert({
            where: {
              evaluationId_category: {
                evaluationId: existingEvaluation.id,
                category
              }
            },
            update: { score },
            create: {
              evaluationId: existingEvaluation.id,
              category,
              score
            }
          });
        }
      }
      
      res.json(updatedEvaluation);
    } else {
      // Create new evaluation
      const newEvaluation = await prisma.interviewEvaluation.create({
        data: {
          interviewId,
          applicationId,
          evaluatorId,
          notes,
          decision
        }
      });
      
      // Create rubric scores
      if (rubricScores) {
        for (const [category, score] of Object.entries(rubricScores)) {
          await prisma.interviewRubricScore.create({
            data: {
              evaluationId: newEvaluation.id,
              category,
              score
            }
          });
        }
      }
      
      res.json(newEvaluation);
    }
  } catch (error) {
    console.error('[POST /api/admin/interviews/:id/evaluations]', error);
    console.error('Request body:', req.body);
    console.error('User ID:', req.user?.id);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  }
});

// Get interview evaluations for a specific application
router.get('/applications/:id/interview-evaluations', async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { applicationId },
      include: {
        interview: {
          select: {
            id: true,
            title: true,
            interviewType: true,
            startDate: true,
            endDate: true
          }
        },
        evaluator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        rubricScores: {
          orderBy: { category: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(evaluations);
  } catch (error) {
    console.error('[GET /api/admin/applications/:id/interview-evaluations]', error);
    res.status(500).json({ error: 'Failed to fetch interview evaluations', details: error.message });
  }
});

// Get evaluation summaries for multiple applications
router.post('/applications/evaluation-summaries', async (req, res) => {
  try {
    const { applicationIds } = req.body;
    
    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ error: 'applicationIds array is required' });
    }
    
    const summaries = {};
    
    // Fetch evaluations for all applications
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { 
        applicationId: { in: applicationIds }
      },
      select: {
        id: true,
        applicationId: true,
        decision: true,
        createdAt: true,
        interview: {
          select: {
            interviewType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Group evaluations by application ID
    evaluations.forEach(evaluation => {
      if (!summaries[evaluation.applicationId]) {
        summaries[evaluation.applicationId] = {
          evaluations: []
        };
      }
      summaries[evaluation.applicationId].evaluations.push(evaluation);
    });
    
    res.json(summaries);
  } catch (error) {
    console.error('[POST /api/admin/applications/evaluation-summaries]', error);
    res.status(500).json({ error: 'Failed to fetch evaluation summaries', details: error.message });
  }
});

// Process Coffee Chat decisions with emails and advancement to First Round
router.post('/process-coffee-decisions', async (req, res) => {
  try {
    console.log('Starting coffee chat decision processing...');

    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    console.log('Active cycle:', active.name);

    // Get applications in Coffee Chat round (currentRound = '2') with clear decisions only
    const allApplications = await prisma.application.findMany({
      where: {
        cycleId: active.id,
        currentRound: '2'
      },
      include: {
        candidate: true
      }
    });

    // Filter to only applications with clear Yes/No decisions (approved field is true or false)
    const applications = allApplications.filter(app => app.approved === true || app.approved === false);

    console.log('Total coffee chat applications:', allApplications.length);
    console.log('Coffee chat applications with clear decisions:', applications.length);

    if (applications.length === 0) {
      const unclearDecisions = allApplications.filter(app => app.approved === null || (app.approved !== true && app.approved !== false));
      return res.status(400).json({ 
        error: 'No applications with clear decisions found in Coffee Chat round.',
        details: `${unclearDecisions.length} applications have unclear decisions (Maybe/Unsure) and cannot be processed.`
      });
    }

    let sendCoffeeChatAcceptanceEmail, sendCoffeeChatRejectionEmail;
    try {
      const emailModule = await import('../services/emailNotifications.js');
      sendCoffeeChatAcceptanceEmail = emailModule.sendCoffeeChatAcceptanceEmail;
      sendCoffeeChatRejectionEmail = emailModule.sendCoffeeChatRejectionEmail;
      if (typeof sendCoffeeChatAcceptanceEmail !== 'function' || typeof sendCoffeeChatRejectionEmail !== 'function') {
        throw new Error('Coffee chat email service functions not found');
      }
    } catch (importError) {
      console.error('Failed to import coffee chat email services:', importError);
      return res.status(500).json({ 
        error: 'Failed to import coffee chat email services', 
        details: importError.message 
      });
    }

    const results = {
      accepted: [],
      rejected: [],
      errors: [],
      emailsSent: 0,
      emailsFailed: 0
    };

    for (const application of applications) {
      try {
        if (!application.candidate) {
          results.errors.push({
            applicationId: application.id,
            candidateName: `${application.firstName} ${application.lastName}`,
            error: 'No candidate associated with application'
          });
          continue;
        }

        // Decision from approved field (we already filtered for clear decisions)
        const decision = application.approved === true ? 'yes' : 'no';

        if (decision === 'yes') {
          // Advance to First Round Interviews (round 3)
          const updatedApp = await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'UNDER_REVIEW',
              currentRound: '3',
              approved: null // reset for next round decisions
            }
          });

          let emailResult;
          try {
            emailResult = await sendCoffeeChatAcceptanceEmail(
              application.email,
              `${application.firstName} ${application.lastName}`,
              active.name
            );
          } catch (emailError) {
            console.error(`Error sending coffee chat acceptance email to ${application.email}:`, emailError);
            emailResult = { success: false, error: emailError.message };
          }

          if (emailResult.success) {
            results.emailsSent++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }
        } else if (decision === 'no') {
          // Reject
          await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'REJECTED',
              currentRound: '2',
              approved: false
            }
          });

          const emailResult = await sendCoffeeChatRejectionEmail(
            application.email,
            `${application.firstName} ${application.lastName}`,
            active.name
          );

          if (emailResult.success) {
            results.emailsSent++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }
        }
      } catch (error) {
        console.error(`Error processing coffee chat application ${application.id}:`, error);
        results.errors.push({
          applicationId: application.id,
          candidateId: application.candidate?.id,
          candidateName: application.candidate ? `${application.firstName} ${application.lastName}` : 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Coffee chat decision processing completed',
      results,
      summary: {
        totalApplications: applications.length,
        accepted: results.accepted.length,
        rejected: results.rejected.length,
        errors: results.errors.length,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed
      },
      note: 'Accepted candidates moved to First Round Interviews (round 3). Rejected candidates remain in Coffee Chats (round 2).'
    });
  } catch (error) {
    console.error('[POST /api/admin/process-coffee-decisions]', error);
    res.status(500).json({ error: 'Failed to process coffee chat decisions', details: error.message });
  }
});

// Process Final Round decisions with emails and final advancement
router.post('/process-final-decisions', async (req, res) => {
  try {
    console.log('Starting final round decision processing...');

    const active = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!active) {
      return res.status(400).json({ error: 'No active recruiting cycle' });
    }

    console.log('Active cycle:', active.name);

    // Get applications in Final Round (currentRound = '4') with clear decisions only
    const allApplications = await prisma.application.findMany({
      where: {
        cycleId: active.id,
        currentRound: '4'
      },
      include: {
        candidate: true
      }
    });

    // Filter to only applications with clear Yes/No decisions (approved field is true or false)
    const applications = allApplications.filter(app => app.approved === true || app.approved === false);

    console.log('Total final round applications:', allApplications.length);
    console.log('Final round applications with clear decisions:', applications.length);

    if (applications.length === 0) {
      const unclearDecisions = allApplications.filter(app => app.approved === null || (app.approved !== true && app.approved !== false));
      return res.status(400).json({ 
        error: 'No applications with clear decisions found in Final Round.',
        details: `${unclearDecisions.length} applications have unclear decisions (Maybe/Unsure) and cannot be processed.`
      });
    }

    let sendFinalAcceptanceEmail, sendFinalRejectionEmail;
    try {
      const emailModule = await import('../services/emailNotifications.js');
      sendFinalAcceptanceEmail = emailModule.sendFinalAcceptanceEmail;
      sendFinalRejectionEmail = emailModule.sendFinalRejectionEmail;
      if (typeof sendFinalAcceptanceEmail !== 'function' || typeof sendFinalRejectionEmail !== 'function') {
        throw new Error('Final round email service functions not found');
      }
    } catch (importError) {
      console.error('Failed to import final round email services:', importError);
      return res.status(500).json({ 
        error: 'Failed to import final round email services', 
        details: importError.message 
      });
    }

    const results = {
      accepted: [],
      rejected: [],
      errors: [],
      emailsSent: 0,
      emailsFailed: 0
    };

    for (const application of applications) {
      try {
        if (!application.candidate) {
          results.errors.push({
            applicationId: application.id,
            candidateName: `${application.firstName} ${application.lastName}`,
            error: 'No candidate associated with application'
          });
          continue;
        }

        // Decision from approved field (we already filtered for clear decisions)
        const decision = application.approved === true ? 'yes' : 'no';

        if (decision === 'yes') {
          // Accept candidate - move to final stage (round 5)
          const updatedApp = await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'ACCEPTED',
              currentRound: '5',
              approved: true // final acceptance
            }
          });

          let emailResult;
          try {
            emailResult = await sendFinalAcceptanceEmail(
              application.email,
              `${application.firstName} ${application.lastName}`,
              active.name
            );
          } catch (emailError) {
            console.error(`Error sending final acceptance email to ${application.email}:`, emailError);
            emailResult = { success: false, error: emailError.message };
          }

          if (emailResult.success) {
            results.emailsSent++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.accepted.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }
        } else if (decision === 'no') {
          // Reject
          await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'REJECTED',
              currentRound: '4',
              approved: false
            }
          });

          const emailResult = await sendFinalRejectionEmail(
            application.email,
            `${application.firstName} ${application.lastName}`,
            active.name
          );

          if (emailResult.success) {
            results.emailsSent++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: true
            });
          } else {
            results.emailsFailed++;
            results.rejected.push({
              applicationId: application.id,
              candidateId: application.candidate.id,
              candidateName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              emailSent: false,
              emailError: emailResult.error
            });
          }
        }
      } catch (error) {
        console.error(`Error processing final round application ${application.id}:`, error);
        results.errors.push({
          applicationId: application.id,
          candidateId: application.candidate?.id,
          candidateName: application.candidate ? `${application.firstName} ${application.lastName}` : 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Final round decision processing completed',
      results,
      summary: {
        totalApplications: applications.length,
        accepted: results.accepted.length,
        rejected: results.rejected.length,
        errors: results.errors.length,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed
      },
      note: 'Accepted candidates moved to final stage (round 5). Rejected candidates remain in Final Round (round 4).'
    });
  } catch (error) {
    console.error('[POST /api/admin/process-final-decisions]', error);
    res.status(500).json({ error: 'Failed to process final round decisions', details: error.message });
  }
});

export default router;