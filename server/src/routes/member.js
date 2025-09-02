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

    const applications = userTeam.assignedCandidates.map(candidate => {
      // Get the latest application for this candidate
      const latestApplication = candidate.applications[0];
      
      if (!latestApplication) {
        return null; // Skip candidates without applications
      }

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
        resumeProgress: 0, // Will be calculated separately if needed
        coverLetterProgress: 0,
        videoProgress: 0,
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

export default router;
