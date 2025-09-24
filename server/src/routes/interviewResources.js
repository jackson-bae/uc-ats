import express from 'express';
import prisma from '../prismaClient.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all interview resources
router.get('/', async (req, res) => {
  try {
    console.log('Prisma client:', prisma);
    console.log('InterviewResource model:', prisma.interviewResource);
    
    const resources = await prisma.interviewResource.findMany({
      orderBy: [
        { round: 'asc' },
        { order: 'asc' }
      ]
    });

    // Group resources by round
    const groupedResources = {
      firstRound: resources.filter(r => r.round === 'firstRound'),
      finalRound: resources.filter(r => r.round === 'finalRound'),
      coffeeChats: resources.filter(r => r.round === 'coffeeChats'),
      applications: resources.filter(r => r.round === 'applications')
    };

    res.json(groupedResources);
  } catch (error) {
    console.error('Error fetching interview resources:', error);
    res.status(500).json({ error: 'Failed to fetch interview resources' });
  }
});

// Create a new interview resource
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, url, hasExternalLink, icon, round } = req.body;

    // Validate required fields
    if (!title || !description || !round) {
      return res.status(400).json({ error: 'Title, description, and round are required' });
    }

    // Get user ID from authenticated user
    const createdBy = req.user.id;

    // Get the next order number for this round
    const maxOrder = await prisma.interviewResource.findFirst({
      where: { round },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newOrder = (maxOrder?.order || 0) + 1;

    const resource = await prisma.interviewResource.create({
      data: {
        title,
        description,
        url: url || null,
        hasExternalLink: hasExternalLink !== undefined ? hasExternalLink : true,
        icon: icon || 'book',
        round,
        order: newOrder,
        createdBy
      }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating interview resource:', error);
    res.status(500).json({ error: 'Failed to create interview resource' });
  }
});

// Update an interview resource
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, hasExternalLink, icon, round, order } = req.body;

    // Validate required fields
    if (!title || !description || !round) {
      return res.status(400).json({ error: 'Title, description, and round are required' });
    }

    const resource = await prisma.interviewResource.update({
      where: { id },
      data: {
        title,
        description,
        url: url || null,
        hasExternalLink: hasExternalLink !== undefined ? hasExternalLink : true,
        icon: icon || 'book',
        round,
        order: order || 0
      }
    });

    res.json(resource);
  } catch (error) {
    console.error('Error updating interview resource:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Interview resource not found' });
    }
    res.status(500).json({ error: 'Failed to update interview resource' });
  }
});

// Delete an interview resource
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.interviewResource.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting interview resource:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Interview resource not found' });
    }
    res.status(500).json({ error: 'Failed to delete interview resource' });
  }
});

// Reorder resources within a round
router.post('/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { round, resourceIds } = req.body;

    if (!round || !Array.isArray(resourceIds)) {
      return res.status(400).json({ error: 'Round and resourceIds array are required' });
    }

    // Update the order of each resource
    const updates = resourceIds.map((id, index) => 
      prisma.interviewResource.update({
        where: { id },
        data: { order: index + 1 }
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: 'Resources reordered successfully' });
  } catch (error) {
    console.error('Error reordering interview resources:', error);
    res.status(500).json({ error: 'Failed to reorder interview resources' });
  }
});

export default router;
