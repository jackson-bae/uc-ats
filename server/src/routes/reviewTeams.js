import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

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

export default router;
