import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalApplicants = await prisma.application.count();
    const totalTasks = await prisma.task.count();
    const candidates = await prisma.application.findMany({
      where: { status: 'UNDER_REVIEW' }
    });

    const activeCycle = await prisma.applicationCycle.findFirst({
      where: { isActive: true }
    });

    res.json({
      totalApplicants,
      tasks: totalTasks,
      candidates: candidates.length,
      currentRound: activeCycle?.name || null
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

// Update approval status
router.patch('/candidates/:id/approval', async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: { approved }
    });
    res.json(updated);
  } catch (error) {
    console.error('[PATCH /api/admin/candidates/:id/approval]', error);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Advance round
router.post('/candidates/advance-round', async (req, res) => {
  const { currentRound, nextRound } = req.body;

  try {
    const approvedCandidates = await prisma.application.findMany({
      where: { currentRound, approved: true }
    });

    const rejectedCandidates = await prisma.application.findMany({
      where: { currentRound, approved: false }
    });

    await Promise.all([
      ...approvedCandidates.map(c =>
        prisma.application.update({
          where: { id: c.id },
          data: {
            currentRound: nextRound,
            status: 'UNDER_REVIEW',
            approved: null
          }
        })
      ),
      ...rejectedCandidates.map(c =>
        prisma.application.update({
          where: { id: c.id },
          data: {
            status: 'REJECTED',
            currentRound: 'rejected'
          }
        })
      )
    ]);

    res.json({ message: 'Candidates updated successfully' });
  } catch (error) {
    console.error('[POST /api/admin/candidates/advance-round]', error);
    res.status(500).json({ error: 'Failed to advance round' });
  }
});

// PATCH approval status of a specific candidate
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

router.post('/advance-round', async (req, res) => {
  try {
    // 1. Get the current active round
    const currentCycle = await prisma.applicationCycle.findFirst({
      where: { isActive: true }
    });

    if (!currentCycle) {
      return res.status(404).json({ error: 'No active application cycle found.' });
    }

    // 2. Get all applications in this cycle with a decision
    const applications = await prisma.application.findMany({
      where: {
        cycleId: currentCycle.id,
        approved: { not: null }
      }
    });

    // 3. Get all cycles and figure out the next one (by creation order)
    const allCycles = await prisma.applicationCycle.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const currentIndex = allCycles.findIndex(c => c.id === currentCycle.id);
    const nextCycle = allCycles[currentIndex + 1];

    // 4. If no next round, reject all unapproved
    if (!nextCycle) {
      await Promise.all(applications.map(app => {
        return prisma.application.update({
          where: { id: app.id },
          data: {
            status: app.approved ? 'ACCEPTED' : 'REJECTED',
            approved: null
          }
        });
      }));

      await prisma.applicationCycle.update({
        where: { id: currentCycle.id },
        data: { isActive: false }
      });

      return res.json({ message: 'Final round complete. Applications updated accordingly.' });
    }

    // 5. Advance approved applications to the next round
    const updates = applications.map(app => {
      return prisma.application.update({
        where: { id: app.id },
        data: app.approved
          ? {
              cycleId: nextCycle.id,
              approved: null,
              status: 'UNDER_REVIEW'
            }
          : {
              status: 'REJECTED',
              approved: null
            }
      });
    });

    // 6. Update current cycle status
    await Promise.all([
      ...updates,
      prisma.applicationCycle.update({
        where: { id: currentCycle.id },
        data: { isActive: false }
      }),
      prisma.applicationCycle.update({
        where: { id: nextCycle.id },
        data: { isActive: true }
      })
    ]);

    res.json({ message: `Advanced to next round: ${nextCycle.name}` });
  } catch (error) {
    console.error('[POST /api/admin/advance-round]', error);
    res.status(500).json({ error: 'Failed to advance round' });
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

export default router;