import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Description as DocumentIcon,
  Edit as EditIcon,
  Videocam as VideoIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';

const DocumentGradingModal = ({ open, onClose, application, documentType }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingScore, setExistingScore] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  // Resizable columns state
  const [leftWidth, setLeftWidth] = useState(documentType === 'video' ? 50 : 83.3);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Grading form state
  const [scoreOne, setScoreOne] = useState('');
  const [scoreTwo, setScoreTwo] = useState('');
  const [scoreThree, setScoreThree] = useState('');
  const [notes, setNotes] = useState('');

  // Get document-specific configuration
  const getDocumentConfig = () => {
    switch (documentType) {
      case 'resume':
        return {
          title: 'Resume Grading',
          previewTitle: 'Resume Preview',
          icon: <DocumentIcon />,
          urlField: 'resumeUrl',
          rubricCategories: [
            {
              id: 'scoreOne',
              title: 'Content & Relevance',
              description: 'How well does the resume showcase relevant experience and skills?',
              maxScore: 10
            },
            {
              id: 'scoreTwo',
              title: 'Structure & Formatting',
              description: 'Is the resume well-organized, professional, and easy to read?',
              maxScore: 10
            },
            {
              id: 'scoreThree',
              title: 'Impact & Achievement',
              description: 'How effectively does the resume demonstrate quantifiable achievements?',
              maxScore: 10
            }
          ],
          apiEndpoint: '/review-teams/resume-score',
          getScoreEndpoint: (candidateId) => `/review-teams/resume-score/${candidateId}`
        };
      case 'coverLetter':
        return {
          title: 'Cover Letter Grading',
          previewTitle: 'Cover Letter Preview',
          icon: <EditIcon />,
          urlField: 'coverLetterUrl',
          rubricCategories: [
            {
              id: 'scoreOne',
              title: 'Content & Relevance',
              description: 'How well does the cover letter address the position and demonstrate interest?',
              maxScore: 10
            },
            {
              id: 'scoreTwo',
              title: 'Writing Quality',
              description: 'Is the cover letter well-written, clear, and professional?',
              maxScore: 10
            },
            {
              id: 'scoreThree',
              title: 'Personalization & Impact',
              description: 'How effectively does the cover letter personalize the application and show value?',
              maxScore: 10
            }
          ],
          apiEndpoint: '/review-teams/cover-letter-score',
          getScoreEndpoint: (candidateId) => `/review-teams/cover-letter-score/${candidateId}`
        };
      case 'video':
        return {
          title: 'Video Review',
          previewTitle: 'Video Preview',
          icon: <VideoIcon />,
          urlField: 'videoUrl',
          rubricCategories: [
            {
              id: 'scoreOne',
              title: 'Communication Skills',
              description: 'How well does the candidate communicate their thoughts and ideas?',
              maxScore: 10
            },
            {
              id: 'scoreTwo',
              title: 'Professionalism',
              description: 'Does the candidate present themselves professionally and appropriately?',
              maxScore: 10
            },
            {
              id: 'scoreThree',
              title: 'Content & Engagement',
              description: 'How engaging and relevant is the video content?',
              maxScore: 10
            }
          ],
          apiEndpoint: '/review-teams/video-score',
          getScoreEndpoint: (candidateId) => `/review-teams/video-score/${candidateId}`
        };
      default:
        return null;
    }
  };

  const config = getDocumentConfig();
  if (!config) return null;

  // Resize functionality
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain between 20% and 80%
    const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
    setLeftWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Load existing score when modal opens
  useEffect(() => {
    if (open && application?.candidateId) {
      loadExistingScore();
    }
  }, [open, application?.candidateId, documentType]);

  // Build authenticated preview URL for document
  useEffect(() => {
    let localUrl;
    const loadPreview = async () => {
      setPreviewError(null);
      setPreviewUrl(null);
      if (!open || !application?.[config.urlField]) return;

      try {
        const resp = await fetch(application[config.urlField], {
          headers: {
            Authorization: `Bearer ${token || apiClient.token || localStorage.getItem('token')}`,
          },
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`${resp.status} ${resp.statusText} - ${txt}`);
        }
        const blob = await resp.blob();
        localUrl = URL.createObjectURL(blob);
        setPreviewUrl(localUrl);
      } catch (e) {
        console.error(`Failed to load ${documentType} preview:`, e);
        setPreviewError(e.message || `Failed to load ${documentType} preview`);
      }
    };

    loadPreview();
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [open, application?.[config.urlField], token, documentType]);

  const loadExistingScore = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(config.getScoreEndpoint(application.candidateId));
      if (response) {
        setExistingScore(response);
        setScoreOne(response.scoreOne || '');
        setScoreTwo(response.scoreTwo || '');
        setScoreThree(response.scoreThree || '');
        setNotes(response.notes || '');
      }
    } catch (err) {
      console.error('Error loading existing score:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const scoreData = {
        candidateId: application.candidateId,
        assignedGroupId: application.groupId,
        scoreOne: parseInt(scoreOne) || 0,
        scoreTwo: parseInt(scoreTwo) || 0,
        scoreThree: parseInt(scoreThree) || 0,
        notes
      };

      await apiClient.post(config.apiEndpoint, scoreData);
      setSuccess(true);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
        // Reset form
        setScoreOne('');
        setScoreTwo('');
        setScoreThree('');
        setNotes('');
      }, 1500);

    } catch (err) {
      console.error('Error saving score:', err);
      setError('Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateOverallScore = () => {
    const scores = [scoreOne, scoreTwo, scoreThree].filter(score => score !== '' && score !== null);
    if (scores.length === 0) return 0;
    return (scores.reduce((sum, score) => sum + parseInt(score), 0) / scores.length).toFixed(1);
  };

  const handleScoreChange = (field, value) => {
    const numValue = parseInt(value);
    if (numValue >= 0 && numValue <= 10) {
      switch (field) {
        case 'scoreOne':
          setScoreOne(value);
          break;
        case 'scoreTwo':
          setScoreTwo(value);
          break;
        case 'scoreThree':
          setScoreThree(value);
          break;
        default:
          break;
      }
    }
  };

  if (!application) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
          minWidth: '1200px'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h6" component="div">
            {application.studentId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {application.major} • {application.year}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          variant="outlined"
          size="small"
        >
          Close
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box 
          ref={containerRef}
          sx={{ 
            height: '100%', 
            display: 'flex', 
            position: 'relative'
          }}
        >
          {/* Document Preview - Left Side */}
          <Box 
            sx={{ 
              width: `${leftWidth}%`,
              borderRight: 1, 
              borderColor: 'divider', 
              display: 'flex', 
              flexDirection: 'column',
              minWidth: '200px'
            }}
          >
            <Box sx={{ p: 2, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                {config.icon}
                <Box sx={{ ml: 1 }}>{config.previewTitle}</Box>
              </Typography>
              
              {previewUrl ? (
                <Box sx={{ height: 'calc(100% - 60px)', flex: 1 }}>
                  {documentType === 'video' ? (
                    <video
                      src={previewUrl}
                      controls
                      style={{
                        width: '100%',
                        height: '100%',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    <iframe
                      src={previewUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                      title={`${config.previewTitle}`}
                    />
                  )}
                </Box>
              ) : (
                <Paper sx={{ p: 2, textAlign: 'center', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Typography color="text.secondary">
                    {previewError || `No ${documentType} available for preview`}
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>

          {/* Resizer */}
          <Box
            onMouseDown={handleMouseDown}
            sx={{
              width: '4px',
              backgroundColor: isResizing ? 'primary.main' : 'grey.300',
              cursor: 'col-resize',
              '&:hover': {
                backgroundColor: 'primary.main'
              },
              transition: 'background-color 0.2s'
            }}
          />

          {/* Grading Rubric - Right Side */}
          <Box 
            sx={{ 
              width: `${100 - leftWidth}%`,
              display: 'flex', 
              flexDirection: 'column',
              minWidth: '200px'
            }}
          >
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Grading Rubric
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Score saved successfully!
                    </Alert>
                  )}

                  {existingScore && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      You have already graded this {documentType}. Your previous scores are loaded below.
                    </Alert>
                  )}

                  {/* Rubric Categories */}
                  <Box sx={{ mb: 3 }}>
                    {config.rubricCategories.map((category, index) => (
                      <Paper key={category.id} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {category.title} (0-{category.maxScore})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {category.description}
                        </Typography>
                        
                        <TextField
                          type="number"
                          label="Score"
                          value={category.id === 'scoreOne' ? scoreOne : category.id === 'scoreTwo' ? scoreTwo : scoreThree}
                          onChange={(e) => handleScoreChange(category.id, e.target.value)}
                          inputProps={{ min: 0, max: category.maxScore }}
                          sx={{ width: 100, mr: 2 }}
                        />
                      </Paper>
                    ))}
                  </Box>

                  {/* Overall Score */}
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.light', color: 'white' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Overall Score: {calculateOverallScore()}/10
                    </Typography>
                    <Typography variant="body2">
                      Average of all three category scores
                    </Typography>
                  </Paper>

                  {/* Overall Notes */}
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Overall Notes"
                    placeholder="Write any overall feedback here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  {/* Save Button */}
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || (!scoreOne && !scoreTwo && !scoreThree)}
                    fullWidth
                    size="large"
                  >
                    {saving ? 'Saving...' : 'Save Score'}
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentGradingModal;
