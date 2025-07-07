import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalApplicants = await prisma.application.count();
    const totalGrades = await prisma.grade.count();

    const candidates = await prisma.application.findMany({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'] }
      }
    });

    const statusCounts = candidates.reduce((acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1;
      return acc;
    }, {});

    const currentRound = Object.keys(statusCounts).length > 0 
      ? Object.keys(statusCounts).reduce((a, b) =>
          statusCounts[a] > statusCounts[b] ? a : b
        )
      : 'SUBMITTED';

    res.json({
      totalApplicants,
      tasks: totalGrades, // Using grades count as "tasks" for compatibility
      candidates: candidates.length,
      currentRound: currentRound
    });
  } catch (error) {
    console.error('[GET /api/admin/stats]', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get all candidates
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await prisma.application.findMany({
      orderBy: { submittedAt: 'desc' }
    });
    res.json(candidates);
  } catch (error) {
    console.error('[GET /api/admin/candidates]', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
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

    const approvedCandidates = await prisma.application.findMany({
      where: {
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
    const cycles = await prisma.applicationCycle.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(cycles);
  } catch (error) {
    console.error('[GET /api/admin/cycles]', error);
    res.status(500).json({ error: 'Failed to fetch application cycles' });
  }
});

// Set a cycle as active
router.post('/cycles/:id/activate', async (req, res) => {
  const { id } = req.params;

  try {
    // Deactivate all current cycles
    await prisma.applicationCycle.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Activate selected one
    const updated = await prisma.applicationCycle.update({
      where: { id },
      data: { isActive: true }
    });

    res.json({ message: 'Cycle activated', cycle: updated });
  } catch (error) {
    console.error('[POST /api/admin/cycles/:id/activate]', error);
    res.status(500).json({ error: 'Failed to activate cycle' });
  }
});

router.post('/reset-all', async (req, res) => {
  try {
    console.log('Resetting all candidates...');

    await prisma.application.updateMany({
      data: {
        status: 'SUBMITTED',
        approved: null
      }
    });

    res.json({ message: 'All candidates reset to initial state' });
  } catch (error) {
    console.error('[POST /api/admin/reset-all]', error);
    res.status(500).json({ error: 'Failed to reset candidates' });
  }
});

router.put('/profile', async (req, res) => {
  const { email, fullName, graduationClass, originalEmail } = req.body;

  try {
    // Prevent duplicate email
    if (email !== originalEmail) {
      const existingUser = await prisma.User.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }

    const result = await prisma.User.update({
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
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('[GET /api/admin/profile]', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
     }
});

router.put('/profile', async (req, res) => {
  const { email, fullName, graduationClass, originalEmail } = req.body;

  try {
    // Prevent duplicate email
    if (email !== originalEmail) {
      const existingUser = await prisma.User.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }

    const result = await prisma.User.update({
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
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('[GET /api/admin/profile]', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;