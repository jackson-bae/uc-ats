import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../prismaClient.js';
import { sendSlackMessage } from '../services/slackService.js';

const router = express.Router();

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
      const candidateResumeScores = resumeScores.filter(score => score.candidateId === candidate.id);
      const candidateCoverLetterScores = coverLetterScores.filter(score => score.candidateId === candidate.id);
      const candidateVideoScores = videoScores.filter(score => score.candidateId === candidate.id);

      // Calculate progress as percentage of team members who have scored each document
      const resumeProgress = latestApplication.resumeUrl ? 
        Math.round((candidateResumeScores.length / teamMemberIds.length) * 100) : 100;
      const coverLetterProgress = latestApplication.coverLetterUrl ? 
        Math.round((candidateCoverLetterScores.length / teamMemberIds.length) * 100) : 100;
      const videoProgress = latestApplication.videoUrl ? 
        Math.round((candidateVideoScores.length / teamMemberIds.length) * 100) : 100;

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
    const slot = await prisma.meetingSlot.create({
      data: {
        memberId: req.user.id,
        location,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        capacity: Number.isInteger(capacity) ? capacity : 2
      }
    });
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
          where: { studentId: parseInt(signup.studentId) },
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
              console.log(`Adding 5 points to application ${latestApplication.id} for meeting attendance (studentId: ${signup.studentId})`);
              
              // Note: The 5 points will be automatically added when the overall score is calculated
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

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        role: true
      }
    });

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

    await sendSlackMessage(slackMessage);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('[POST /api/member/message-admin]', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
