import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  TextField,
  CircularProgress,
  ThemeProvider,
  CssBaseline,
  Card,
  Grid,
  CardContent,
  Divider,
  Badge,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Switch,
  Tabs,
  Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  SkipNext as SkipNextIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Help as HelpIcon,
  Event as EventIcon,
  Grade as GradeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import globalTheme from '../styles/globalTheme';
import '../styles/Staging.css';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import AccessControl from '../components/AccessControl';
import { useAuth } from '../context/AuthContext';

// API functions for staging
const stagingAPI = {
  async fetchCandidates() {
    return await apiClient.get('/admin/staging/candidates');
  },

  async fetchActiveCycle() {
    return await apiClient.get('/admin/cycles/active');
  },

  async fetchAdminApplications() {
    return await apiClient.get('/admin/applications');
  },

  async updateApproval(applicationId, approved) {
    return await apiClient.patch(`/admin/candidates/${applicationId}/approval`, { approved });
  },

  async addApplicationComment(applicationId, content) {
    return await apiClient.post(`/applications/${applicationId}/comments`, { content });
  },

  async fetchCandidateDetails(candidateId) {
    return await apiClient.get(`/applications/${candidateId}`);
  },

  async fetchCandidateScores(candidateId) {
    return await apiClient.get(`/applications/${candidateId}/grades/average`);
  },

  async fetchEventAttendance() {
    return await apiClient.get('/admin/events');
  },

  async fetchReviewTeams() {
    return await apiClient.get('/admin/review-teams');
  },

  async updateCandidateStatus(candidateId, status, notes = '') {
    return await apiClient.patch(`/admin/staging/candidates/${candidateId}/status`, {
      status,
      notes
    });
  },

  async submitFinalDecision(candidateId, decision, feedback = '') {
    return await apiClient.post(`/admin/staging/candidates/${candidateId}/final-decision`, {
      decision,
      feedback
    });
  },



  async advanceToNextRound(candidateId, roundNumber) {
    return await apiClient.post(`/admin/staging/candidates/${candidateId}/advance-round`, {
      roundNumber
    });
  },

  async fetchAdminCandidates() {
    return await apiClient.get('/admin/candidates');
  },

  async advanceRound() {
    return await apiClient.post('/admin/advance-round', {});
  },

  async processDecisions() {
    return await apiClient.post('/admin/process-decisions', { sendEmails: false });
  },

  async processCoffeeDecisions() {
    return await apiClient.post('/admin/process-coffee-decisions', {});
  },

  async processFirstRoundDecisions() {
    return await apiClient.post('/admin/process-first-round-decisions', { sendEmails: false });
  },

  async processFinalDecisions() {
    return await apiClient.post('/admin/process-final-decisions', {});
  },

  async loadExistingDecisions() {
    return await apiClient.get('/admin/existing-decisions');
  },

  async saveDecision(candidateId, decision, phase = 'resume') {
    return await apiClient.post('/admin/save-decision', { 
      candidateId, 
      decision, 
      phase 
    });
  },

  async fetchEvaluationSummaries(applicationIds) {
    return await apiClient.post('/admin/applications/evaluation-summaries', { applicationIds });
  }
};



// Decision options
const decisionOptions = [
  { value: 'ADVANCE', label: 'Advance to Next Round', color: 'success', icon: <ThumbUpIcon /> },
  { value: 'REJECT', label: 'Reject', color: 'error', icon: <ThumbDownIcon /> },
  { value: 'WAITLIST', label: 'Waitlist', color: 'warning', icon: <HelpIcon /> },
  { value: 'HOLD', label: 'Hold for Review', color: 'info', icon: <VisibilityIcon /> }
];



const StatusChip = ({ status, size = 'small' }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return { color: 'default', label: 'Submitted' };
      case 'UNDER_REVIEW':
        return { color: 'primary', label: 'Under Review' };
      case 'ACCEPTED':
        return { color: 'success', label: 'Accepted' };
      case 'REJECTED':
        return { color: 'error', label: 'Rejected' };
      case 'WAITLISTED':
        return { color: 'warning', label: 'Waitlisted' };
      default:
        return { color: 'default', label: status };
    }
  };

  const config = getStatusConfig(status);
  return <Chip label={config.label} color={config.color} size={size} />;
};

const DecisionChip = ({ decision, size = 'small' }) => {
  const getDecisionConfig = (decision) => {
    switch (decision) {
      case 'ADVANCE':
        return { color: 'success', label: 'Advance', icon: <ThumbUpIcon fontSize="small" /> };
      case 'REJECT':
        return { color: 'error', label: 'Reject', icon: <ThumbDownIcon fontSize="small" /> };
      case 'WAITLIST':
        return { color: 'warning', label: 'Waitlist', icon: <HelpIcon fontSize="small" /> };
      case 'HOLD':
        return { color: 'info', label: 'Hold', icon: <VisibilityIcon fontSize="small" /> };
      default:
        return { color: 'default', label: 'Pending', icon: null };
    }
  };

  const config = getDecisionConfig(decision);
  return (
    <Chip 
      label={config.label} 
      color={config.color} 
      size={size}
      icon={config.icon}
    />
  );
};

const ScoreDisplay = ({ score, maxScore = 10 }) => {
  const percentage = (score / maxScore) * 100;
  const getColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant="body2" fontWeight="bold">
        {score.toFixed(1)}
      </Typography>
      <Box
        sx={{
          width: 40,
          height: 8,
          backgroundColor: 'grey.200',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: `${getColor(percentage)}.main`,
            transition: 'width 0.3s ease'
          }}
        />
      </Box>
    </Box>
  );
};

