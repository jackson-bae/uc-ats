import express from 'express';
import prisma from '../prismaClient.js'; 
import { requireAuth } from '../middleware/auth.js';
import { getFormQuestions, getResponses } from '../services/google/forms.js';
import config from '../config.js';

const router = express.Router();

// Test Google Form API connection
router.get('/test-google-api', async (req, res) => {
  try {
    console.log('Testing Google Form API connection...');
    
    // Test 1: Check if config is loaded
    if (!config.form || !config.form.id) {
      return res.status(500).json({ 
        error: 'Form configuration not found',
        config: {
          formConfigPath: process.env.FORM_CONFIG_PATH,
          formId: config.form?.id
        }
      });
    }

    const formId = config.form.id;
    console.log('Form ID:', formId);

    // Test 2: Test authentication first
    console.log('Testing Google authentication...');
    const { getGoogleAuthClient } = await import('../services/google/auth.js');
    const authClient = await getGoogleAuthClient();
    
    // Get service account info
    const credentials = await authClient.getCredentials();
    console.log('Service account email:', credentials.client_email);
    
    // Test 3: Try to get form questions with detailed error handling
    console.log('Testing form questions retrieval...');
    try {
      const questions = await getFormQuestions(formId);
      console.log('Questions retrieved:', questions.length);
    } catch (questionError) {
      console.error('Form questions error:', questionError);
      return res.status(500).json({
        error: 'Failed to get form questions',
        details: {
          message: questionError.message,
          code: questionError.code,
          status: questionError.status,
          suggestion: 'The service account may not have access to this specific form. Try sharing the form with the service account email.'
        },
        serviceAccount: credentials.client_email,
        formId: formId
      });
    }

    // Test 4: Try to get form responses
    console.log('Testing form responses retrieval...');
    try {
      const responses = await getResponses(formId);
      console.log('Responses retrieved:', responses.length);
    } catch (responseError) {
      console.error('Form responses error:', responseError);
      return res.status(500).json({
        error: 'Failed to get form responses',
        details: {
          message: responseError.message,
          code: responseError.code,
          status: responseError.status,
          suggestion: 'The service account may not have access to form responses. Make sure the form is shared with Editor permissions.'
        },
        serviceAccount: credentials.client_email,
        formId: formId
      });
    }

    // If we get here, both tests passed
    const questions = await getFormQuestions(formId);
    const responses = await getResponses(formId);

    res.json({
      success: true,
      message: 'Google Form API connection successful',
      formId: formId,
      serviceAccount: credentials.client_email,
      questionsCount: questions.length,
      responsesCount: responses.length,
      sampleQuestions: questions.slice(0, 3), // First 3 questions
      sampleResponses: responses.slice(0, 2)  // First 2 responses
    });

  } catch (error) {
    console.error('Google Form API test failed:', error);
    
    // Provide detailed error information
    let errorDetails = {
      message: error.message,
      code: error.code,
      status: error.status
    };

    // Add specific error handling for common issues
    if (error.code === 'ENOENT') {
      errorDetails.suggestion = 'Check if google-cloud-key.json file exists in the server directory';
    } else if (error.message.includes('invalid_grant')) {
      errorDetails.suggestion = 'Service account key may be invalid or expired';
    } else if (error.message.includes('not found')) {
      errorDetails.suggestion = 'Form ID may be incorrect or form may not exist';
    } else if (error.message.includes('permission')) {
      errorDetails.suggestion = 'Service account may not have proper permissions for this form';
    }

    res.status(500).json({
      error: 'Google Form API connection failed',
      details: errorDetails,
      config: {
        formConfigPath: process.env.FORM_CONFIG_PATH,
        gCloudKeyPath: process.env.GOOGLE_CLOUD_KEY_PATH,
        formId: config.form?.id
      }
    });
  }
});

// All routes below require authentication
router.use(requireAuth);

