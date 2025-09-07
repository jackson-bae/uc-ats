import express from 'express';
import prisma from '../prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all groups with their members and assigned candidates
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('Review teams endpoint called');
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    console.log('Active cycle found:', activeCycle?.id);
    
    if (!activeCycle) {
      console.log('No active cycle found, returning empty array');
      return res.json([]);
    }

    console.log('Fetching groups for cycle:', activeCycle.id);
    
    // Simplified query to avoid connection issues
    const groups = await prisma.groups.findMany({
      where: {
        cycleId: activeCycle.id
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Groups fetched successfully, count:', groups.length);

    console.log('Starting data transformation');
    
    // Transform the data to match the frontend expectations
    const transformedGroups = groups.map(group => {
      const members = [
        group.memberOneUser,
        group.memberTwoUser,
        group.memberThreeUser
      ].filter(Boolean);

      const applications = group.assignedCandidates.map(candidate => {
        // Get the latest application for this candidate
        const latestApplication = candidate.applications[0];
        
        if (!latestApplication) {
          return null; // Skip candidates without applications
        }

        return {
          id: latestApplication.id, // Use the actual application ID
          candidateId: candidate.id,
          name: `${latestApplication.firstName} ${latestApplication.lastName}`,
          major: latestApplication.major1 || 'N/A',
          year: latestApplication.graduationYear || 'N/A',
          gpa: latestApplication.cumulativeGpa?.toString() || 'N/A',
          status: latestApplication.status || 'SUBMITTED',
          email: latestApplication.email,
          submittedAt: latestApplication.submittedAt,
          resumeProgress: 0, // Will be calculated separately if needed
          coverLetterProgress: 0,
          videoProgress: 0,
          avatar: null
        };
      }).filter(Boolean); // Remove null entries

      return {
        id: group.id,
        name: `Team ${group.id.slice(-4)}`,
        code: group.id.slice(-8),
        members: members.map(member => ({
          id: member.id,
          name: member.fullName,
          email: member.email,
          avatar: null
        })),
        applications,
        cycleId: group.cycleId,
        cycleName: group.cycle?.name
      };
    });

    res.json(transformedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    
    // Check if it's a database connection error
    if (error.code === 'P1001') {
      console.error('Database connection error detected');
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please try again in a few moments.',
        details: 'The database connection is currently unavailable. This might be due to the Supabase project being paused or experiencing issues.'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group
router.post('/', requireAuth, async (req, res) => {
  try {
    const { memberOne, memberTwo, memberThree, cycleId } = req.body;

    // Validate that cycleId is provided
    if (!cycleId) {
      return res.status(400).json({ error: 'Cycle ID is required' });
    }

    // Check if cycle exists
    const cycle = await prisma.recruitingCycle.findUnique({
      where: { id: cycleId }
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    const group = await prisma.groups.create({
      data: {
        memberOne,
        memberTwo,
        memberThree,
        cycleId
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
        cycle: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const members = [
      group.memberOneUser,
      group.memberTwoUser,
      group.memberThreeUser
    ].filter(Boolean);

    const transformedGroup = {
      id: group.id,
      name: `Team ${group.id.slice(-4)}`,
      code: group.id.slice(-8),
      members: members.map(member => ({
        id: member.id,
        name: member.fullName,
        email: member.email,
        avatar: null
      })),
      candidates: [],
      cycleId: group.cycleId,
      cycleName: group.cycle?.name
    };

    res.status(201).json(transformedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Assign application to group
router.post('/:groupId/assign-application', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { applicationId } = req.body;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if application exists
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update candidate's assigned group (since applications are linked to candidates)
    const updatedCandidate = await prisma.candidate.update({
      where: { id: application.candidateId },
      data: { assignedGroupId: groupId }
    });
    
    const transformedApplication = {
      id: application.id,
      candidateId: application.candidateId,
      name: `${application.firstName} ${application.lastName}`,
      major: application.major1 || 'N/A',
      year: application.graduationYear || 'N/A',
      gpa: application.cumulativeGpa?.toString() || 'N/A',
      status: application.status || 'SUBMITTED',
      email: application.email,
      submittedAt: application.submittedAt,
      resumeProgress: 0,
      coverLetterProgress: 0,
      videoProgress: 0,
      avatar: null
    };

    res.json(transformedApplication);
  } catch (error) {
    console.error('Error assigning application to group:', error);
    res.status(500).json({ error: 'Failed to assign application to group' });
  }
});

// Remove application from group
router.delete('/:groupId/remove-application/:applicationId', requireAuth, async (req, res) => {
  try {
    const { groupId, applicationId } = req.params;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get the application to find the candidate ID
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update candidate to remove group assignment
    await prisma.candidate.update({
      where: { id: application.candidateId },
      data: { assignedGroupId: null }
    });

    res.json({ message: 'Application removed from group successfully' });
  } catch (error) {
    console.error('Error removing application from group:', error);
    res.status(500).json({ error: 'Failed to remove application from group' });
  }
});

// Update group members
router.put('/:groupId/members', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberOne, memberTwo, memberThree } = req.body;

    const updatedGroup = await prisma.groups.update({
      where: { id: groupId },
      data: {
        memberOne,
        memberTwo,
        memberThree
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
        }
      }
    });

    const members = [
      updatedGroup.memberOneUser,
      updatedGroup.memberTwoUser,
      updatedGroup.memberThreeUser
    ].filter(Boolean);

    const transformedMembers = members.map(member => ({
      id: member.id,
      name: member.fullName,
      email: member.email,
      avatar: null
    }));

    res.json(transformedMembers);
  } catch (error) {
    console.error('Error updating group members:', error);
    res.status(500).json({ error: 'Failed to update group members' });
  }
});

// Get available applications (not assigned to any group)
router.get('/available-applications', requireAuth, async (req, res) => {
  try {
    // Get the active cycle
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.json([]);
    }

    // Get applications that are not assigned to any group
    // We need to get the latest application for each candidate that's not assigned to a group
    const unassignedCandidates = await prisma.candidate.findMany({
      where: {
        assignedGroupId: null,
        applications: {
          some: {
            cycleId: activeCycle.id
          }
        }
      },
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
    });

    const applications = unassignedCandidates
      .map(candidate => candidate.applications[0])
      .filter(Boolean); // Remove any candidates without applications

    const transformedApplications = applications.map(application => ({
      id: application.id,
      candidateId: application.candidateId,
      name: `${application.firstName} ${application.lastName}`,
      major: application.major1 || 'N/A',
      year: application.graduationYear || 'N/A',
      gpa: application.cumulativeGpa?.toString() || 'N/A',
      email: application.email,
      submittedAt: application.submittedAt
    }));

    res.json(transformedApplications);
  } catch (error) {
    console.error('Error fetching available applications:', error);
    res.status(500).json({ error: 'Failed to fetch available applications' });
  }
});

// Get all users for member selection (ADMIN and MEMBER roles only)
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'MEMBER']
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImage: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get candidates assigned to a specific member's review team
router.get('/member/:memberId/candidates', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.json([]);
    }

    // Find groups where the member is part of the team
    const memberGroups = await prisma.groups.findMany({
      where: {
        cycleId: activeCycle.id,
        OR: [
          { memberOne: memberId },
          { memberTwo: memberId },
          { memberThree: memberId }
        ]
      },
      include: {
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
        }
      }
    });

    // Collect all candidates from all groups the member is part of
    const allCandidates = [];
    
    memberGroups.forEach(group => {
      group.assignedCandidates.forEach(candidate => {
        const latestApplication = candidate.applications[0];
        
        if (latestApplication) {
          allCandidates.push({
            id: latestApplication.id,
            candidateId: candidate.id,
            name: `${latestApplication.firstName} ${latestApplication.lastName}`,
            major: latestApplication.major1 || 'N/A',
            year: latestApplication.graduationYear || 'N/A',
            gpa: latestApplication.cumulativeGpa?.toString() || 'N/A',
            status: latestApplication.status || 'SUBMITTED',
            email: latestApplication.email,
            submittedAt: latestApplication.submittedAt,
            resumeUrl: latestApplication.resumeUrl,
            coverLetterUrl: latestApplication.coverLetterUrl,
            videoUrl: latestApplication.videoUrl,
            groupId: group.id,
            groupName: `Team ${group.id.slice(-4)}`
          });
        }
      });
    });

    res.json(allCandidates);
  } catch (error) {
    console.error('Error fetching member candidates:', error);
    res.status(500).json({ error: 'Failed to fetch member candidates' });
  }
});

// Auto-distribute applications evenly among all teams
router.post('/auto-distribute', requireAuth, async (req, res) => {
  try {
    // Get the active cycle
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    if (!activeCycle) {
      return res.status(400).json({ error: 'No active cycle found' });
    }

    // Get all teams for the active cycle
    const teams = await prisma.groups.findMany({
      where: { cycleId: activeCycle.id },
      select: { id: true }
    });

    if (teams.length === 0) {
      return res.status(400).json({ error: 'No teams found for the active cycle' });
    }

    // Get all available applications (not assigned to any group)
    const availableApplications = await prisma.application.findMany({
      where: {
        cycleId: activeCycle.id,
        candidate: {
          assignedGroupId: null
        }
      },
      include: {
        candidate: {
          select: { id: true }
        }
      },
      orderBy: {
        submittedAt: 'asc' // Distribute oldest applications first
      }
    });

    if (availableApplications.length === 0) {
      return res.json({ message: 'No applications available to distribute' });
    }

    // Distribute applications evenly among teams
    const applicationsPerTeam = Math.ceil(availableApplications.length / teams.length);
    let currentTeamIndex = 0;

    for (let i = 0; i < availableApplications.length; i++) {
      const application = availableApplications[i];
      const teamId = teams[currentTeamIndex].id;

      // Assign the candidate to the team
      await prisma.candidate.update({
        where: { id: application.candidate.id },
        data: { assignedGroupId: teamId }
      });

      // Move to next team in round-robin fashion
      currentTeamIndex = (currentTeamIndex + 1) % teams.length;
    }

    res.json({ 
      message: `Successfully distributed ${availableApplications.length} applications among ${teams.length} teams`,
      applicationsDistributed: availableApplications.length,
      teamsUsed: teams.length
    });

  } catch (error) {
    console.error('Error auto-distributing applications:', error);
    res.status(500).json({ error: 'Failed to auto-distribute applications' });
  }
});

// Get applications assigned to a specific member's review team
router.get('/member-applications/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const evaluatorId = req.user?.id;
    console.log('Fetching applications for member:', memberId);
    
    // Get the active cycle first
    const activeCycle = await prisma.recruitingCycle.findFirst({ 
      where: { isActive: true } 
    });
    
    console.log('Active cycle:', activeCycle?.id);
    
    if (!activeCycle) {
      console.log('No active cycle found');
      return res.json([]);
    }

    // First, let's check if the member exists and get their groups
    const memberGroups = await prisma.groups.findMany({
      where: {
        cycleId: activeCycle.id,
        OR: [
          { memberOne: memberId },
          { memberTwo: memberId },
          { memberThree: memberId }
        ]
      },
      select: {
        id: true,
        memberOne: true,
        memberTwo: true,
        memberThree: true,
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
    });

    console.log('Member groups found:', memberGroups.length);

    if (memberGroups.length === 0) {
      console.log('No groups found for member');
      return res.json([]);
    }

    // Get candidates assigned to these groups
    const groupIds = memberGroups.map(group => group.id);
    const candidates = await prisma.candidate.findMany({
      where: {
        assignedGroupId: {
          in: groupIds
        }
      },
      include: {
        applications: {
          where: {
            cycleId: activeCycle.id
          },
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1
        }
      }
    });

    console.log('Candidates found:', candidates.length);

    // Get grading records for these candidates for THIS evaluator
    const resumeScores = await prisma.resumeScore.findMany({
      where: {
        evaluatorId: evaluatorId,
        candidateId: {
          in: candidates.map(c => c.id)
        }
      },
      select: {
        candidateId: true
      }
    });

    const coverLetterScores = await prisma.coverLetterScore.findMany({
      where: {
        evaluatorId: evaluatorId,
        candidateId: {
          in: candidates.map(c => c.id)
        }
      },
      select: {
        candidateId: true
      }
    });

    const videoScores = await prisma.videoScore.findMany({
      where: {
        evaluatorId: evaluatorId,
        candidateId: {
          in: candidates.map(c => c.id)
        }
      },
      select: {
        candidateId: true
      }
    });

    // Get ALL grading records for these candidates (not just current evaluator) for team completion calculation
    const allResumeScores = await prisma.resumeScore.findMany({
      where: {
        candidateId: {
          in: candidates.map(c => c.id)
        }
      },
      select: {
        candidateId: true,
        evaluatorId: true,
        assignedGroupId: true
      }
    });

    // Get flagged documents for these applications
    const flaggedDocuments = await prisma.flaggedDocument.findMany({
      where: {
        applicationId: {
          in: candidates.flatMap(c => c.applications.map(app => app.id))
        },
        isResolved: false
      },
      select: {
        applicationId: true,
        documentType: true,
        reason: true,
        message: true,
        flaggedBy: true,
        createdAt: true
      }
    });

    const allCoverLetterScores = await prisma.coverLetterScore.findMany({
      where: {
        candidateId: {
          in: candidates.map(c => c.id)
        }
      },
      select: {
        candidateId: true,
        evaluatorId: true,
        assignedGroupId: true
      }
    });

    const allVideoScores = await prisma.videoScore.findMany({
      where: {
        candidateId: {
          in: candidates.map(c => c.id)
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
      if (!groupId) return { completed: false, missingGrades: 0, totalMembers: 0, teamMembers: [], completedEvaluators: [] };
      
      const group = memberGroups.find(g => g.id === groupId);
      if (!group) return { completed: false, missingGrades: 0, totalMembers: 0, teamMembers: [], completedEvaluators: [] };
      
      // Get all assigned team members with user info (filter out null/undefined)
      const teamMembers = [
        group.memberOneUser,
        group.memberTwoUser,
        group.memberThreeUser
      ].filter(Boolean);
      
      if (teamMembers.length === 0) return { completed: false, missingGrades: 0, totalMembers: 0, teamMembers: [], completedEvaluators: [] };
      
      // Get scores for this candidate and group
      const candidateScores = scores.filter(score => 
        score.candidateId === candidateId && score.assignedGroupId === groupId
      );
      
      // Check if all team members have completed their scores
      const completedEvaluators = candidateScores.map(score => score.evaluatorId);
      const allMembersCompleted = teamMembers.every(member => 
        completedEvaluators.includes(member.id)
      );
      
      const missingGrades = teamMembers.length - completedEvaluators.length;
      
      return {
        completed: allMembersCompleted,
        missingGrades,
        totalMembers: teamMembers.length,
        teamMembers: teamMembers,
        completedEvaluators: completedEvaluators
      };
    };

    // Transform the data
    const applications = [];
    
    candidates.forEach(candidate => {
      const latestApplication = candidate.applications[0];
      if (latestApplication) {
        const group = memberGroups.find(g => g.id === candidate.assignedGroupId);
        const hasResumeScore = resumeScores.some(score => score.candidateId === candidate.id);
        const hasCoverLetterScore = coverLetterScores.some(score => score.candidateId === candidate.id);
        const hasVideoScore = videoScores.some(score => score.candidateId === candidate.id);
        
        // Calculate team completion status
        const resumeStatus = checkTeamCompletion(candidate.id, candidate.assignedGroupId, allResumeScores, 'resume');
        const coverLetterStatus = checkTeamCompletion(candidate.id, candidate.assignedGroupId, allCoverLetterScores, 'coverLetter');
        const videoStatus = checkTeamCompletion(candidate.id, candidate.assignedGroupId, allVideoScores, 'video');
        
        // Get flag information for this application
        const resumeFlag = flaggedDocuments.find(flag => 
          flag.applicationId === latestApplication.id && flag.documentType === 'resume'
        );
        const coverLetterFlag = flaggedDocuments.find(flag => 
          flag.applicationId === latestApplication.id && flag.documentType === 'coverLetter'
        );
        const videoFlag = flaggedDocuments.find(flag => 
          flag.applicationId === latestApplication.id && flag.documentType === 'video'
        );

        applications.push({
          id: latestApplication.id,
          candidateId: candidate.id,
          studentId: candidate.studentId,
          name: `${latestApplication.firstName} ${latestApplication.lastName}`,
          major: latestApplication.major1 || 'N/A',
          year: latestApplication.graduationYear || 'N/A',
          gpa: latestApplication.cumulativeGpa?.toString() || 'N/A',
          status: latestApplication.status || 'SUBMITTED',
          email: latestApplication.email,
          submittedAt: latestApplication.submittedAt,
          headshotUrl: latestApplication.headshotUrl,
          gender: latestApplication.gender || 'N/A',
          isFirstGeneration: latestApplication.isFirstGeneration,
          isTransferStudent: latestApplication.isTransferStudent,
          resumeUrl: latestApplication.resumeUrl,
          coverLetterUrl: latestApplication.coverLetterUrl,
          videoUrl: latestApplication.videoUrl,
          groupId: group?.id,
          groupName: group ? `Team ${group.id.slice(-4)}` : 'Unknown Team',
          hasResumeScore: hasResumeScore, // Individual member's completion status
          hasCoverLetterScore: hasCoverLetterScore, // Individual member's completion status
          hasVideoScore: hasVideoScore, // Individual member's completion status
          resumeMissingGrades: resumeStatus.missingGrades,
          coverLetterMissingGrades: coverLetterStatus.missingGrades,
          videoMissingGrades: videoStatus.missingGrades,
          resumeTotalMembers: resumeStatus.totalMembers,
          coverLetterTotalMembers: coverLetterStatus.totalMembers,
          videoTotalMembers: videoStatus.totalMembers,
          groupMembers: resumeStatus.teamMembers, // Team members info
          resumeCompletedEvaluators: resumeStatus.completedEvaluators,
          coverLetterCompletedEvaluators: coverLetterStatus.completedEvaluators,
          videoCompletedEvaluators: videoStatus.completedEvaluators,
          // Flag information
          resumeFlagged: resumeFlag || null,
          coverLetterFlagged: coverLetterFlag || null,
          videoFlagged: videoFlag || null
        });
      }
    });

    console.log('Applications processed:', applications.length);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching member applications:', error);
    res.status(500).json({ error: 'Failed to fetch member applications', details: error.message });
  }
});

// Test endpoint to check if the route is working
router.get('/test', requireAuth, async (req, res) => {
  try {
    res.json({ 
      message: 'Review teams route is working',
      user: req.user?.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test endpoint failed' });
  }
});

// Save resume score (per evaluator per candidate)
router.post('/resume-score', requireAuth, async (req, res) => {
  try {
    const { candidateId, assignedGroupId, scoreOne, scoreTwo, scoreThree, notes } = req.body;
    const evaluatorId = req.user.id;

    // Calculate overall score (average of the three scores)
    const scores = [scoreOne, scoreTwo, scoreThree].filter(score => score !== null && score !== undefined);
    const overallScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    // Check if a score already exists for this candidate and evaluator
    const existingScore = await prisma.resumeScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    let resumeScore;
    if (existingScore) {
      // Update existing score
      resumeScore = await prisma.resumeScore.update({
        where: { id: existingScore.id },
        data: {
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notes,
          assignedGroupId,
          status: 'completed'
        }
      });
    } else {
      // Create new score
      resumeScore = await prisma.resumeScore.create({
        data: {
          candidateId,
          evaluatorId,
          assignedGroupId,
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notes,
          status: 'completed'
        }
      });
    }

    res.json(resumeScore);
  } catch (error) {
    console.error('Error saving resume score:', error);
    res.status(500).json({ error: 'Failed to save resume score' });
  }
});

// Get resume score for a candidate (for current evaluator)
router.get('/resume-score/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const evaluatorId = req.user.id;

    const resumeScore = await prisma.resumeScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    res.json(resumeScore || null);
  } catch (error) {
    console.error('Error fetching resume score:', error);
    res.status(500).json({ error: 'Failed to fetch resume score' });
  }
});

// Get all resume scores for a candidate
router.get('/resume-scores/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;

    const resumeScores = await prisma.resumeScore.findMany({
      where: { candidateId },
      include: {
        evaluator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(resumeScores);
  } catch (error) {
    console.error('Error fetching resume scores:', error);
    res.status(500).json({ error: 'Failed to fetch resume scores' });
  }
});

// Save cover letter score (per evaluator per candidate)
router.post('/cover-letter-score', requireAuth, async (req, res) => {
  try {
    const { candidateId, assignedGroupId, scoreOne, scoreTwo, scoreThree, notes } = req.body;
    const evaluatorId = req.user.id;

    // Calculate overall score (average of the three scores)
    const scores = [scoreOne, scoreTwo, scoreThree].filter(score => score !== null && score !== undefined);
    const overallScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    // Check if a score already exists for this candidate and evaluator
    const existingScore = await prisma.coverLetterScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    let coverLetterScore;
    if (existingScore) {
      // Update existing score
      coverLetterScore = await prisma.coverLetterScore.update({
        where: { id: existingScore.id },
        data: {
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notesOne: notes, // Store general notes in notesOne field
          assignedGroupId,
          status: 'completed'
        }
      });
    } else {
      // Create new score
      coverLetterScore = await prisma.coverLetterScore.create({
        data: {
          candidateId,
          evaluatorId,
          assignedGroupId,
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notesOne: notes, // Store general notes in notesOne field
          status: 'completed'
        }
      });
    }

    res.json(coverLetterScore);
  } catch (error) {
    console.error('Error saving cover letter score:', error);
    res.status(500).json({ error: 'Failed to save cover letter score' });
  }
});

// Get cover letter score for a candidate (for current evaluator)
router.get('/cover-letter-score/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const evaluatorId = req.user.id;

    const coverLetterScore = await prisma.coverLetterScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    // Transform the response to match frontend expectations
    if (coverLetterScore) {
      const transformedScore = {
        ...coverLetterScore,
        notes: coverLetterScore.notesOne // Map notesOne to notes for frontend compatibility
      };
      res.json(transformedScore);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching cover letter score:', error);
    res.status(500).json({ error: 'Failed to fetch cover letter score' });
  }
});

// Get all cover letter scores for a candidate
router.get('/cover-letter-scores/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;

    const coverLetterScores = await prisma.coverLetterScore.findMany({
      where: { candidateId },
      include: {
        evaluator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(coverLetterScores);
  } catch (error) {
    console.error('Error fetching cover letter scores:', error);
    res.status(500).json({ error: 'Failed to fetch cover letter scores' });
  }
});

// Save video score (per evaluator per candidate)
router.post('/video-score', requireAuth, async (req, res) => {
  try {
    const { candidateId, assignedGroupId, scoreOne, scoreTwo, scoreThree, notes } = req.body;
    const evaluatorId = req.user.id;

    // Calculate overall score (average of the three scores)
    const scores = [scoreOne, scoreTwo, scoreThree].filter(score => score !== null && score !== undefined);
    const overallScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    // Check if a score already exists for this candidate and evaluator
    const existingScore = await prisma.videoScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    let videoScore;
    if (existingScore) {
      // Update existing score
      videoScore = await prisma.videoScore.update({
        where: { id: existingScore.id },
        data: {
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notesOne: notes, // Store general notes in notesOne field
          assignedGroupId,
          status: 'completed'
        }
      });
    } else {
      // Create new score
      videoScore = await prisma.videoScore.create({
        data: {
          candidateId,
          evaluatorId,
          assignedGroupId,
          overallScore,
          scoreOne,
          scoreTwo,
          scoreThree,
          notesOne: notes, // Store general notes in notesOne field
          status: 'completed'
        }
      });
    }

    res.json(videoScore);
  } catch (error) {
    console.error('Error saving video score:', error);
    res.status(500).json({ error: 'Failed to save video score' });
  }
});

// Get video score for a candidate (for current evaluator)
router.get('/video-score/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const evaluatorId = req.user.id;

    const videoScore = await prisma.videoScore.findFirst({
      where: { candidateId, evaluatorId }
    });

    // Transform the response to match frontend expectations
    if (videoScore) {
      const transformedScore = {
        ...videoScore,
        notes: videoScore.notesOne // Map notesOne to notes for frontend compatibility
      };
      res.json(transformedScore);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching video score:', error);
    res.status(500).json({ error: 'Failed to fetch video score' });
  }
});

// Get all video scores for a candidate
router.get('/video-scores/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;

    const videoScores = await prisma.videoScore.findMany({
      where: { candidateId },
      include: {
        evaluator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(videoScores);
  } catch (error) {
    console.error('Error fetching video scores:', error);
    res.status(500).json({ error: 'Failed to fetch video scores' });
  }
});

export default router;