const AttendanceDisplay = ({ attendance, events }) => {
  
  if (!events || events.length === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60px">
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No events available for this cycle
        </Typography>
      </Box>
    );
  }

  // Handle different attendance data structures
  const getAttendanceStatus = (event) => {
    // The events API returns events with eventName property
    // The attendance object uses eventName as the key
    const eventName = event.eventName || event.name || event.id;
    
    // Try different ways to access attendance data
    let isAttended = false;
    
    if (attendance && eventName) {
      // Try direct key access with eventName
      if (attendance[eventName] !== undefined) {
        isAttended = Boolean(attendance[eventName]);
      } else {
        // Try to find any key that might match
        const attendanceKeys = Object.keys(attendance);
        const matchingKey = attendanceKeys.find(key => 
          key.toLowerCase() === eventName.toLowerCase() ||
          key.toLowerCase().includes(eventName.toLowerCase()) || 
          eventName.toLowerCase().includes(key.toLowerCase())
        );
        if (matchingKey !== undefined) {
          isAttended = Boolean(attendance[matchingKey]);
        }
      }
    }
    
    return isAttended;
  };

  // Filter to only show attended events
  const attendedEventsList = events.filter(event => getAttendanceStatus(event));
  const attendedEventsCount = attendedEventsList.length;

  // Handle case where no events were attended
  if (attendedEventsCount === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60px">
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No events attended
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={0.5}>
      {/* Summary row */}
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
        <Typography 
          variant="caption" 
          color="success.main"
          sx={{ 
            fontWeight: 600, 
            fontSize: '0.75rem'
          }}
        >
          {attendedEventsCount} event{attendedEventsCount !== 1 ? 's' : ''} attended
        </Typography>
      </Box>
      
      {/* Individual attended events only */}
      {attendedEventsList.map((event) => {
        const eventName = event.eventName || event.name || event.id;
        
        return (
          <Box key={event.id || event.name} display="flex" alignItems="center" gap={0.5}>
            <Checkbox
              checked={true}
              disabled
              size="small"
              sx={{ padding: 0.5 }}
              icon={<CancelIcon fontSize="small" />}
              checkedIcon={<CheckCircleIcon fontSize="small" />}
            />
            <Typography 
              variant="caption" 
              color="success.main"
              sx={{ 
                fontSize: '0.7rem',
                fontWeight: 500,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {eventName}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};

// Highlight config for inline decision selector
const getDecisionHighlight = (decision) => {
  switch (decision) {
    case 'yes':
      return { bg: 'success.light', border: 'success.main' };
    case 'maybe_yes':
      return { bg: 'info.light', border: 'info.main' };
    case 'maybe_no':
      return { bg: 'warning.light', border: 'warning.main' };
    case 'no':
      return { bg: 'error.light', border: 'error.main' };
    default:
      return { bg: 'grey.50', border: 'grey.300' };
  }
};

// Helper function to check if a decision is valid for pushing
const isValidDecision = (decision) => {
  return decision === 'yes' || decision === 'no';
};

const GradingStatusDisplay = ({ candidate, gradingData }) => {
  if (!gradingData) {
    return (
      <Chip label="No Grading Data" color="default" size="small" />
    );
  }
  
  const { complete, hasResume, hasCoverLetter, hasVideo, hasResumeScore, hasCoverLetterScore, hasVideoScore } = gradingData;
  
  if (complete) {
    const tooltipText = `All available documents have been scored:
${hasResume ? '✓ Resume' : '✗ No Resume'}
${hasCoverLetter ? '✓ Cover Letter' : '✗ No Cover Letter'}
${hasVideo ? '✓ Video' : '✗ No Video'}`;
    
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip label="Grading Complete" color="success" size="small" />
      </Tooltip>
    );
  }
  
  // Show what's missing
  const missingItems = [];
  if (hasResume && !hasResumeScore) missingItems.push('Resume Score');
  if (hasCoverLetter && !hasCoverLetterScore) missingItems.push('Cover Letter Score');
  if (hasVideo && !hasVideoScore) missingItems.push('Video Score');
  
  const tooltipText = `Grading Progress:
${hasResume ? (hasResumeScore ? '✓ Resume Scored' : '⏳ Resume Pending') : '✗ No Resume'}
${hasCoverLetter ? (hasCoverLetterScore ? '✓ Cover Letter Scored' : '⏳ Cover Letter Pending') : '✗ No Cover Letter'}
${hasVideo ? (hasVideoScore ? '✓ Video Scored' : '⏳ Video Pending') : '✗ No Video'}`;
  
  return (
    <Tooltip title={tooltipText} arrow>
      <Box>
        <Chip label="Grading in Progress" color="warning" size="small" sx={{ mb: 1 }} />
        <Typography variant="caption" display="block" color="text.secondary">
          Missing: {missingItems.join(', ')}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          Documents: {[hasResume && 'Resume', hasCoverLetter && 'Cover Letter', hasVideo && 'Video'].filter(Boolean).join(', ')}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default function Staging() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [candidates, setCandidates] = useState([]);
  const [events, setEvents] = useState([]); // Add events state
  const [reviewTeams, setReviewTeams] = useState([]); // Add review teams state
  const [adminApplications, setAdminApplications] = useState([]); // Add admin applications state

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [gradingCompleteByCandidate, setGradingCompleteByCandidate] = useState({});
  const [inlineDecisions, setInlineDecisions] = useState({});
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [finalDecisionDialogOpen, setFinalDecisionDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    round: 'all',
    decision: 'all',
    attendance: 'all',
    reviewTeam: 'all',
    referral: 'all',
    search: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pushAllDialogOpen, setPushAllDialogOpen] = useState(false);
  const [pushAllConfirmText, setPushAllConfirmText] = useState('');
  const [pushAllAcknowledge, setPushAllAcknowledge] = useState(false);
  const [pushAllLoading, setPushAllLoading] = useState(false);
  const [pushAllPreview, setPushAllPreview] = useState({ 
    totalApproved: 0, 
    invalidDecisions: 0,
    invalidDecisionCandidates: []
  });
  const [demographics, setDemographics] = useState({ graduationYear: {}, gender: {}, referral: {} });
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appModalLoading, setAppModalLoading] = useState(false);
  const [appModal, setAppModal] = useState(null);
  const [interviewEvaluations, setInterviewEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  
  // Test For note (admin only)
  const [testForNote, setTestForNote] = useState('');
  const [isEditingTestFor, setIsEditingTestFor] = useState(false);
  const [savingTestFor, setSavingTestFor] = useState(false);
  
  // Coffee chat interview filter
  const [coffeeChatInterviewFilter, setCoffeeChatInterviewFilter] = useState('all');
  const [coffeeChatInterviews, setCoffeeChatInterviews] = useState([]);
  
  // Coffee chat decision filter
  const [coffeeChatDecisionFilter, setCoffeeChatDecisionFilter] = useState('all');
  
  // First Round interview filter
  const [firstRoundInterviewFilter, setFirstRoundInterviewFilter] = useState('all');
  const [firstRoundInterviews, setFirstRoundInterviews] = useState([]);
  
  // First Round decision filter
  const [firstRoundDecisionFilter, setFirstRoundDecisionFilter] = useState('all');
  
  // Document scores for modal
  const [modalResumeScores, setModalResumeScores] = useState([]);
  const [modalCoverLetterScores, setModalCoverLetterScores] = useState([]);
  const [modalVideoScores, setModalVideoScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [docPreview, setDocPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });
  
  // Final round interview notes modal
  const [finalRoundNotesModalOpen, setFinalRoundNotesModalOpen] = useState(false);
  const [finalRoundNotesLoading, setFinalRoundNotesLoading] = useState(false);
  const [finalRoundInterviewNotes, setFinalRoundInterviewNotes] = useState([]);
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState(null);
  
  // Edit score modal state
  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [editingScoreType, setEditingScoreType] = useState(null); // 'resume', 'coverLetter', 'video'
  const [editScoreForm, setEditScoreForm] = useState({
    overallScore: '',
    scoreOne: '',
    scoreTwo: '',
    scoreThree: '',
    notes: '',
    adminScore: '',
    adminNotes: ''
  });
  const [savingScore, setSavingScore] = useState(false);

  // Functions to fetch document scores for modal
  const fetchModalResumeScores = async (candidateId, cycleId) => {
    try {
      if (!candidateId) return;
      const url = cycleId 
        ? `/review-teams/resume-scores/${candidateId}?cycleId=${cycleId}`
        : `/review-teams/resume-scores/${candidateId}`;
      const scores = await apiClient.get(url);
      setModalResumeScores(scores);
    } catch (e) {
      console.error('Error fetching resume scores:', e);
      setModalResumeScores([]);
    }
  };

  const fetchModalCoverLetterScores = async (candidateId, cycleId) => {
    try {
      if (!candidateId) return;
      const url = cycleId 
        ? `/review-teams/cover-letter-scores/${candidateId}?cycleId=${cycleId}`
        : `/review-teams/cover-letter-scores/${candidateId}`;
      const scores = await apiClient.get(url);
      setModalCoverLetterScores(scores);
    } catch (e) {
      console.error('Error fetching cover letter scores:', e);
      setModalCoverLetterScores([]);
    }
  };

  const fetchModalVideoScores = async (candidateId, cycleId) => {
    try {
      if (!candidateId) return;
      const url = cycleId 
        ? `/review-teams/video-scores/${candidateId}?cycleId=${cycleId}`
        : `/review-teams/video-scores/${candidateId}`;
      const scores = await apiClient.get(url);
      setModalVideoScores(scores);
    } catch (e) {
      console.error('Error fetching video scores:', e);
      setModalVideoScores([]);
    }
  };

  // Handle opening edit score modal
  const handleEditScore = (score, scoreType) => {
    setEditingScore(score);
    setEditingScoreType(scoreType);
    setEditScoreForm({
      overallScore: score.overallScore?.toString() || '',
      scoreOne: score.scoreOne?.toString() || '',
      scoreTwo: score.scoreTwo?.toString() || '',
      scoreThree: score.scoreThree?.toString() || '',
      notes: score.notes || score.notesOne || '',
      adminScore: score.adminScore?.toString() || '',
      adminNotes: score.adminNotes || ''
    });
    setEditScoreModalOpen(true);
  };

  // Handle saving edited score
  const handleSaveScore = async () => {
    try {
      setSavingScore(true);
      
      const endpointMap = {
        resume: '/admin/resume-scores',
        coverLetter: '/admin/cover-letter-scores',
        video: '/admin/video-scores'
      };
      
      const endpoint = `${endpointMap[editingScoreType]}/${editingScore.id}`;
      
      const updateData = {
        overallScore: editScoreForm.overallScore ? parseFloat(editScoreForm.overallScore) : undefined,
        scoreOne: editScoreForm.scoreOne ? parseInt(editScoreForm.scoreOne) : undefined,
        scoreTwo: editScoreForm.scoreTwo ? parseInt(editScoreForm.scoreTwo) : undefined,
        scoreThree: editScoreForm.scoreThree ? parseInt(editScoreForm.scoreThree) : undefined,
        adminScore: editScoreForm.adminScore ? parseFloat(editScoreForm.adminScore) : undefined,
        adminNotes: editScoreForm.adminNotes || undefined
      };
      
      // For resume, use 'notes', for cover letter and video use 'notesOne'
      if (editingScoreType === 'resume') {
        updateData.notes = editScoreForm.notes || undefined;
      } else {
        updateData.notesOne = editScoreForm.notes || undefined;
      }
      
      await apiClient.patch(endpoint, updateData);
      
      // Refresh the scores
      if (appModal?.candidateId) {
        await Promise.all([
          fetchModalResumeScores(appModal.candidateId),
          fetchModalCoverLetterScores(appModal.candidateId),
          fetchModalVideoScores(appModal.candidateId)
        ]);
      }
      
      // Refresh candidates list to update rankings
      await fetchCandidates();
      
      setEditScoreModalOpen(false);
      setSnackbar({ open: true, message: 'Score updated successfully. Rankings have been updated.', severity: 'success' });
    } catch (error) {
      console.error('Error updating score:', error);
      setSnackbar({ open: true, message: 'Failed to update score', severity: 'error' });
    } finally {
      setSavingScore(false);
    }
  };

  // Handle saving testFor note
  const handleSaveTestFor = async () => {
    if (!appModal?.id) return;
    
    try {
      setSavingTestFor(true);
      await apiClient.patch(`/admin/applications/${appModal.id}/test-for`, { testFor: testForNote });
      setAppModal(prev => prev ? { ...prev, testFor: testForNote } : null);
      setIsEditingTestFor(false);
      setSnackbar({ open: true, message: 'Test For note saved successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving testFor note:', error);
      setSnackbar({ open: true, message: 'Failed to save testFor note', severity: 'error' });
    } finally {
      setSavingTestFor(false);
    }
  };

  const loadFinalRoundInterviewNotes = async (applicationId) => {
    try {
      setFinalRoundNotesLoading(true);
      setSelectedCandidateForNotes(applicationId);
      
      // Fetch final round interview evaluations for this application
      const notes = await apiClient.get(`/admin/applications/${applicationId}/final-round-interview-evaluations`);
      
      // Notes are already parsed by the backend, no need to parse again
      setFinalRoundInterviewNotes(notes);
      setFinalRoundNotesModalOpen(true);
    } catch (error) {
      console.error('Failed to load final round interview notes:', error);
      setSnackbar({ open: true, message: 'Failed to load interview notes', severity: 'error' });
    } finally {
      setFinalRoundNotesLoading(false);
    }
  };
  const [evaluationSummaries, setEvaluationSummaries] = useState({});
  const [evaluationSummariesFirstRound, setEvaluationSummariesFirstRound] = useState({});

  // Pagination control functions
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters]);

  // Decision state
  const [currentDecision, setCurrentDecision] = useState({
    candidateId: null,
    decision: '',
    notes: '',
    round: null
  });

  // Final decision state
  const [finalDecision, setFinalDecision] = useState({
    candidateId: null,
    decision: '',
    feedback: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [candidatesResponse, activeCycle, adminApplicationsResponse, eventsData, reviewTeamsData, existingDecisionsData] = await Promise.all([
          stagingAPI.fetchCandidates(),
          stagingAPI.fetchActiveCycle(),
          stagingAPI.fetchAdminApplications(),
          stagingAPI.fetchEventAttendance(),
          stagingAPI.fetchReviewTeams(),
          stagingAPI.loadExistingDecisions()
        ]);
        
        // Handle paginated responses
        const candidatesData = candidatesResponse.candidates || candidatesResponse;
        const adminApplicationsData = adminApplicationsResponse.applications || adminApplicationsResponse;
        
        setCandidates(candidatesData);
        setCurrentCycle(activeCycle);
        setAdminApplications(adminApplicationsData || []); // Store admin applications data
        setEvents(eventsData || []); // Store events data
        setReviewTeams(reviewTeamsData || []); // Store review teams data
        
        // Calculate demographics after initial data load
        calculateDemographics(candidatesData, false);
        
        // Update pagination state based on total candidates count
        setPagination(prev => ({
          ...prev,
          total: candidatesData.length,
          totalPages: Math.ceil(candidatesData.length / prev.limit),
          hasNextPage: prev.page < Math.ceil(candidatesData.length / prev.limit),
          hasPrevPage: prev.page > 1
        }));

        // Load existing decisions from database
        if (existingDecisionsData && existingDecisionsData.decisions) {
          setInlineDecisions(existingDecisionsData.decisions);
        }

        // Build grading completion map by candidateId
        const gradingMap = {};
        (adminApplicationsData || []).forEach(app => {
          // Check which documents the candidate has
          const hasResume = Boolean(app.resumeUrl);
          const hasCoverLetter = Boolean(app.coverLetterUrl);
          const hasVideo = Boolean(app.videoUrl);
          
          // Check which documents have been scored
          const hasResumeScore = Boolean(app.hasResumeScore);
          const hasCoverLetterScore = Boolean(app.hasCoverLetterScore);
          const hasVideoScore = Boolean(app.hasVideoScore);
          
          // Grading is complete if all available documents have scores
          let gradingComplete = true;
          
          if (hasResume && !hasResumeScore) gradingComplete = false;
          if (hasCoverLetter && !hasCoverLetterScore) gradingComplete = false;
          if (hasVideo && !hasVideoScore) gradingComplete = false;
          
          gradingMap[app.candidateId] = {
            complete: gradingComplete,
            hasResume,
            hasCoverLetter,
            hasVideo,
            hasResumeScore,
            hasCoverLetterScore,
            hasVideoScore
          };
        });
        setGradingCompleteByCandidate(gradingMap);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({
          open: true,
          message: 'Error loading data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch evaluation summaries when coffee chat tab is active
  useEffect(() => {
    if (currentTab === 1 && adminApplications.length > 0) {
      const coffeeChatApps = adminApplications.filter(app => String(app.currentRound) === '2');
      if (coffeeChatApps.length > 0) {
        fetchCoffeeChatEvaluations(coffeeChatApps);
      }
    }
  }, [currentTab, adminApplications]);

  // Fetch coffee chat interviews when coffee chat tab is active
  useEffect(() => {
    if (currentTab === 1) {
      fetchCoffeeChatInterviews();
    }
  }, [currentTab]);

  // Fetch first round interviews when first round tab is active
  useEffect(() => {
    if (currentTab === 2) {
      fetchFirstRoundInterviews();
    }
  }, [currentTab]);

  // Recalculate demographics when tab changes
  useEffect(() => {
    if (currentTab === 0) {
      // Resume Review tab - use all candidates
      if (candidates && candidates.length > 0) {
        calculateDemographics(candidates, false);
      }
    } else if (currentTab === 1) {
      // Coffee Chat tab - use coffee chat applications
      if (adminApplications && adminApplications.length > 0) {
        const coffeeChatApps = adminApplications.filter(app => String(app.currentRound) === '2');
        calculateDemographics(coffeeChatApps, true);
      }
    } else if (currentTab === 2) {
      // First Round tab - use first round applications
      if (adminApplications && adminApplications.length > 0) {
        const firstRoundApps = adminApplications.filter(app => String(app.currentRound) === '3');
        calculateDemographics(firstRoundApps, true);
      }
    } else if (currentTab === 3) {
      // Final Round tab - use final round applications
      if (adminApplications && adminApplications.length > 0) {
        const finalRoundApps = adminApplications.filter(app => String(app.currentRound) === '4' && app.candidate);
        calculateDemographics(finalRoundApps, true);
      }
    }
  }, [currentTab, candidates, adminApplications, inlineDecisions]);

  // Fetch evaluation summaries when first round tab is active
  useEffect(() => {
    if (currentTab === 2 && adminApplications.length > 0) {
      const firstRoundApps = (adminApplications || []).filter(app => String(app.currentRound) === '3');
      if (firstRoundApps.length > 0) {
        fetchFirstRoundEvaluations(firstRoundApps);
      }
    }
  }, [currentTab, adminApplications]);

  const fetchCandidates = async () => {
    try {
      const [candidatesResponse, adminApplicationsResponse, eventsData, reviewTeamsData, existingDecisionsData] = await Promise.all([
        stagingAPI.fetchCandidates(),
        stagingAPI.fetchAdminApplications(),
        stagingAPI.fetchEventAttendance(),
        stagingAPI.fetchReviewTeams(),
        stagingAPI.loadExistingDecisions()
      ]);
      
      // Handle paginated responses
      const candidatesData = candidatesResponse.candidates || candidatesResponse;
      const adminApplicationsData = adminApplicationsResponse.applications || adminApplicationsResponse;
      
      setCandidates(candidatesData);
      setAdminApplications(adminApplicationsData || []); // Update admin applications data
      setEvents(eventsData || []); // Update events data
      setReviewTeams(reviewTeamsData || []); // Update review teams data
      
      // Calculate demographics after data is loaded
      calculateDemographics(candidatesData, false);
      
      // Update pagination state based on total candidates count
      setPagination(prev => ({
        ...prev,
        total: candidatesData.length,
        totalPages: Math.ceil(candidatesData.length / prev.limit),
        hasNextPage: prev.page < Math.ceil(candidatesData.length / prev.limit),
        hasPrevPage: prev.page > 1
      }));
      
      // Update inline decisions with fresh data from database
      if (existingDecisionsData && existingDecisionsData.decisions) {
        setInlineDecisions(existingDecisionsData.decisions);
      }
      
      const gradingMap = {};
      (adminApplicationsData || []).forEach(app => {
        // Check which documents the candidate has
        const hasResume = Boolean(app.resumeUrl);
        const hasCoverLetter = Boolean(app.coverLetterUrl);
        const hasVideo = Boolean(app.videoUrl);
        
        // Check which documents have been scored
        const hasResumeScore = Boolean(app.hasResumeScore);
        const hasCoverLetterScore = Boolean(app.hasCoverLetterScore);
        const hasVideoScore = Boolean(app.hasVideoScore);
        
        // Grading is complete if all available documents have scores
        let gradingComplete = true;
        
        if (hasResume && !hasResumeScore) gradingComplete = false;
        if (hasCoverLetter && !hasCoverLetterScore) gradingComplete = false;
        if (hasVideo && !hasVideoScore) gradingComplete = false;
        
        gradingMap[app.candidateId] = {
          complete: gradingComplete,
          hasResume,
          hasCoverLetter,
          hasVideo,
          hasResumeScore,
          hasCoverLetterScore,
          hasVideoScore
        };
      });
      setGradingCompleteByCandidate(gradingMap);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setSnackbar({
        open: true,
        message: 'Error loading candidates',
        severity: 'error'
      });
    }
  };

  // Function to calculate ranking score based on evaluation decisions
  const calculateRankingScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    
    // Scoring system: YES=4, MAYBE_YES=3, UNSURE=2, MAYBE_NO=1, NO=0
    const decisionScores = {
      'YES': 4,
      'MAYBE_YES': 3,
      'UNSURE': 2,
      'MAYBE_NO': 1,
      'NO': 0
    };
    
    // Filter out evaluations without decisions (null, undefined, or empty string)
    const evaluationsWithDecisions = evaluations.filter(evaluation => 
      evaluation.decision && 
      evaluation.decision.trim() !== '' && 
      decisionScores.hasOwnProperty(evaluation.decision)
    );
    
    // If no evaluations have decisions, return 0
    if (evaluationsWithDecisions.length === 0) return 0;
    
    const totalScore = evaluationsWithDecisions.reduce((sum, evaluation) => {
      return sum + decisionScores[evaluation.decision];
    }, 0);
    
    return totalScore / evaluationsWithDecisions.length; // Average score of only evaluations with decisions
  };

  // Function to calculate First Round ranking score based on behavioral and market sizing scores
  const calculateFirstRoundRankingScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    
    // Filter evaluations that have behavioral and market sizing scores
    const evaluationsWithScores = evaluations.filter(evaluation => 
      evaluation.behavioralTotal !== null && 
      evaluation.behavioralTotal !== undefined &&
      evaluation.marketSizingTotal !== null && 
      evaluation.marketSizingTotal !== undefined
    );
    
    // If no evaluations have scores, fall back to decision-based scoring
    if (evaluationsWithScores.length === 0) {
      return calculateRankingScore(evaluations);
    }
    
    // Calculate average behavioral and market sizing scores
    const totalBehavioral = evaluationsWithScores.reduce((sum, evaluation) => {
      return sum + (evaluation.behavioralTotal || 0);
    }, 0);
    
    const totalMarketSizing = evaluationsWithScores.reduce((sum, evaluation) => {
      return sum + (evaluation.marketSizingTotal || 0);
    }, 0);
    
    const avgBehavioral = totalBehavioral / evaluationsWithScores.length;
    const avgMarketSizing = totalMarketSizing / evaluationsWithScores.length;
    
    // Combine behavioral and market sizing scores (each out of 15, so total out of 30)
    // Convert to a 0-10 scale for consistency with other ranking systems
    const combinedScore = ((avgBehavioral + avgMarketSizing) / 30) * 10;
    
    return combinedScore;
  };

  // Function to fetch coffee chat interviews from server
  const fetchCoffeeChatInterviews = async () => {
    try {
      const interviews = await apiClient.get('/admin/interviews');
      const coffeeChatInterviews = interviews.filter(interview => 
        interview.interviewType === 'COFFEE_CHAT'
      );
      setCoffeeChatInterviews(coffeeChatInterviews);
    } catch (error) {
      console.error('Error fetching coffee chat interviews:', error);
      setCoffeeChatInterviews([]);
    }
  };

  // Function to fetch first round interviews from server
  const fetchFirstRoundInterviews = async () => {
    try {
      const interviews = await apiClient.get('/admin/interviews');
      const firstRoundInterviews = interviews.filter(interview => 
        interview.interviewType === 'ROUND_ONE'
      );
      setFirstRoundInterviews(firstRoundInterviews);
    } catch (error) {
      console.error('Error fetching first round interviews:', error);
      setFirstRoundInterviews([]);
    }
  };

  // Function to get applications assigned to a specific interview
  const getApplicationsForInterview = (interviewId) => {
    const interview = coffeeChatInterviews.find(i => i.id === interviewId);
    if (!interview) return [];

    // Parse interview configuration to get application groups
    let config = {};
    try {
      config = typeof interview.description === 'string' 
        ? JSON.parse(interview.description) 
        : interview.description || {};
    } catch (e) {
      console.warn('Failed to parse interview description:', e);
      return [];
    }

    // Get all application IDs from the interview's application groups
    const applicationIds = new Set();
    config.applicationGroups?.forEach(group => {
      group.applicationIds?.forEach(appId => applicationIds.add(appId));
    });

    // Filter admin applications to only include those assigned to this interview
    return adminApplications.filter(app => applicationIds.has(app.id));
  };

  // Function to get applications assigned to a specific first round interview
  const getApplicationsForFirstRoundInterview = (interviewId) => {
    const interview = firstRoundInterviews.find(i => i.id === interviewId);
    if (!interview) return [];

    // Parse interview configuration to get application groups
    let config = {};
    try {
      config = typeof interview.description === 'string' 
        ? JSON.parse(interview.description) 
        : interview.description || {};
    } catch (e) {
      console.warn('Failed to parse interview description:', e);
      return [];
    }

    // Get all application IDs from the interview's application groups
    const applicationIds = new Set();
    config.applicationGroups?.forEach(group => {
      group.applicationIds?.forEach(appId => applicationIds.add(appId));
    });

    // Filter admin applications to only include those assigned to this interview
    return adminApplications.filter(app => applicationIds.has(app.id));
  };

  // Function to fetch evaluation summaries for coffee chat applications
  const fetchCoffeeChatEvaluations = async (applications) => {
    try {
      const applicationIds = applications.map(app => app.id);
      const summaries = await stagingAPI.fetchEvaluationSummaries(applicationIds);

      // Only include evaluations from Coffee Chat interviews
      const filteredSummaries = {};
      Object.entries(summaries || {}).forEach(([appId, summary]) => {
        const onlyCoffeeChat = (summary?.evaluations || []).filter(e => e?.interview?.interviewType === 'COFFEE_CHAT');
        filteredSummaries[appId] = { evaluations: onlyCoffeeChat };
      });

      setEvaluationSummaries(filteredSummaries);
    } catch (error) {
      console.error('Error fetching evaluation summaries:', error);
    }
  };

  // Function to fetch evaluation summaries for first round applications
  const fetchFirstRoundEvaluations = async (applications) => {
    try {
      const applicationIds = applications.map(app => app.id);
      const summaries = await stagingAPI.fetchEvaluationSummaries(applicationIds);

      // Only include evaluations from First Round interviews
      const filteredSummaries = {};
      Object.entries(summaries || {}).forEach(([appId, summary]) => {
        const onlyFirstRound = (summary?.evaluations || []).filter(e => e?.interview?.interviewType === 'ROUND_ONE');
        filteredSummaries[appId] = { evaluations: onlyFirstRound };
      });

      setEvaluationSummariesFirstRound(filteredSummaries);
    } catch (error) {
      console.error('Error fetching first round evaluation summaries:', error);
    }
  };

  const handleDecisionSubmit = async () => {
    try {
      await stagingAPI.updateCandidateStatus(
        currentDecision.candidateId,
        currentDecision.decision,
        currentDecision.notes
      );
      
      setDecisionDialogOpen(false);
      setCurrentDecision({ candidateId: null, decision: '', notes: '', round: null });
      await fetchCandidates();
      
      setSnackbar({
        open: true,
        message: 'Decision submitted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error submitting decision:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting decision',
        severity: 'error'
      });
    }
  };

  const handleFinalDecisionSubmit = async () => {
    try {
      await stagingAPI.submitFinalDecision(
        finalDecision.candidateId,
        finalDecision.decision,
        finalDecision.feedback
      );
      
      setFinalDecisionDialogOpen(false);
      setFinalDecision({ candidateId: null, decision: '', feedback: '' });
      await fetchCandidates();
      
      setSnackbar({
        open: true,
        message: 'Final decision submitted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error submitting final decision:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting final decision',
        severity: 'error'
      });
    }
  };

  const openDecisionDialog = (candidate, round) => {
    setCurrentDecision({
      candidateId: candidate.id,
      decision: '',
      notes: '',
      round
    });
    setSelectedCandidate(candidate);
    setDecisionDialogOpen(true);
  };

  const openFinalDecisionDialog = (candidate) => {
    setFinalDecision({
      candidateId: candidate.id,
      decision: '',
      feedback: ''
    });
    setSelectedCandidate(candidate);
    setFinalDecisionDialogOpen(true);
  };

  const calculateDemographics = (data, isApplicationData = false) => {
    // Initialize with specific categories
    const graduationYearBreakdown = {
      '2026': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2027': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2028': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2029': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };
    
    const genderBreakdown = {
      'Male': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'Female': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'Other': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };
    
    const referralBreakdown = {
      'Yes': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'No': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };
    
    const overallTotal = data.length;

    data.forEach((item, index) => {
      // For application data, we need to access the candidate info differently
      const candidate = isApplicationData ? item.candidate : item;
      
      // Skip if candidate is undefined or null (only for candidate data, not application data)
      if (!isApplicationData && !candidate) {
        console.warn('Skipping item with undefined candidate:', item);
        return;
      }
      
      // For application data, use the application's own graduationYear and gender fields
      // For candidate data, use the candidate's fields
      let year, gender, hasReferral;
      if (isApplicationData) {
        year = item.year || item.graduationYear; // Application data has 'year' field
        gender = item.gender;
        hasReferral = item.hasReferral;
      } else {
        year = candidate.graduationYear;
        gender = candidate.gender;
        hasReferral = candidate.hasReferral;
      }
      
      // Graduation year breakdown - map to specific years
      if (!year || !['2026', '2027', '2028', '2029'].includes(year)) {
        year = '2026'; // Default to 2026 if not in our list
      }
      
      graduationYearBreakdown[year].total++;
      
      // Get decision for this candidate
      let decision = '';
      if (isApplicationData) {
        // For applications, check both inline decisions and database decisions
        decision = inlineDecisions[item.id] || (item.approved === true ? 'yes' : item.approved === false ? 'no' : '');
      } else {
        // For candidates, use inline decisions
        decision = inlineDecisions[candidate.id] || '';
      }
      
      if (decision === 'yes') {
        graduationYearBreakdown[year].yes++;
      } else if (decision === 'no') {
        graduationYearBreakdown[year].no++;
      } else if (decision === 'maybe_yes' || decision === 'maybe_no') {
        graduationYearBreakdown[year].maybe++;
      } else {
        graduationYearBreakdown[year].pending++;
      }
      
      // Gender breakdown - normalize to our categories
      if (!gender) {
        gender = 'Other';
      } else if (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'm') {
        gender = 'Male';
      } else if (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f') {
        gender = 'Female';
      } else {
        gender = 'Other';
      }
      
      genderBreakdown[gender].total++;
      
      if (decision === 'yes') {
        genderBreakdown[gender].yes++;
      } else if (decision === 'no') {
        genderBreakdown[gender].no++;
      } else if (decision === 'maybe_yes' || decision === 'maybe_no') {
        genderBreakdown[gender].maybe++;
      } else {
        genderBreakdown[gender].pending++;
      }

      // Referral breakdown
      const referralKey = hasReferral ? 'Yes' : 'No';
      referralBreakdown[referralKey].total++;
      
      if (decision === 'yes') {
        referralBreakdown[referralKey].yes++;
      } else if (decision === 'no') {
        referralBreakdown[referralKey].no++;
      } else if (decision === 'maybe_yes' || decision === 'maybe_no') {
        referralBreakdown[referralKey].maybe++;
      } else {
        referralBreakdown[referralKey].pending++;
      }
    });
    
    setDemographics({ graduationYear: graduationYearBreakdown, gender: genderBreakdown, referral: referralBreakdown });
  };

  const handleInlineDecisionChange = async (item, value, phase = 'resume') => {
    try {
      console.log('Saving decision:', { itemId: item.id, value, phase });
      
      // Save decision to database immediately
      // Note: item.id is the application ID (works for both candidates and applications)
      const response = await stagingAPI.saveDecision(item.id, value, phase);
      console.log('Decision save response:', response);

      // Update local UI selection
      setInlineDecisions(prev => ({ ...prev, [item.id]: value }));

      // Show success message
      setSnackbar({ open: true, message: 'Decision saved successfully', severity: 'success' });
      
      // Refresh data to show updated state
      await fetchCandidates();
    } catch (error) {
      console.error('Error saving inline decision:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSnackbar({ open: true, message: 'Failed to save decision', severity: 'error' });
      
      // Revert the UI change if save failed
      setInlineDecisions(prev => ({ ...prev, [item.id]: prev[item.id] || '' }));
    }
  };

  const openPushAll = async () => {
    try {
      const adminCandidates = await stagingAPI.fetchAdminCandidates();
      const eligibleStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'];
      const totalApproved = adminCandidates.filter(c => c.approved === true && eligibleStatuses.includes(c.status)).length;
      
      // Check for applications with invalid decisions (not "yes" or "no") or no decisions
      const invalidDecisions = adminCandidates.filter(c => {
        // Check if candidate has a decision that's not "yes" or "no", or no decision at all
        const decision = c.approved; // Use the approved field from the database
        return decision === null || (decision !== true && decision !== false);
      });
      
      setPushAllPreview({ 
        totalApproved,
        invalidDecisions: invalidDecisions.length,
        invalidDecisionCandidates: invalidDecisions
      });
    } catch (e) {
      console.error('Error preparing push-all preview:', e);
      setPushAllPreview({ totalApproved: 0, invalidDecisions: 0, invalidDecisionCandidates: [] });
    }
    setPushAllConfirmText('');
    setPushAllAcknowledge(false);
    setPushAllDialogOpen(true);
  };

  const openPushAllCoffee = async () => {
    try {
      const adminCandidates = await stagingAPI.fetchAdminCandidates();
      // Consider only applications in Coffee Chat round (currentRound === '2')
      const coffeeCandidates = adminCandidates.filter(c => String(c.currentRound) === '2');

      const invalidDecisions = coffeeCandidates.filter(c => {
        // Only count as valid if in phase 2 AND decision is yes/no
        const decision = c.approved;
        return decision === null || (decision !== true && decision !== false);
      });

      setPushAllPreview({
        totalApproved: coffeeCandidates.length,
        invalidDecisions: invalidDecisions.length,
        invalidDecisionCandidates: invalidDecisions
      });
    } catch (e) {
      console.error('Error preparing coffee chat push-all preview:', e);
      setPushAllPreview({ totalApproved: 0, invalidDecisions: 0, invalidDecisionCandidates: [] });
    }
    setPushAllConfirmText('');
    setPushAllAcknowledge(false);
    setPushAllDialogOpen(true);
  };

  const openPushAllFirstRound = async () => {
    try {
      const firstRoundApps = (adminApplications || []).filter(app => String(app.currentRound) === '3');
      
      const invalidDecisions = firstRoundApps.filter(app => {
        const decision = app.approved;
        return decision === null || (decision !== true && decision !== false);
      });

      setPushAllPreview({
        totalCandidates: firstRoundApps.length,
        validDecisions: firstRoundApps.length - invalidDecisions.length,
        invalidDecisions: invalidDecisions.length,
        invalidCandidates: invalidDecisions.map(app => ({
          name: `${app.firstName} ${app.lastName}`,
          issue: app.approved === null ? 'No decision' : 'Unclear decision'
        }))
      });

      setPushAllConfirmText('');
      setPushAllAcknowledge(false);
      setPushAllDialogOpen(true);
    } catch (error) {
      console.error('Error preparing first round push all:', error);
      setSnackbar({ open: true, message: 'Failed to prepare first round processing', severity: 'error' });
    }
  };

  const openPushAllFinal = async () => {
    try {
      const adminCandidates = await stagingAPI.fetchAdminCandidates();
      // Consider only applications in Final Round (currentRound = '4')
      const finalCandidates = adminCandidates.filter(c => String(c.currentRound) === '4');

      const invalidDecisions = finalCandidates.filter(c => {
        // Only count as valid if in final round AND decision is yes/no
        const decision = c.approved;
        return decision === null || (decision !== true && decision !== false);
      });

      setPushAllPreview({
        totalApproved: finalCandidates.length,
        invalidDecisions: invalidDecisions.length,
        invalidDecisionCandidates: invalidDecisions
      });
    } catch (e) {
      console.error('Error preparing final round push-all preview:', e);
      setPushAllPreview({ totalApproved: 0, invalidDecisions: 0, invalidDecisionCandidates: [] });
    }
    setPushAllConfirmText('');
    setPushAllAcknowledge(false);
    setPushAllDialogOpen(true);
  };

  const confirmPushAll = async () => {
    try {
      setPushAllLoading(true);
      
      // Determine which tab is active to choose processing route
      let result;
      if (currentTab === 1) {
        result = await stagingAPI.processCoffeeDecisions();
      } else if (currentTab === 2) {
        result = await stagingAPI.processFirstRoundDecisions();
      } else if (currentTab === 3) {
        result = await stagingAPI.processFinalDecisions();
      } else {
        result = await stagingAPI.processDecisions();
      }
      
      setPushAllDialogOpen(false);
      
      // Show success message with results
      const { summary } = result;
      if (summary) {
        const emailMessage = currentTab === 0 ? 'No emails sent (resume review round)' : 
                           currentTab === 1 ? 'No emails sent (coffee chat round)' :
                           currentTab === 2 ? 'No emails sent (first round)' :
                           `${summary.emailsSent} emails sent`;
        setSnackbar({ 
          open: true, 
          message: `Successfully processed ${summary.totalApplications} candidates: ${summary.accepted} accepted, ${summary.rejected} rejected. ${emailMessage}.`, 
          severity: 'success' 
        });
      } else {
        setSnackbar({ open: true, message: 'Processed decisions.', severity: 'success' });
      }
      
      // Refresh candidates data
      await fetchCandidates();
      
    } catch (e) {
      console.error('Error processing decisions:', e);
      setSnackbar({ open: true, message: 'Failed to process decisions', severity: 'error' });
    } finally {
      setPushAllLoading(false);
    }
  };

  const fixInvalidDecision = async (candidateId, newDecision) => {
    try {
      // Update the decision
      // Note: candidateId is actually the application ID from the staging candidates endpoint
      await stagingAPI.saveDecision(candidateId, newDecision, 'resume');
      
      // Update the preview to reflect the change
      setPushAllPreview(prev => ({
        ...prev,
        invalidDecisions: prev.invalidDecisions - 1,
        invalidDecisionCandidates: prev.invalidDecisionCandidates.filter(c => c.id !== candidateId)
      }));
      
      // Refresh candidates to get updated data
      await fetchCandidates();
      
      setSnackbar({ open: true, message: 'Decision updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error fixing invalid decision:', error);
      setSnackbar({ open: true, message: 'Failed to update decision', severity: 'error' });
    }
  };

  const handleExportDecisions = () => {
    // Use adminApplications as the data source since it contains the actual candidate data
    const dataSource = adminApplications || [];
    
    if (dataSource.length === 0) {
      setSnackbar({ 
        open: true, 
        message: 'No candidate data available to export', 
        severity: 'warning' 
      });
      return;
    }
    
    // Filter by current round based on active tab
    let roundFilteredData = dataSource;
    let roundName = 'all rounds';
    
    if (currentTab === 0) {
      // Resume Review tab - filter for currentRound === '1'
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '1');
      roundName = 'Resume Review';
    } else if (currentTab === 1) {
      // Coffee Chat tab - filter for currentRound === '2'
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '2');
      roundName = 'Coffee Chat';
    } else if (currentTab === 2) {
      // First Round tab - filter for currentRound === '3'
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '3');
      roundName = 'First Round';
    } else if (currentTab === 3) {
      // Final Round tab - filter for currentRound === '4'
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '4');
      roundName = 'Final Round';
    }
    
    if (roundFilteredData.length === 0) {
      setSnackbar({ 
        open: true, 
        message: `No candidates found in ${roundName} round`, 
        severity: 'warning' 
      });
      return;
    }
    
    // Create a dialog to let user choose export options
    const exportDialog = window.confirm(
      `Export ${roundName} Round Decisions:\n\n` +
      'OK = Export candidates with decisions (Yes/No)\n' +
      'Cancel = Export all candidates regardless of decision status'
    );
    
    let candidatesToExport = roundFilteredData;
    
    if (exportDialog) {
      // Export only candidates with Yes/No decisions
      candidatesToExport = roundFilteredData.filter(app => 
        app.approved === true || app.approved === false
      );
    }
    
    // Create CSV content
    const csvHeaders = ['Name', 'Email', 'Student ID', 'Decision'];
    const csvRows = candidatesToExport.map(app => {
      const name = app.name || `${app.firstName || ''} ${app.lastName || ''}`.trim();
      
      // Try different possible email field names
      const email = app.email || app.applicationEmail || app.candidateEmail || '';
      const studentId = app.studentId || '';
      const decision = app.approved === true ? 'Yes' : 
                     app.approved === false ? 'No' : 'Pending';
      
      // Debug: Log the first few entries to see what data we're getting
      if (candidatesToExport.indexOf(app) < 3) {
        console.log('Export data for app:', {
          name,
          email,
          studentId,
          decision,
          availableFields: Object.keys(app),
          emailField: app.email,
          applicationEmail: app.applicationEmail,
          candidateEmail: app.candidateEmail,
          fullApp: app
        });
      }
      
      return [name, email, studentId, decision];
    });
    
    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${roundName.toLowerCase().replace(' ', '_')}_decisions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({ 
      open: true, 
      message: `Exported ${candidatesToExport.length} ${roundName} candidates to CSV`, 
      severity: 'success' 
    });
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesStatus = filters.status === 'all' || candidate.status === filters.status;
    const matchesRound = filters.round === 'all' || parseInt(candidate.currentRound) === parseInt(filters.round);
    const matchesDecision = filters.decision === 'all' || 
      (filters.decision === 'pending' && !candidate.decisions[`round${candidate.currentRound}`]) ||
      (filters.decision !== 'pending' && candidate.decisions[`round${candidate.currentRound}`] === filters.decision);
    
    // Attendance filtering
    let matchesAttendance = true;
    if (filters.attendance !== 'all' && events.length > 0) {
      const totalEvents = events.length;
      const attendedEvents = events.filter(event => {
        const eventName = event.eventName || event.name || event.id;
        if (!candidate.attendance || !eventName) return false;
        
        // Try direct key access with eventName
        if (candidate.attendance[eventName] !== undefined) {
          return Boolean(candidate.attendance[eventName]);
        }
        
        // Try to find any key that might match
        const attendanceKeys = Object.keys(candidate.attendance);
        const matchingKey = attendanceKeys.find(key => 
          key.toLowerCase() === eventName.toLowerCase() ||
          key.toLowerCase().includes(eventName.toLowerCase()) || 
          eventName.toLowerCase().includes(key.toLowerCase())
        );
        return matchingKey !== undefined ? Boolean(candidate.attendance[matchingKey]) : false;
      }).length;
      const attendancePercentage = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0;
      
      switch (filters.attendance) {
        case 'high':
          matchesAttendance = attendancePercentage >= 80;
          break;
        case 'medium':
          matchesAttendance = attendancePercentage >= 60 && attendancePercentage < 80;
          break;
        case 'low':
          matchesAttendance = attendancePercentage >= 40 && attendancePercentage < 60;
          break;
        case 'very_low':
          matchesAttendance = attendancePercentage < 40;
          break;
        case 'none':
          matchesAttendance = attendedEvents === 0;
          break;
        default:
          matchesAttendance = true;
      }
    }
    
    // Review team filtering
    let matchesReviewTeam = true;
    if (filters.reviewTeam !== 'all') {
      if (filters.reviewTeam === 'unassigned') {
        matchesReviewTeam = !candidate.reviewTeam;
      } else {
        matchesReviewTeam = candidate.reviewTeam && candidate.reviewTeam.id === filters.reviewTeam;
      }
    }
    
    // Referral filtering
    let matchesReferral = true;
    if (filters.referral !== 'all') {
      if (filters.referral === 'yes') {
        matchesReferral = candidate.hasReferral === true;
      } else if (filters.referral === 'no') {
        matchesReferral = candidate.hasReferral === false;
      }
    }
    
    const matchesSearch = filters.search === '' || 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(filters.search.toLowerCase()) ||
      candidate.email.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesRound && matchesDecision && matchesAttendance && matchesReviewTeam && matchesReferral && matchesSearch;
  }).
