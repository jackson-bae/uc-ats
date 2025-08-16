import express from 'express';
import { getFileStream, getFileMetadata } from '../services/google/drive.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes below require authentication
router.use(requireAuth);

// View image files (CORS-friendly proxy)
router.get('/:fileId/image', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('Serving image file:', fileId);
    
    const meta = await getFileMetadata(fileId);
    const fileStream = await getFileStream(fileId);
    
    res.setHeader('Content-Type', meta?.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ 
      error: 'Failed to serve image',
      details: error.message,
      fileId: req.params.fileId
    });
  }
});

// View PDF files
router.get('/:fileId/pdf', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('Serving PDF file:', fileId);
    
    const meta = await getFileMetadata(fileId);
    const fileStream = await getFileStream(fileId);
    
    res.setHeader('Content-Type', meta?.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // View in browser
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ 
      error: 'Failed to serve PDF',
      details: error.message,
      fileId: req.params.fileId
    });
  }
});

export default router; 