// Get all applications with average grades
router.get('/', async (req, res) => {
  try {
    // Optional: scope to active recruiting cycle if one exists
    const activeCycle = await prisma.recruitingCycle.findFirst({ where: { isActive: true } });
    if (!activeCycle) {
      // When no active cycle, return empty list instead of all
      return res.json([]);
    }
    const whereClause = { cycleId: activeCycle.id };

    // First, get applications
    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { submittedAt: 'desc' }
    });

    // Get all grades
    const allGrades = await prisma.grade.findMany();
    
    // Calculate average grades for each application
    const applicationsWithAverages = await Promise.all(applications.map(async (application) => {
      // Find grades for this application
      const appGrades = allGrades.filter(grade => grade.applicant === application.id);
      
      // Filter out null grades and convert string grades to numbers
      const resumeGrades = appGrades
        .filter(g => g.resume !== null && g.resume !== undefined)
        .map(g => parseFloat(g.resume));
        
      const videoGrades = appGrades
        .filter(g => g.video !== null && g.video !== undefined)
        .map(g => parseFloat(g.video));
        
      const coverLetterGrades = appGrades
        .filter(g => g.cover_letter !== null && g.cover_letter !== undefined)
        .map(g => parseFloat(g.cover_letter));
      
      // Calculate averages
      const avgResume = resumeGrades.length > 0 ? 
        (resumeGrades.reduce((a, b) => a + b, 0) / resumeGrades.length).toFixed(1) : null;
        
      const avgVideo = videoGrades.length > 0 ? 
        (videoGrades.reduce((a, b) => a + b, 0) / videoGrades.length).toFixed(1) : null;
        
      const avgCoverLetter = coverLetterGrades.length > 0 ? 
        (coverLetterGrades.reduce((a, b) => a + b, 0) / coverLetterGrades.length).toFixed(1) : null;
      
      // Calculate overall average if at least one grade exists
      const allGradeValues = [...resumeGrades, ...videoGrades, ...coverLetterGrades];
      const overallAverage = allGradeValues.length > 0 ? 
        (allGradeValues.reduce((a, b) => a + b, 0) / allGradeValues.length).toFixed(1) : null;
      
      // Return application with average grades
      return {
        ...application,
        averageGrades: {
          resume: avgResume,
          video: avgVideo,
          cover_letter: avgCoverLetter,
          overall: overallAverage
        }
      };
    }));
    
    res.json(applicationsWithAverages);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Comments: list for an application
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, fullName: true } } }
    });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Comments: add to an application
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const created = await prisma.comment.create({
      data: {
        applicationId: id,
        userId: req.user.id,
        content: content.trim(),
      }
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get single application by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true, fullName: true } } } } }
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Get current user's ID
router.get('/current-user/id', (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    res.json({ userId: req.user.id });
  } catch (error) {
    console.error('Error getting user ID:', error);
    res.status(500).json({ error: 'Failed to get user ID' });
  }
});

// Save or update grades for an application
router.post('/:id/grades', requireAuth, async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    const userId = req.user.id;
    const { resume_grade, video_grade, cover_letter_grade } = req.body;

    // Check if at least one grade is provided
    if (resume_grade === undefined && video_grade === undefined && cover_letter_grade === undefined) {
      return res.status(400).json({ 
        error: 'At least one grade field is required' 
      });
    }
    
    // Prepare data for upsert
    const gradeData = {};
    
    // Validate and process each grade
    if (resume_grade !== undefined) {
      if (resume_grade !== null) {
        const value = parseInt(resume_grade);
        if (isNaN(value) || value < 1 || value > 10) {
          return res.status(400).json({ error: 'Resume grade must be between 1 and 10' });
        }
        gradeData.resume = value.toString();
      } else {
        gradeData.resume = null;
      }
    }
    
    if (video_grade !== undefined) {
      if (video_grade !== null) {
        const value = parseInt(video_grade);
        if (isNaN(value) || value < 1 || value > 10) {
          return res.status(400).json({ error: 'Video grade must be between 1 and 10' });
        }
        gradeData.video = value.toString();
      } else {
        gradeData.video = null;
      }
    }
    
    if (cover_letter_grade !== undefined) {
      if (cover_letter_grade !== null) {
        const value = parseInt(cover_letter_grade);
        if (isNaN(value) || value < 1 || value > 10) {
          return res.status(400).json({ error: 'Cover letter grade must be between 1 and 10' });
        }
        gradeData.cover_letter = value.toString();
      } else {
        gradeData.cover_letter = null;
      }
    }

    // Check if a grade already exists for this user and application
    const existingGrade = await prisma.grade.findFirst({
      where: {
        applicant: applicationId,
        user: userId
      }
    });

    let grade;
    if (existingGrade) {
      // Update existing grade
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: gradeData,
      });
    } else {
      // Create new grade with the provided data
      grade = await prisma.grade.create({
        data: {
          ...gradeData,
          applicant: applicationId,
          user: userId,
        },
      });
    }
    // Get application and user details for the response
    const [applicationDetails, userDetails] = await Promise.all([
      prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true
        }
      })
    ]);
    
    res.status(201).json({
      message: 'Grades saved successfully',
      grade: {
        id: grade.id,
        resume_grade: grade.resume,
        video_grade: grade.video,
        cover_letter_grade: grade.cover_letter,
        createdAt: grade.createdAt,
        application: applicationDetails,
        user: userDetails
      }
    });
    
  } catch (error) {
    console.error('Error saving grades:', {
      message: error.message,
      stack: error.stack,
      applicationId,
      userId,
      grades: req.body
    });
    
    // Return more detailed error information
    res.status(500).json({ 
      error: 'Failed to save grades',
      details: {
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          code: error.code,
          meta: error.meta
        })
      }
    });
  }
});

