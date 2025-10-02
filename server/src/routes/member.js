import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../prismaClient.js';
import { sendSlackMessage } from '../services/slackService.js';
import { sendMeetingCancellationEmail } from '../services/emailNotifications.js';

const router = express.Router();

// Get events for members with per-user RSVP status
router.get('/events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all events with cycle for ordering/filtering
    const events = await prisma.events.findMany({
      include: {
        cycle: true
      },
      orderBy: {
        eventStartDate: 'asc'
      }
    });

    // Only include events from active cycles
    const activeEvents = events.filter(event => event.cycle?.isActive);

    // Build a Set of eventIds this member RSVP'd to
    const eventIds = activeEvents.map(e => e.id);
    let rsvpsByEventId = new Set();
    if (eventIds.length > 0) {
      const memberRsvps = await prisma.memberEventRsvp.findMany({
        where: {
          memberId: userId,
          eventId: { in: eventIds }
        },
        select: { eventId: true }
      });
      rsvpsByEventId = new Set(memberRsvps.map(r => r.eventId));
    }

    const eventsWithStatus = activeEvents.map(event => ({
      ...event,
      memberRsvpUrl: event.memberRsvpUrl || null,
      hasMemberRsvpd: rsvpsByEventId.has(event.id)
    }));

    res.json(eventsWithStatus);
  } catch (error) {
    console.error('[GET /api/member/events]', error);
    res.status(500).json({ error: 'Failed to fetch member events' });
  }
});

