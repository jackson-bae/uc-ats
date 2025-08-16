import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all groups with their members and assigned candidates
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = await prisma.groups.findMany({
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
              orderBy: {
                submittedAt: 'desc'
              },
              take: 1
            },
            resumeScores: {
              where: {
                assignedGroupId: {
                  not: null
                }
              }
            },
            coverLetterScores: {
              where: {
                assignedGroupId: {
                  not: null
                }
              }
            },
            videoScores: {
              where: {
                assignedGroupId: {
                  not: null
                }
              }
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

    // Transform the data to match the frontend expectations
    const transformedGroups = groups.map(group => {
      const members = [
        group.memberOneUser,
        group.memberTwoUser,
        group.memberThreeUser
      ].filter(Boolean);

      const candidates = group.assignedCandidates.map(candidate => {
        const latestApplication = candidate.applications[0];
        
        // Calculate progress based on scores
        const resumeProgress = candidate.resumeScores.length > 0 ? 100 : 0;
        const coverLetterProgress = candidate.coverLetterScores.length > 0 ? 100 : 0;
        const videoProgress = candidate.videoScores.length > 0 ? 100 : 0;

        return {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          major: latestApplication?.major1 || 'N/A',
          graduationYear: latestApplication?.graduationYear || 'N/A',
          gpa: latestApplication?.cumulativeGpa?.toString() || 'N/A',
          status: latestApplication?.status || 'SUBMITTED',
          resumeProgress,
          coverLetterProgress,
          videoProgress,
          avatar: null
        };
      });

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
        candidates,
        cycleId: group.cycleId,
        cycleName: group.cycle?.name
      };
    });

    res.json(transformedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
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

// Assign candidate to group
router.post('/:groupId/assign-candidate', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { candidateId } = req.body;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Update candidate's assigned group
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { assignedGroupId: groupId },
      include: {
        applications: {
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1
        }
      }
    });

    const latestApplication = updatedCandidate.applications[0];
    
    const transformedCandidate = {
      id: updatedCandidate.id,
      name: `${updatedCandidate.firstName} ${updatedCandidate.lastName}`,
      major: latestApplication?.major1 || 'N/A',
      graduationYear: latestApplication?.graduationYear || 'N/A',
      gpa: latestApplication?.cumulativeGpa?.toString() || 'N/A',
      status: latestApplication?.status || 'SUBMITTED',
      resumeProgress: 0,
      coverLetterProgress: 0,
      videoProgress: 0,
      avatar: null
    };

    res.json(transformedCandidate);
  } catch (error) {
    console.error('Error assigning candidate to group:', error);
    res.status(500).json({ error: 'Failed to assign candidate to group' });
  }
});

// Remove candidate from group
router.delete('/:groupId/remove-candidate/:candidateId', requireAuth, async (req, res) => {
  try {
    const { groupId, candidateId } = req.params;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update candidate to remove group assignment
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { assignedGroupId: null }
    });

    res.json({ message: 'Candidate removed from group successfully' });
  } catch (error) {
    console.error('Error removing candidate from group:', error);
    res.status(500).json({ error: 'Failed to remove candidate from group' });
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

// Get available candidates (not assigned to any group)
router.get('/available-candidates', requireAuth, async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        assignedGroupId: null
      },
      include: {
        applications: {
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1
        }
      }
    });

    const transformedCandidates = candidates.map(candidate => {
      const latestApplication = candidate.applications[0];
      return {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        major: latestApplication?.major1 || 'N/A',
        year: latestApplication?.graduationYear || 'N/A',
        gpa: latestApplication?.cumulativeGpa?.toString() || 'N/A'
      };
    });

    res.json(transformedCandidates);
  } catch (error) {
    console.error('Error fetching available candidates:', error);
    res.status(500).json({ error: 'Failed to fetch available candidates' });
  }
});

// Get all users for member selection
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
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

export default router;