// Get most recent grades for an application and user
router.get('/:id/grades/latest', requireAuth, async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    const userId = req.user.id;

    // Find the most recent grade for this application and user
    const latestGrade = await prisma.grade.findFirst({
      where: {
        applicant: applicationId,
        user: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        resume: true,
        video: true,
        cover_letter: true,
        createdAt: true
      }
    });

    if (!latestGrade) {
      return res.status(404).json({ error: 'No grades found for this application and user' });
    }

    res.json(latestGrade);
  } catch (error) {
    console.error('Error fetching latest grades:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest grades',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get average grades for an application
router.get('/:id/grades/average', requireAuth, async (req, res) => {
  try {
    const { id: applicationId } = req.params;

    // Get all grades for this application
    const grades = await prisma.grade.findMany({
      where: {
        applicant: applicationId
      },
      select: {
        resume: true,
        video: true,
        cover_letter: true
      }
    });

    if (grades.length === 0) {
      return res.status(404).json({ 
        error: 'No grades found for this application',
        averages: {
          resume: 0,
          video: 0,
          cover_letter: 0,
          total: 0,
          count: 0
        }
      });
    }

    // Filter out null grades and convert string grades to numbers
    const resumeGrades = grades
      .filter(g => g.resume !== null && g.resume !== undefined)
      .map(g => parseFloat(g.resume));
      
    const videoGrades = grades
      .filter(g => g.video !== null && g.video !== undefined)
      .map(g => parseFloat(g.video));
      
    const coverLetterGrades = grades
      .filter(g => g.cover_letter !== null && g.cover_letter !== undefined)
      .map(g => parseFloat(g.cover_letter));
    
    // Calculate averages
    const avgResume = resumeGrades.length > 0 ? 
      (resumeGrades.reduce((a, b) => a + b, 0) / resumeGrades.length) : 0;
      
    const avgVideo = videoGrades.length > 0 ? 
      (videoGrades.reduce((a, b) => a + b, 0) / videoGrades.length) : 0;
      
    const avgCoverLetter = coverLetterGrades.length > 0 ? 
      (coverLetterGrades.reduce((a, b) => a + b, 0) / coverLetterGrades.length) : 0;
    
    // Calculate overall average if at least one grade exists
    const allGradeValues = [...resumeGrades, ...videoGrades, ...coverLetterGrades];
    const overallAverage = allGradeValues.length > 0 ? 
      (allGradeValues.reduce((a, b) => a + b, 0) / allGradeValues.length) : 0;

    const averages = {
      resume: parseFloat(avgResume.toFixed(2)),
      video: parseFloat(avgVideo.toFixed(2)),
      cover_letter: parseFloat(avgCoverLetter.toFixed(2)),
      total: parseFloat(overallAverage.toFixed(2)),
      count: grades.length
    };

    res.json(averages);
  } catch (error) {
    console.error('Error calculating average grades:', error);
    res.status(500).json({ 
      error: 'Failed to calculate average grades',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get latest application ID for a candidate
router.get('/candidate/:candidateId/latest', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Find the latest application for this candidate
    const latestApplication = await prisma.application.findFirst({
      where: { candidateId },
      orderBy: { submittedAt: 'desc' },
      select: { id: true }
    });

    if (!latestApplication) {
      return res.status(404).json({ error: 'No application found for this candidate' });
    }

    res.json({ applicationId: latestApplication.id });
  } catch (error) {
    console.error('Error fetching latest application for candidate:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest application for candidate',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 
 