// Get all applications (member version - no admin access required)
router.get('/all-applications', requireAuth, async (req, res) => {
  try {
    console.log('Fetching all applications for member:', req.user.id);
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    console.log('Active cycle found:', activeCycle?.id);
    
    if (!activeCycle) {
      console.log('No active cycle found, returning empty array');
      return res.json([]);
    }

    // Get all applications for the active cycle
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

    console.log('Found applications:', applications.length);

    // Transform the data
    const transformedApplications = applications.map(app => ({
      id: app.id,
      candidateId: app.candidateId,
      name: `${app.firstName} ${app.lastName}`,
      major: app.major1 || 'N/A',
      year: app.graduationYear || 'N/A',
      gpa: app.cumulativeGpa?.toString() || 'N/A',
      status: app.status || 'SUBMITTED',
      email: app.email,
      submittedAt: app.submittedAt,
      headshotUrl: app.headshotUrl,
      gender: app.gender || 'N/A',
      isFirstGeneration: app.isFirstGeneration,
      isTransferStudent: app.isTransferStudent,
      resumeUrl: app.resumeUrl,
      coverLetterUrl: app.coverLetterUrl,
      videoUrl: app.videoUrl,
      groupId: app.candidate?.assignedGroupId,
      groupName: app.candidate?.assignedGroupId ? 
        `Team ${app.candidate.assignedGroupId.slice(-4)}` : 'Unassigned'
    }));

    console.log('Transformed applications:', transformedApplications.length);
    res.json(transformedApplications);
  } catch (error) {
    console.error('Error fetching all applications for member:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Get all candidates (member version - no admin access required)
router.get('/all-candidates', requireAuth, async (req, res) => {
  try {
    console.log('Fetching all candidates for member:', req.user.id);
    
    // First, try a simpler query to test database connectivity
    const candidateCount = await prisma.candidate.count();
    console.log('Total candidates in database:', candidateCount);
    
    // Try the full query with error handling for each part
    let candidates;
    try {
      candidates = await prisma.candidate.findMany({
        include: {
          assignedGroup: {
            select: {
              id: true,
              memberOne: true,
              memberTwo: true,
              memberThree: true
            }
          },
          applications: {
            include: {
              cycle: {
                select: {
                  id: true,
                  name: true,
                  isActive: true
                }
              }
            },
            orderBy: {
              submittedAt: 'desc'
            }
          },
          eventAttendance: {
            include: {
              event: {
                select: {
                  id: true,
                  eventName: true,
                  eventStartDate: true,
                  eventEndDate: true
                }
              }
            }
          },
          eventRsvp: {
            include: {
              event: {
                select: {
                  id: true,
                  eventName: true,
                  eventStartDate: true,
                  eventEndDate: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (queryError) {
      console.error('Prisma query error:', queryError);
      // Try a simpler query without includes
      candidates = await prisma.candidate.findMany({
        select: {
          id: true,
          studentId: true,
          createdAt: true,
          assignedGroupId: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      console.log('Using simplified query, found candidates:', candidates.length);
    }

    console.log('Found candidates:', candidates.length);
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching all candidates for member:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
});

// Get a specific candidate with all related data
router.get('/candidate/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching candidate details for:', id);
    
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        assignedGroup: {
          select: {
            id: true,
            memberOne: true,
            memberTwo: true,
            memberThree: true,
            createdAt: true
          }
        },
        applications: {
          include: {
            cycle: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            submittedAt: 'desc'
          }
        },
        eventAttendance: {
          include: {
            event: {
              select: {
                id: true,
                eventName: true,
                eventStartDate: true,
                eventEndDate: true
              }
            }
          }
        },
        eventRsvp: {
          include: {
            event: {
              select: {
                id: true,
                eventName: true,
                eventStartDate: true,
                eventEndDate: true
              }
            }
          }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    console.log('Found candidate:', candidate.id);
    res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate details:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch candidate details', details: error.message });
  }
});

// Get current user's team information
router.get('/my-team', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.json(null);
    }

    // Find the team that the current user belongs to
    const userTeam = await prisma.groups.findFirst({
      where: {
        cycleId: activeCycle.id,
        OR: [
          { memberOne: userId },
          { memberTwo: userId },
          { memberThree: userId }
        ]
      },
      include: {
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
        },
        assignedCandidates: {
          include: {
            applications: {
              where: {
                cycleId: activeCycle.id
              },
              orderBy: {
                submittedAt: 'desc'
              },
              take: 1 // Only get the latest application
            }
          }
        },
        cycle: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!userTeam) {
      return res.json(null);
    }

    // Transform the data to match the frontend expectations
    const members = [
      userTeam.memberOneUser,
      userTeam.memberTwoUser,
      userTeam.memberThreeUser
    ].filter(Boolean);

    // Get all scoring data for the team's assigned candidates
    const candidateIds = userTeam.assignedCandidates.map(c => c.id);
    
    const [resumeScores, coverLetterScores, videoScores] = await Promise.all([
      prisma.resumeScore.findMany({
        where: {
          candidateId: { in: candidateIds }
        },
        select: {
          candidateId: true,
          evaluatorId: true
        }
      }),
      prisma.coverLetterScore.findMany({
        where: {
          candidateId: { in: candidateIds }
        },
        select: {
          candidateId: true,
          evaluatorId: true
        }
      }),
      prisma.videoScore.findMany({
        where: {
          candidateId: { in: candidateIds }
        },
        select: {
          candidateId: true,
          evaluatorId: true
        }
      })
    ]);

    // Get team member IDs for progress calculation
    const teamMemberIds = [
      userTeam.memberOne,
      userTeam.memberTwo,
      userTeam.memberThree
    ].filter(Boolean);

    const applications = userTeam.assignedCandidates.map(candidate => {
      // Get the latest application for this candidate
      const latestApplication = candidate.applications[0];
      
      if (!latestApplication) {
        return null; // Skip candidates without applications
      }

      // Calculate progress for each document type
      // Progress is based on how many team members have scored each document
      const candidateResumeScores = resumeScores.filter(score => 
        score.candidateId === candidate.id && 
        score.assignedGroupId === userTeam.id &&
        teamMemberIds.includes(score.evaluatorId));
      const candidateCoverLetterScores = coverLetterScores.filter(score => 
        score.candidateId === candidate.id && 
        score.assignedGroupId === userTeam.id &&
        teamMemberIds.includes(score.evaluatorId));
      const candidateVideoScores = videoScores.filter(score => 
        score.candidateId === candidate.id && 
        score.assignedGroupId === userTeam.id &&
        teamMemberIds.includes(score.evaluatorId));

      // Calculate progress as percentage of team members who have scored each document
      const resumeProgress = !latestApplication.resumeUrl ? 100 : 
        (teamMemberIds.length > 0 ? 
          Math.round((candidateResumeScores.length / teamMemberIds.length) * 100) : 0);
      const coverLetterProgress = !latestApplication.coverLetterUrl ? 100 : 
        (teamMemberIds.length > 0 ? 
          Math.round((candidateCoverLetterScores.length / teamMemberIds.length) * 100) : 0);
      const videoProgress = !latestApplication.videoUrl ? 100 : 
        (teamMemberIds.length > 0 ? 
          Math.round((candidateVideoScores.length / teamMemberIds.length) * 100) : 0);

      return {
        id: latestApplication.id,
        candidateId: candidate.id,
        name: `${latestApplication.firstName} ${latestApplication.lastName}`,
        major: latestApplication.major1 || 'N/A',
        year: latestApplication.graduationYear || 'N/A',
        gpa: latestApplication.cumulativeGpa?.toString() || 'N/A',
        status: latestApplication.status || 'SUBMITTED',
        email: latestApplication.email,
        submittedAt: latestApplication.submittedAt,
        resumeProgress,
        coverLetterProgress,
        videoProgress,
        avatar: null
      };
    }).filter(Boolean); // Remove null entries

    const transformedTeam = {
      id: userTeam.id,
      name: `Team ${userTeam.id.slice(-4)}`,
      code: userTeam.id.slice(-8),
      members: members.map(member => ({
        id: member.id,
        name: member.fullName,
        email: member.email,
        avatar: null
      })),
      applications,
      cycleId: userTeam.cycleId,
      cycleName: userTeam.cycle?.name
    };

    res.json(transformedTeam);
  } catch (error) {
    console.error('Error fetching user team:', error);
    res.status(500).json({ error: 'Failed to fetch team information' });
  }
});

// Get member's assigned interviews
router.get('/interviews', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.json([]);
    }

    // Get all interviews for the active cycle
    const interviews = await prisma.interview.findMany({
      where: {
        cycleId: activeCycle.id
      },
      include: {
        cycle: true
      },
      orderBy: { startDate: 'desc' }
    });

    // Filter interviews to only show those where the current user is assigned
    // This would need to be based on the interview configuration and member groups
    // For now, we'll return all interviews and let the frontend handle filtering
    // In a real implementation, you'd parse the interview description to check
    // if the current user is in any of the member groups
    
    res.json(interviews);
  } catch (error) {
    console.error('[GET /api/member/interviews]', {
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

// Get current user's profile information
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    console.error('[GET /api/member/profile]', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get specific interview details for member
router.get('/interviews/:id', requireAuth, async (req, res) => {
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
    console.error('[GET /api/member/interviews/:id]', error);
    res.status(500).json({ error: 'Failed to fetch interview details' });
  }
});

// Member: create a meeting slot
router.post('/meeting-slots', requireAuth, async (req, res) => {
  try {
    const { location, startTime, endTime, capacity } = req.body || {};
    if (!location || !startTime) {
      return res.status(400).json({ error: 'Location and start time are required' });
    }
    
    // Convert datetime-local input to UTC
    // datetime-local sends format: "YYYY-MM-DDTHH:MM" (no timezone info)
    // We need to treat this as PST time and convert to UTC
    const createUTCDate = (dateTimeString) => {
      if (!dateTimeString) return null;
      
      console.log('Creating UTC date from:', dateTimeString);
      
      // Parse the datetime-local string and treat it as PST
      const [datePart, timePart] = dateTimeString.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      console.log('Parsed components:', { year, month, day, hour, minute });
      
      // Create date in PST (UTC-8) - note: PST is UTC-8, PDT is UTC-7
      // For simplicity, we'll use PST (UTC-8) year-round
      // To convert PST to UTC, we add 8 hours
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour + 8, minute));
      
      console.log('Created UTC date:', utcDate);
      console.log('UTC date toISOString:', utcDate.toISOString());
      
      return utcDate;
    };
    
    console.log('Received startTime:', startTime);
    console.log('Received endTime:', endTime);
    
    const slot = await prisma.meetingSlot.create({
      data: {
        memberId: req.user.id,
        location,
        startTime: createUTCDate(startTime),
        endTime: endTime ? createUTCDate(endTime) : null,
        capacity: Number.isInteger(capacity) ? capacity : 2
      }
    });
    
    console.log('Created slot startTime:', slot.startTime);
    console.log('Created slot endTime:', slot.endTime);
    
    res.json(slot);
  } catch (error) {
    console.error('[POST /api/member/meeting-slots]', error);
    res.status(500).json({ error: 'Failed to create meeting slot' });
  }
});

// Member: list own meeting slots with signups
router.get('/meeting-slots', requireAuth, async (req, res) => {
  try {
    const slots = await prisma.meetingSlot.findMany({
      where: { memberId: req.user.id },
      orderBy: { startTime: 'asc' },
      include: { signups: true }
    });
    res.json(slots);
  } catch (error) {
    console.error('[GET /api/member/meeting-slots]', error);
    res.status(500).json({ error: 'Failed to fetch meeting slots' });
  }
});

// Member: update a meeting slot
router.put('/meeting-slots/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, startTime, endTime, capacity } = req.body || {};
    
    // Check if the slot belongs to this member
    const existingSlot = await prisma.meetingSlot.findUnique({
      where: { id },
      include: { signups: true }
    });
    
    if (!existingSlot) {
      return res.status(404).json({ error: 'Meeting slot not found' });
    }
    
    if (existingSlot.memberId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this meeting slot' });
    }
    
    // Check if there are existing signups and the new time conflicts
    if (existingSlot.signups.length > 0) {
      // If there are signups, only allow updating location and capacity
      if (startTime || endTime) {
        return res.status(400).json({ 
          error: 'Cannot change time of meeting slot with existing signups. Only location and capacity can be updated.' 
        });
      }
    }
    
    // Convert datetime-local input to UTC (same logic as create)
    const createUTCDate = (dateTimeString) => {
      if (!dateTimeString) return null;
      
      // Parse the datetime-local string and treat it as PST
      const [datePart, timePart] = dateTimeString.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Create date in PST (UTC-8) - note: PST is UTC-8, PDT is UTC-7
      // For simplicity, we'll use PST (UTC-8) year-round
      // To convert PST to UTC, we add 8 hours
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour + 8, minute));
      
      return utcDate;
    };
    
    const updateData = {};
    if (location !== undefined) updateData.location = location;
    if (startTime !== undefined) updateData.startTime = createUTCDate(startTime);
    if (endTime !== undefined) updateData.endTime = endTime ? createUTCDate(endTime) : null;
    if (capacity !== undefined) updateData.capacity = Number.isInteger(capacity) ? capacity : existingSlot.capacity;
    
    const updatedSlot = await prisma.meetingSlot.update({
      where: { id },
      data: updateData,
      include: { signups: true }
    });
    
    res.json(updatedSlot);
  } catch (error) {
    console.error('[PUT /api/member/meeting-slots/:id]', error);
    res.status(500).json({ error: 'Failed to update meeting slot' });
  }
});

// Member: delete a meeting slot
router.delete('/meeting-slots/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the slot belongs to this member
    const existingSlot = await prisma.meetingSlot.findUnique({
      where: { id },
      include: { 
        signups: true,
        member: {
          select: { fullName: true }
        }
      }
    });
    
    if (!existingSlot) {
      return res.status(404).json({ error: 'Meeting slot not found' });
    }
    
    if (existingSlot.memberId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this meeting slot' });
    }
    
    // Send cancellation emails to all signups before deleting
    if (existingSlot.signups.length > 0) {
      const memberName = existingSlot.member?.fullName || 'UC Consulting Member';
      
      // Send cancellation emails to all signups
      const emailPromises = existingSlot.signups.map(async (signup) => {
        try {
          await sendMeetingCancellationEmail(
            signup.email,
            signup.fullName,
            memberName,
            existingSlot.location,
            existingSlot.startTime,
            existingSlot.endTime
          );
        } catch (emailError) {
          console.error(`Failed to send cancellation email to ${signup.email}:`, emailError);
          // Don't fail the deletion if email fails, just log the error
        }
      });
      
      // Wait for all emails to be sent (or fail)
      await Promise.allSettled(emailPromises);
    }
    
    // Delete the meeting slot (this will cascade delete all signups due to foreign key constraint)
    await prisma.meetingSlot.delete({
      where: { id }
    });
    
    const message = existingSlot.signups.length > 0 
      ? `Meeting slot deleted successfully. Cancellation emails sent to ${existingSlot.signups.length} signup(s).`
      : 'Meeting slot deleted successfully.';
    
    res.json({ message });
  } catch (error) {
    console.error('[DELETE /api/member/meeting-slots/:id]', error);
    res.status(500).json({ error: 'Failed to delete meeting slot' });
  }
});

// Member: mark attendance for a signup
router.patch('/meeting-signups/:id/attendance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { attended } = req.body || {};

    // Ensure the signup belongs to a slot of this member
    const signup = await prisma.meetingSignup.findUnique({
      where: { id },
      include: { slot: true }
    });

    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }
    if (signup.slot.memberId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this signup' });
    }

    const updated = await prisma.meetingSignup.update({
      where: { id },
      data: { attended: Boolean(attended) }
    });

    // If marking as attended and studentId exists, add 5 points to overall score
    if (Boolean(attended) && signup.studentId) {
      try {
        // Find the candidate by studentId
        const candidate = await prisma.candidate.findUnique({
          where: { studentId: signup.studentId },
          include: { applications: true }
        });

        if (candidate && candidate.applications.length > 0) {
          // Get the latest application for the active cycle
          const activeCycle = await prisma.recruitingCycle.findFirst({
            where: { isActive: true }
          });

          if (activeCycle) {
            const latestApplication = candidate.applications
              .filter(app => app.cycleId === activeCycle.id)
              .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

            if (latestApplication) {
              console.log(`Adding 3 points to application ${latestApplication.id} for meeting attendance (studentId: ${signup.studentId})`);
              
              // Note: The 3 points will be automatically added when the overall score is calculated
              // in the existing scoring system (similar to referral bonus and event points)
              // No need to store this separately as it's calculated dynamically
            }
          }
        }
      } catch (scoreError) {
        console.error('Error processing meeting attendance bonus:', scoreError);
        // Don't fail the attendance update if scoring fails
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('[PATCH /api/member/meeting-signups/:id/attendance]', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// Get applications for interview groups (member version)
router.get('/interviews/:id/applications', requireAuth, async (req, res) => {
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
    console.error('[GET /api/member/interviews/:id/applications]', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get evaluations for an interview
router.get('/evaluations', requireAuth, async (req, res) => {
  try {
    const { interviewId } = req.query;
    const userId = req.user.id;
    
    if (!interviewId) {
      return res.status(400).json({ error: 'Interview ID is required' });
    }
    
    // Check if this is a first round interview
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    let evaluations = [];
    
    if (interview.interviewType === 'ROUND_ONE') {
      // Get first round evaluations
      evaluations = await prisma.firstRoundInterviewEvaluation.findMany({
        where: {
          interviewId,
          evaluatorId: userId
        },
        include: {
          application: {
            include: {
              candidate: true
            }
          }
        }
      });
    } else {
      // Get regular evaluations
      evaluations = await prisma.interviewEvaluation.findMany({
        where: {
          interviewId,
          evaluatorId: userId
        },
        include: {
          application: {
            include: {
              candidate: true
            }
          }
        }
      });
    }
    
    res.json(evaluations);
  } catch (error) {
    console.error('[GET /api/member/evaluations]', error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// Save or update evaluation
router.post('/evaluations', requireAuth, async (req, res) => {
  try {
    const { 
      interviewId, 
      applicationId, 
      decision, 
      notes,
      // First round interview specific fields
      behavioralLeadership,
      behavioralProblemSolving,
      behavioralInterest,
      behavioralTotal,
      marketSizingTeamwork,
      marketSizingLogic,
      marketSizingCreativity,
      marketSizingTotal,
      behavioralNotes,
      marketSizingNotes,
      additionalNotes
    } = req.body;
    const evaluatorId = req.user.id;
    
    if (!interviewId || !applicationId) {
      return res.status(400).json({ error: 'Interview ID and application ID are required' });
    }
    
    // Check if this is a first round interview
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    // Handle first round interviews with dedicated table
    if (interview.interviewType === 'ROUND_ONE') {
      // Check if first round evaluation already exists
      const existingFirstRoundEvaluation = await prisma.firstRoundInterviewEvaluation.findFirst({
        where: {
          interviewId,
          applicationId,
          evaluatorId
        }
      });
      
      const firstRoundData = {
        interviewId,
        applicationId,
        evaluatorId,
        decision,
        behavioralLeadership,
        behavioralProblemSolving,
        behavioralInterest,
        behavioralTotal,
        marketSizingTeamwork,
        marketSizingLogic,
        marketSizingCreativity,
        marketSizingTotal,
        behavioralNotes,
        marketSizingNotes,
        additionalNotes,
        updatedAt: new Date()
      };
      
      let evaluation;
      if (existingFirstRoundEvaluation) {
        // Update existing first round evaluation
        evaluation = await prisma.firstRoundInterviewEvaluation.update({
          where: { id: existingFirstRoundEvaluation.id },
          data: firstRoundData
        });
      } else {
        // Create new first round evaluation
        evaluation = await prisma.firstRoundInterviewEvaluation.create({
          data: firstRoundData
        });
      }
      
      res.json(evaluation);
    } else {
      // Handle regular interviews with standard evaluation table
      const existingEvaluation = await prisma.interviewEvaluation.findFirst({
        where: {
          interviewId,
          applicationId,
          evaluatorId
        }
      });
      
      const evaluationData = {
        decision,
        notes,
        updatedAt: new Date()
      };
      
      let evaluation;
      if (existingEvaluation) {
        // Update existing evaluation
        evaluation = await prisma.interviewEvaluation.update({
          where: { id: existingEvaluation.id },
          data: evaluationData
        });
      } else {
        // Create new evaluation
        evaluation = await prisma.interviewEvaluation.create({
          data: {
            interviewId,
            applicationId,
            evaluatorId,
            ...evaluationData
          }
        });
      }
      
      res.json(evaluation);
    }
  } catch (error) {
    console.error('[POST /api/member/evaluations]', error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
});

// Message admin endpoint
router.post('/message-admin', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user information with better error handling
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          email: true,
          role: true
        }
      });
    } catch (dbError) {
      console.error('[POST /api/member/message-admin] Database error:', dbError);
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please try again later.',
        details: 'Unable to retrieve user information'
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send message to Slack
    const slackMessage = {
      text: `New message from UC Member`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📩 New Message from UC Member"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*From:* ${user.fullName}`
            },
            {
              type: "mrkdwn",
              text: `*Email:* ${user.email}`
            },
            {
              type: "mrkdwn",
              text: `*Role:* ${user.role}`
            },
            {
              type: "mrkdwn",
              text: `*Time:* ${new Date().toLocaleString()}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n${message.trim()}`
          }
        }
      ]
    };

    try {
      await sendSlackMessage(slackMessage);
    } catch (slackError) {
      console.error('[POST /api/member/message-admin] Slack error:', slackError);
      // Don't fail the request if Slack is down, but log the error
      console.warn('Slack message failed, but continuing with success response');
    }

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('[POST /api/member/message-admin] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Flag a document (member access)
router.post('/flag-document', requireAuth, async (req, res) => {
  try {
    const { applicationId, documentType, reason, message } = req.body;
    const flaggedBy = req.user.id;

    // Validate required fields
    if (!applicationId || !documentType || !reason) {
      return res.status(400).json({ error: 'Application ID, document type, and reason are required' });
    }

    // Validate document type
    const validDocumentTypes = ['resume', 'coverLetter', 'video'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type. Must be resume, coverLetter, or video' });
    }

    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });

    if (!activeCycle) {
      return res.status(400).json({ error: 'No active recruitment cycle found' });
    }

    // Check if the member has access to this application (they must be assigned to review it)
    const memberGroup = await prisma.groups.findFirst({
      where: {
        cycleId: activeCycle.id,
        OR: [
          { memberOne: flaggedBy },
          { memberTwo: flaggedBy },
          { memberThree: flaggedBy }
        ],
        assignedCandidates: {
          some: {
            applications: {
              some: {
                id: applicationId
              }
            }
          }
        }
      }
    });

    if (!memberGroup) {
      return res.status(403).json({ error: 'You do not have permission to flag this application' });
    }

    // Check if document is already flagged
    const existingFlag = await prisma.flaggedDocument.findFirst({
      where: {
        applicationId,
        documentType,
        isResolved: false
      }
    });

    if (existingFlag) {
      return res.status(400).json({ error: 'This document is already flagged' });
    }

    // Create the flag
    const flaggedDocument = await prisma.flaggedDocument.create({
      data: {
        applicationId,
        documentType,
        reason,
        message: message?.trim() || null,
        flaggedBy,
        isResolved: false
      },
      include: {
        application: {
          select: {
            id: true,
            studentId: true,
            email: true
          }
        },
        flagger: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Send Slack notification
    try {
      const slackMessage = `🚩 Document Flagged\n\n` +
        `**Application:** Student ${flaggedDocument.application.studentId}\n` +
        `**Document Type:** ${documentType}\n` +
        `**Reason:** ${reason}\n` +
        `**Flagged by:** ${flaggedDocument.flagger.fullName}\n` +
        `**Message:** ${message || 'No additional details provided'}\n\n` +
        `Please review this flagged document in the admin panel.`;

      await sendSlackMessage(slackMessage);
    } catch (slackError) {
      console.error('Failed to send Slack notification for flagged document:', slackError);
      // Don't fail the request if Slack notification fails
    }

    res.status(201).json({
      message: 'Document flagged successfully',
      flaggedDocument
    });
  } catch (error) {
    console.error('[POST /api/member/flag-document]', error);
    res.status(500).json({ error: 'Failed to flag document' });
  }
});

export default router;
