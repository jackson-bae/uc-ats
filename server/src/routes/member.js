import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../prismaClient.js';

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
    
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId,
        evaluatorId: userId
      }
    });
    
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
    
    // Check if evaluation already exists
    const existingEvaluation = await prisma.interviewEvaluation.findFirst({
      where: {
        interviewId,
        applicationId,
        evaluatorId
      }
    });
    
    // Prepare data object with only provided fields
    const evaluationData = {
      updatedAt: new Date()
    };
    
    // Add basic fields
    if (decision !== undefined) evaluationData.decision = decision;
    
    // For first round interviews, store all data in notes as JSON until migration is applied
    if (behavioralLeadership !== undefined || behavioralProblemSolving !== undefined || 
        behavioralInterest !== undefined || marketSizingTeamwork !== undefined ||
        marketSizingLogic !== undefined || marketSizingCreativity !== undefined ||
        behavioralNotes !== undefined || marketSizingNotes !== undefined || 
        additionalNotes !== undefined) {
      
      // Create a comprehensive notes object with all first round data
      const firstRoundData = {
        basicNotes: notes || '',
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
      };
      
      evaluationData.notes = JSON.stringify(firstRoundData);
    } else {
      // Regular notes for non-first-round interviews
      if (notes !== undefined) evaluationData.notes = notes;
    }
    
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
  } catch (error) {
    console.error('[POST /api/member/evaluations]', error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
});

export default router;
