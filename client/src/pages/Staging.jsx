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
  CardContent,
  Grid,
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
  Clear as ClearIcon
} from '@mui/icons-material';
import globalTheme from '../styles/globalTheme';
import '../styles/Staging.css';
import apiClient from '../utils/api';
import AuthenticatedFileLink from '../components/AuthenticatedFileLink';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import AccessControl from '../components/AccessControl';

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
    return await apiClient.post('/admin/process-decisions', {});
  },

  async processCoffeeDecisions() {
    return await apiClient.post('/admin/process-coffee-decisions', {});
  },

  async processFirstRoundDecisions() {
    return await apiClient.post('/admin/process-first-round-decisions', {});
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
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appModalLoading, setAppModalLoading] = useState(false);
  const [appModal, setAppModal] = useState(null);
  const [interviewEvaluations, setInterviewEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  
  // Document scores for modal
  const [modalResumeScores, setModalResumeScores] = useState([]);
  const [modalCoverLetterScores, setModalCoverLetterScores] = useState([]);
  const [modalVideoScores, setModalVideoScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [docPreview, setDocPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });

  // Functions to fetch document scores for modal
  const fetchModalResumeScores = async (candidateId) => {
    try {
      if (!candidateId) return;
      const scores = await apiClient.get(`/review-teams/resume-scores/${candidateId}`);
      setModalResumeScores(scores);
    } catch (e) {
      console.error('Error fetching resume scores:', e);
      setModalResumeScores([]);
    }
  };

  const fetchModalCoverLetterScores = async (candidateId) => {
    try {
      if (!candidateId) return;
      const scores = await apiClient.get(`/review-teams/cover-letter-scores/${candidateId}`);
      setModalCoverLetterScores(scores);
    } catch (e) {
      console.error('Error fetching cover letter scores:', e);
      setModalCoverLetterScores([]);
    }
  };

  const fetchModalVideoScores = async (candidateId) => {
    try {
      if (!candidateId) return;
      const scores = await apiClient.get(`/review-teams/video-scores/${candidateId}`);
      setModalVideoScores(scores);
    } catch (e) {
      console.error('Error fetching video scores:', e);
      setModalVideoScores([]);
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
      const coffeeChatApps = adminApplications.filter(app => app.status === 'UNDER_REVIEW');
      if (coffeeChatApps.length > 0) {
        fetchCoffeeChatEvaluations(coffeeChatApps);
      }
    }
  }, [currentTab, adminApplications]);

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
    
    const totalScore = evaluations.reduce((sum, evaluation) => {
      return sum + (decisionScores[evaluation.decision] || 0);
    }, 0);
    
    return totalScore / evaluations.length; // Average score
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

  const handleInlineDecisionChange = async (item, value, phase = 'resume') => {
    try {
      
      // Save decision to database immediately
      // Note: item.id is the application ID (works for both candidates and applications)
      await stagingAPI.saveDecision(item.id, value, phase);

      // Update local UI selection
      setInlineDecisions(prev => ({ ...prev, [item.id]: value }));

      // Show success message
      setSnackbar({ open: true, message: 'Decision saved successfully', severity: 'success' });
      
      // Refresh data to show updated state
      await fetchCandidates();
    } catch (error) {
      console.error('Error saving inline decision:', error);
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
      // Consider only applications in Coffee Chat round (UNDER_REVIEW for round 2)
      const coffeeCandidates = adminCandidates.filter(c => c.status === 'UNDER_REVIEW');

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
        setSnackbar({ 
          open: true, 
          message: `Successfully processed ${summary.totalApplications} candidates: ${summary.accepted} accepted, ${summary.rejected} rejected. ${summary.emailsSent} emails sent.`, 
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
  }).sort((a, b) => {
    // Sort by overall score (highest to lowest)
    return b.scores.overall - a.scores.overall;
  });

  // Apply client-side pagination to filtered results
  const paginatedCandidates = filteredCandidates.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AccessControl allowedRoles={['ADMIN', 'MEMBER']}>
      <ThemeProvider theme={globalTheme}>
      <CssBaseline />
      <Box className="staging-page">
        {/* Header */}
        <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#042742' }}>
              Candidate Staging
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review candidates, track attendance, evaluate scores, and make decisions
            </Typography>
          </Box>
          <Box>
            <Chip 
              label={currentCycle ? `Current Cycle: ${currentCycle.name}` : 'No Active Cycle'}
              color={currentCycle ? 'primary' : 'default'}
            />
          </Box>
        </Box>

        {/* Invalid Decisions Summary */}
        {(() => {
          // Check candidates from the database for decisions
          const invalidDecisionsCount = candidates.filter(c => 
            c.approved === null || (c.approved !== true && c.approved !== false)
          ).length;
          
          
          return null;
        })()}


        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
              <Tab label="Resume Review" />
              <Tab label="Coffee Chats" />
              <Tab label="First Round" />
              <Tab label="Final Round" />
            </Tabs>
          </CardContent>
        </Card>

        {/* Filters */}
        {currentTab === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search candidates..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="SUBMITTED">Submitted</MenuItem>
                    <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                    <MenuItem value="ACCEPTED">Accepted</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="WAITLISTED">Waitlisted</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Round</InputLabel>
                  <Select
                    value={filters.round}
                    onChange={(e) => setFilters({ ...filters, round: e.target.value })}
                    label="Round"
                  >
                    <MenuItem value="all">All Rounds</MenuItem>
                    <MenuItem value={1}>Resume Review</MenuItem>
                    <MenuItem value={2}>Coffee Chats</MenuItem>
                    <MenuItem value={3}>First Round Interviews</MenuItem>
                    <MenuItem value={4}>Final Decision</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Decision</InputLabel>
                  <Select
                    value={filters.decision}
                    onChange={(e) => setFilters({ ...filters, decision: e.target.value })}
                    label="Decision"
                  >
                    <MenuItem value="all">All Decisions</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="ADVANCE">Advance</MenuItem>
                    <MenuItem value="REJECT">Reject</MenuItem>
                    <MenuItem value="WAITLIST">Waitlist</MenuItem>
                    <MenuItem value="HOLD">Hold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Attendance</InputLabel>
                  <Select
                    value={filters.attendance}
                    onChange={(e) => setFilters({ ...filters, attendance: e.target.value })}
                    label="Attendance"
                  >
                    <MenuItem value="all">All Attendance</MenuItem>
                    <MenuItem value="high">High (≥80%)</MenuItem>
                    <MenuItem value="medium">Medium (60-79%)</MenuItem>
                    <MenuItem value="low">Low (40-59%)</MenuItem>
                    <MenuItem value="very_low">Very Low (&lt;40%)</MenuItem>
                    <MenuItem value="none">No Events</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Review Team</InputLabel>
                  <Select
                    value={filters.reviewTeam}
                    onChange={(e) => setFilters({ ...filters, reviewTeam: e.target.value })}
                    label="Review Team"
                  >
                    <MenuItem value="all">All Teams</MenuItem>
                    <MenuItem value="unassigned">Unassigned</MenuItem>
                    {reviewTeams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Referral</InputLabel>
                  <Select
                    value={filters.referral}
                    onChange={(e) => setFilters({ ...filters, referral: e.target.value })}
                    label="Referral"
                  >
                    <MenuItem value="all">All Referrals</MenuItem>
                    <MenuItem value="yes">Has Referral</MenuItem>
                    <MenuItem value="no">No Referral</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={1}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchCandidates}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={() => setFilters({
                      status: 'all',
                      round: 'all',
                      decision: 'all',
                      attendance: 'all',
                      reviewTeam: 'all',
                      referral: 'all',
                      search: ''
                    })}
                  >
                    Clear Filters
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        )}

        {/* Resume Review: Applications for current cycle */}
        {currentTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Resume Review — Applications ({filteredCandidates.length})
            </Typography>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                ⚠️ All candidates must have a "Yes" or "No" decision. "Yes" advances to Coffee Chats, "No" receives rejection email.
              </Typography>
              <Button variant="contained" color="primary" startIcon={<SkipNextIcon />} onClick={openPushAll}>
                Process All Decisions
                {(() => {
                  const invalidCount = candidates.filter(c => 
                    c.approved === null || (c.approved !== true && c.approved !== false)
                  ).length;
                  return invalidCount > 0 ? ` (${invalidCount} issues)` : '';
                })()}
              </Button>
            </Box>
            
            <TableContainer sx={{ width: '100%' }}>
              <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '8%' }}>Rank</TableCell>
                    <TableCell sx={{ width: '12%' }}>Scores</TableCell>
                    <TableCell sx={{ width: '18%' }}>Candidate</TableCell>
                    <TableCell sx={{ width: '14%' }}>Grading Status</TableCell>
                    <TableCell sx={{ width: '14%' }}>Review Team</TableCell>
                    <TableCell sx={{ width: '10%' }}>Referral</TableCell>
                    <TableCell sx={{ width: '12%' }}>Attendance</TableCell>
                    <TableCell sx={{ width: '12%' }}>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCandidates.map((candidate, index) => {
                    // Calculate the correct rank based on current page and items per page
                    const actualRank = ((pagination.page - 1) * pagination.limit) + index + 1;
                    return (
                    <TableRow key={candidate.id} hover sx={{ cursor: 'pointer' }} onClick={async () => {
                      try {
                        setAppModalLoading(true);
                        setEvaluationsLoading(true);
                        setScoresLoading(true);
                        
                        // Load application data, interview evaluations, and document scores in parallel
                        const [appData, evaluationsData] = await Promise.all([
                          apiClient.get(`/applications/${candidate.id}`),
                          apiClient.get(`/admin/applications/${candidate.id}/interview-evaluations`)
                        ]);
                        
                        setAppModal(appData);
                        setInterviewEvaluations(evaluationsData);
                        
                        // Fetch document scores if candidateId is available
                        if (appData.candidateId) {
                          await Promise.all([
                            fetchModalResumeScores(appData.candidateId),
                            fetchModalCoverLetterScores(appData.candidateId),
                            fetchModalVideoScores(appData.candidateId)
                          ]);
                        }
                        
                        setAppModalOpen(true);
                      } catch (e) {
                        console.error('Failed to load application', e);
                        setSnackbar({ open: true, message: 'Failed to load application', severity: 'error' });
                      } finally {
                        setAppModalLoading(false);
                        setEvaluationsLoading(false);
                        setScoresLoading(false);
                      }
                    }}>
                      <TableCell>
                        <Typography 
                          variant="h6" 
                          fontWeight="bold" 
                          color="primary"
                          sx={{ 
                            textAlign: 'center',
                            minWidth: '50px'
                          }}
                        >
                          #{actualRank}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip 
                          title={
                            <Box>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                Score Breakdown:
                              </Typography>
                              <Typography variant="body2" display="block">
                                Overall: {candidate.scores.overall}
                              </Typography>
                              <Typography variant="body2" display="block">
                                Resume: {candidate.scores.resume}
                              </Typography>
                              <Typography variant="body2" display="block">
                                Cover: {candidate.scores.coverLetter}
                              </Typography>
                              <Typography variant="body2" display="block">
                                Video: {candidate.scores.video}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Typography variant="body2" fontWeight="bold" sx={{ cursor: 'help' }}>
                            {candidate.scores.overall}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {candidate.firstName} {candidate.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.major} | {candidate.graduationYear}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.email}
                          </Typography>
                          <Stack direction="row" spacing={0.5} mt={0.5}>
                            {candidate.isFirstGeneration && (
                              <Chip label="First Gen" size="small" variant="outlined" />
                            )}
                            {candidate.isTransferStudent && (
                              <Chip label="Transfer" size="small" variant="outlined" />
                            )}
                          </Stack>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <GradingStatusDisplay candidate={candidate} gradingData={gradingCompleteByCandidate[candidate.candidateId]} />
                      </TableCell>
                      <TableCell>
                        {candidate.reviewTeam ? (
                          <Tooltip 
                            title={
                              <Box>
                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                  Team Members:
                                </Typography>
                                {candidate.reviewTeam.members.map((member, index) => (
                                  <Typography key={index} variant="body2" display="block">
                                    {member.fullName}
                                  </Typography>
                                ))}
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Typography variant="body2" fontWeight="bold" color="primary" sx={{ cursor: 'help' }}>
                              {candidate.reviewTeam.name}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {candidate.hasReferral ? (
                          <Tooltip 
                            title={
                              <Box>
                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                  Referral Details:
                                </Typography>
                                <Typography variant="body2" display="block">
                                  Referrer: {candidate.referral.referrerName}
                                </Typography>
                                <Typography variant="body2" display="block">
                                  Relationship: {candidate.referral.relationship}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ cursor: 'help' }}>
                              Yes
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <AttendanceDisplay attendance={candidate.attendance} events={events} />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="caption" display="block">
                            Next Round: Coffee Chat
                          </Typography>
                          <FormControl size="small" fullWidth onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={inlineDecisions[candidate.id] || ''}
                              displayEmpty
                              onChange={(e) => handleInlineDecisionChange(candidate, e.target.value, 'resume')}
                              sx={() => {
                                const sel = inlineDecisions[candidate.id] || '';
                                const c = getDecisionHighlight(sel);
                                return {
                                  '& .MuiSelect-select': {
                                    bgcolor: c.bg,
                                    border: `1px solid`,
                                    borderColor: c.border,
                                    borderRadius: 1,
                                  }
                                };
                              }}
                              renderValue={(selected) => {
                                if (!selected) return 'Select decision';
                                const labels = {
                                  yes: 'Yes',
                                  maybe_yes: 'Maybe - Yes',
                                  maybe_no: 'Maybe - No',
                                  no: 'No'
                                };
                                return labels[selected];
                              }}
                            >
                              <MenuItem value=""><em>Select decision</em></MenuItem>
                              <MenuItem value="yes">Yes</MenuItem>
                              <MenuItem value="maybe_yes">Maybe - Yes</MenuItem>
                              <MenuItem value="maybe_no">Maybe - No</MenuItem>
                              <MenuItem value="no">No</MenuItem>
                            </Select>
                          </FormControl>
                          
                          {/* Decision outcome indicator */}
                          {candidate.approved === true && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Alert severity="success" sx={{ py: 0, px: 1, fontSize: '0.7rem' }}>
                                ✅ Will advance to Coffee Chats + acceptance email
                              </Alert>
                            </Box>
                          )}
                          
                          {candidate.approved === false && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Alert severity="error" sx={{ py: 0, px: 1, fontSize: '0.7rem' }}>
                                ❌ Will receive rejection email
                              </Alert>
                            </Box>
                          )}
                          
                          {/* Intermediate decision indicator */}
                          {candidate.approved === null && inlineDecisions[candidate.id] && 
                           (inlineDecisions[candidate.id] === 'maybe_yes' || inlineDecisions[candidate.id] === 'maybe_no') && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Alert severity="info" sx={{ py: 0, px: 1, fontSize: '0.7rem' }}>
                                ℹ️ Intermediate decision: {inlineDecisions[candidate.id] === 'maybe_yes' ? 'Maybe - Yes' : 'Maybe - No'} (needs final decision)
                              </Alert>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, filteredCandidates.length)} of {filteredCandidates.length} candidates
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Per page</InputLabel>
                  <Select
                    value={pagination.limit}
                    label="Per page"
                    onChange={(e) => handleLimitChange(e.target.value)}
                  >
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  Page {pagination.page} of {Math.ceil(filteredCandidates.length / pagination.limit)}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={pagination.page >= Math.ceil(filteredCandidates.length / pagination.limit)}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
        )}

        {/* Coffee Chats tab - Applications (Round 2) */}
        {currentTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Coffee Chats — Applications
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                ℹ️ Coffee Chat Round: Previously accepted candidates need new decisions. "Yes" advances to First Round Interviews, "No" remains in Coffee Chats for reconsideration.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={fetchCandidates}
                >
                  Refresh Data
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  size="small"
                  startIcon={<SkipNextIcon />}
                  onClick={openPushAllCoffee}
                >
                  Process All Decisions
                </Button>
              </Stack>
            </Box>
            <TableContainer>
              <Table sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '80px' }}>Rank</TableCell>
                    <TableCell sx={{ width: '250px' }}>Application</TableCell>
                    <TableCell sx={{ width: '300px' }}>Evaluation Summary</TableCell>
                    <TableCell sx={{ width: '200px', minWidth: '180px' }}>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Filter for applications that are approved (true) - these should be in coffee chat round
                    // TEMPORARY: Using status filter since approved field isn't working from backend
                    const filteredApps = adminApplications.filter(app => app.status === 'UNDER_REVIEW');
                    
                    // Sort applications by ranking score (highest first)
                    const sortedApps = filteredApps.sort((a, b) => {
                      const scoreA = calculateRankingScore(evaluationSummaries[a.id]?.evaluations || []);
                      const scoreB = calculateRankingScore(evaluationSummaries[b.id]?.evaluations || []);
                      return scoreB - scoreA; // Descending order (highest score first)
                    });
                    
                    return sortedApps.map((application, index) => {
                      
                      // Coffee chat round decisions start fresh for this round
                      const displayDecision = inlineDecisions[application.id] || '';
                      
                      return (
                        <TableRow key={application.id} hover sx={{ cursor: 'pointer' }} onClick={async () => {
                          try {
                            setAppModalLoading(true);
                            setEvaluationsLoading(true);
                            
                            // Load application data and interview evaluations in parallel
                            const [appData, evaluationsData] = await Promise.all([
                              apiClient.get(`/applications/${application.id}`),
                              apiClient.get(`/admin/applications/${application.id}/interview-evaluations`)
                            ]);
                            
                            setAppModal(appData);
                            setInterviewEvaluations(evaluationsData);
                            setAppModalOpen(true);
                          } catch (e) {
                            console.error('Failed to load application', e);
                            setSnackbar({ open: true, message: 'Failed to load application', severity: 'error' });
                          } finally {
                            setAppModalLoading(false);
                            setEvaluationsLoading(false);
                          }
                        }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" fontWeight="bold" color="primary">
                                #{index + 1}
                              </Typography>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Score: {calculateRankingScore(evaluationSummaries[application.id]?.evaluations || []).toFixed(1)}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {application.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {application.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {application.major} • {application.year} • GPA: {application.gpa}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const evaluations = evaluationSummaries[application.id]?.evaluations || [];
                              if (evaluations.length === 0) {
                                return (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No evaluations yet
                                  </Typography>
                                );
                              }
                              
                              // Count each decision type
                              const counts = evaluations.reduce((acc, evaluation) => {
                                acc[evaluation.decision] = (acc[evaluation.decision] || 0) + 1;
                                return acc;
                              }, {});
                              
                              return (
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Total: {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
                                  </Typography>
                                  {counts.YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">
                                      YES: {counts.YES}
                                    </Typography>
                                  )}
                                  {counts.MAYBE_YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">
                                      Maybe-Yes: {counts.MAYBE_YES}
                                    </Typography>
                                  )}
                                  {counts.UNSURE > 0 && (
                                    <Typography variant="caption" display="block" color="warning.main">
                                      Unsure: {counts.UNSURE}
                                    </Typography>
                                  )}
                                  {counts.MAYBE_NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">
                                      Maybe-No: {counts.MAYBE_NO}
                                    </Typography>
                                  )}
                                  {counts.NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">
                                      NO: {counts.NO}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" display="block">
                                Next Round: First Round Interview
                              </Typography>
                              <FormControl size="small" fullWidth onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={displayDecision}
                                  displayEmpty
                                  onChange={(e) => handleInlineDecisionChange(application, e.target.value, 'coffee')}
                                  sx={() => {
                                    const sel = displayDecision;
                                    const c = getDecisionHighlight(sel);
                                    return {
                                      '& .MuiSelect-select': {
                                        bgcolor: c.bg,
                                        border: `1px solid`,
                                        borderColor: c.border,
                                        borderRadius: 1,
                                      }
                                    };
                                  }}
                                  renderValue={(selected) => {
                                    if (!selected) return 'Select decision';
                                    const labels = {
                                      yes: 'Yes',
                                      maybe_yes: 'Maybe - Yes',
                                      maybe_no: 'Maybe - No',
                                      no: 'No'
                                    };
                                    return labels[selected];
                                  }}
                                >
                                  <MenuItem value=""><em>Select decision</em></MenuItem>
                                  <MenuItem value="yes">Yes</MenuItem>
                                  <MenuItem value="maybe_yes">Maybe - Yes</MenuItem>
                                  <MenuItem value="maybe_no">Maybe - No</MenuItem>
                                  <MenuItem value="no">No</MenuItem>
                                </Select>
                              </FormControl>
                              
                              {/* Decision indicators for coffee chat round */}
                              {/* Removed info text for cleaner interface */}
                              
                              {displayDecision === 'no' && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Alert severity="error" sx={{ py: 0, px: 1, fontSize: '0.7rem' }}>
                                    ❌ Already rejected - will not advance further
                                  </Alert>
                                </Box>
                              )}
                              
                              {/* Show intermediate decision indicators if they exist */}
                              {/* Note: For coffee chat round, we don't show previous round decisions */}
                              {/* Only show intermediate decisions if they were made in this round */}
                              {false && inlineDecisions[application.id] && 
                               (inlineDecisions[application.id] === 'maybe_yes' || inlineDecisions[application.id] === 'maybe_no') && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Alert severity="info" sx={{ py: 0, px: 1, fontSize: '0.7rem' }}>
                                    ℹ️ Intermediate decision: {inlineDecisions[application.id] === 'maybe_yes' ? 'Maybe - Yes' : 'Maybe - No'} (needs final decision)
                                  </Alert>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Per page</InputLabel>
                  <Select
                    value={pagination.limit}
                    label="Per page"
                    onChange={(e) => handleLimitChange(e.target.value)}
                  >
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
        )}

        {/* First Round tab - Applications (Round 3) */}
        {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              First Round — Applications
            </Typography>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                ℹ️ First Round: Coffee Chat-advanced candidates need new decisions. "Yes" advances to Final Round (stays visible here with "Yes"), "No" remains in First Round for reconsideration.
              </Typography>
              <Button variant="contained" color="primary" startIcon={<SkipNextIcon />} onClick={openPushAllFirstRound}>
                Process All Decisions
                {(() => {
                  const firstRoundApps = (adminApplications || []).filter(app => String(app.currentRound) === '3');
                  const invalidCount = firstRoundApps.filter(app => 
                    app.approved === null || (app.approved !== true && app.approved !== false)
                  ).length;
                  return invalidCount > 0 ? ` (${invalidCount} issues)` : '';
                })()}
              </Button>
            </Box>
            <TableContainer>
              <Table sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '80px' }}>Rank</TableCell>
                    <TableCell sx={{ width: '250px' }}>Application</TableCell>
                    <TableCell sx={{ width: '300px' }}>Evaluation Summary</TableCell>
                    <TableCell sx={{ width: '200px', minWidth: '180px' }}>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const filteredApps = (adminApplications || []).filter(app => String(app.currentRound) === '3');
                    const sortedApps = filteredApps.sort((a, b) => {
                      const scoreA = calculateRankingScore(evaluationSummariesFirstRound[a.id]?.evaluations || []);
                      const scoreB = calculateRankingScore(evaluationSummariesFirstRound[b.id]?.evaluations || []);
                      return scoreB - scoreA;
                    });
                    return sortedApps.map((application, index) => {
                      const displayDecision = inlineDecisions[application.id] || '';
                      const evaluations = evaluationSummariesFirstRound[application.id]?.evaluations || [];
                      return (
                        <TableRow key={application.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" fontWeight="bold" color="primary">#{index + 1}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Score: {calculateRankingScore(evaluations).toFixed(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">{application.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{application.email}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {application.major} • {application.year} • GPA: {application.gpa}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (evaluations.length === 0) {
                                return (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No evaluations yet
                                  </Typography>
                                );
                              }
                              const counts = evaluations.reduce((acc, evaluation) => {
                                acc[evaluation.decision] = (acc[evaluation.decision] || 0) + 1;
                                return acc;
                              }, {});
                              return (
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Total: {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
                                  </Typography>
                                  {counts.YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">YES: {counts.YES}</Typography>
                                  )}
                                  {counts.MAYBE_YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">Maybe-Yes: {counts.MAYBE_YES}</Typography>
                                  )}
                                  {counts.UNSURE > 0 && (
                                    <Typography variant="caption" display="block" color="warning.main">Unsure: {counts.UNSURE}</Typography>
                                  )}
                                  {counts.MAYBE_NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">Maybe-No: {counts.MAYBE_NO}</Typography>
                                  )}
                                  {counts.NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">NO: {counts.NO}</Typography>
                                  )}
                                </Box>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" display="block">Next Round: Final Decision</Typography>
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={displayDecision}
                                  displayEmpty
                                  onChange={(e) => handleInlineDecisionChange(application, e.target.value, 'round_one')}
                                  sx={() => {
                                    const sel = displayDecision;
                                    const c = getDecisionHighlight(sel);
                                    return {
                                      '& .MuiSelect-select': {
                                        bgcolor: c.bg,
                                        border: `1px solid`,
                                        borderColor: c.border,
                                        borderRadius: 1,
                                      }
                                    };
                                  }}
                                  renderValue={(selected) => {
                                    if (!selected) return 'Select decision';
                                    const labels = { yes: 'Yes', maybe_yes: 'Maybe - Yes', maybe_no: 'Maybe - No', no: 'No' };
                                    return labels[selected];
                                  }}
                                >
                                  <MenuItem value=""><em>Select decision</em></MenuItem>
                                  <MenuItem value="yes">Yes</MenuItem>
                                  <MenuItem value="maybe_yes">Maybe - Yes</MenuItem>
                                  <MenuItem value="maybe_no">Maybe - No</MenuItem>
                                  <MenuItem value="no">No</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Per page</InputLabel>
                  <Select
                    value={pagination.limit}
                    label="Per page"
                    onChange={(e) => handleLimitChange(e.target.value)}
                  >
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
        )}

        {/* Final Round tab - Applications (Round 4) */}
        {currentTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Final Round — Applications
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                ℹ️ Final Round: First Round-advanced candidates need final decisions. "Yes" advances to final stage.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={fetchCandidates}
                >
                  Refresh Data
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  size="small"
                  startIcon={<SkipNextIcon />}
                  onClick={openPushAllFinal}
                >
                  Process All Decisions
                </Button>
              </Stack>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>Evaluation Summary</TableCell>
                    <TableCell>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const filteredApps = (adminApplications || []).filter(app => String(app.currentRound) === '4');
                    const sortedApps = filteredApps.sort((a, b) => {
                      const scoreA = calculateRankingScore(evaluationSummariesFirstRound[a.id]?.evaluations || []);
                      const scoreB = calculateRankingScore(evaluationSummariesFirstRound[b.id]?.evaluations || []);
                      return scoreB - scoreA;
                    });
                    return sortedApps.map((application, index) => {
                      const displayDecision = inlineDecisions[application.id] || '';
                      const evaluations = evaluationSummariesFirstRound[application.id]?.evaluations || [];
                      return (
                        <TableRow key={application.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" fontWeight="bold" color="primary">#{index + 1}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Score: {calculateRankingScore(evaluations).toFixed(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">{application.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{application.email}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {application.major} • {application.year} • GPA: {application.gpa}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (evaluations.length === 0) {
                                return (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No evaluations yet
                                  </Typography>
                                );
                              }
                              const counts = evaluations.reduce((acc, evaluation) => {
                                acc[evaluation.decision] = (acc[evaluation.decision] || 0) + 1;
                                return acc;
                              }, {});
                              return (
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Total: {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
                                  </Typography>
                                  {counts.YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">YES: {counts.YES}</Typography>
                                  )}
                                  {counts.MAYBE_YES > 0 && (
                                    <Typography variant="caption" display="block" color="success.main">Maybe-Yes: {counts.MAYBE_YES}</Typography>
                                  )}
                                  {counts.UNSURE > 0 && (
                                    <Typography variant="caption" display="block" color="warning.main">Unsure: {counts.UNSURE}</Typography>
                                  )}
                                  {counts.MAYBE_NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">Maybe-No: {counts.MAYBE_NO}</Typography>
                                  )}
                                  {counts.NO > 0 && (
                                    <Typography variant="caption" display="block" color="error.main">NO: {counts.NO}</Typography>
                                  )}
                                </Box>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" display="block">Final Decision</Typography>
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={displayDecision}
                                  displayEmpty
                                  onChange={(e) => handleInlineDecisionChange(application, e.target.value, 'final_round')}
                                  sx={() => {
                                    const sel = displayDecision;
                                    const c = getDecisionHighlight(sel);
                                    return {
                                      '& .MuiSelect-select': {
                                        bgcolor: c.bg,
                                        border: `1px solid`,
                                        borderColor: c.border,
                                        borderRadius: 1,
                                      }
                                    };
                                  }}
                                  renderValue={(selected) => {
                                    if (!selected) return 'Select decision';
                                    const labels = { yes: 'Yes', maybe_yes: 'Maybe - Yes', maybe_no: 'Maybe - No', no: 'No' };
                                    return labels[selected];
                                  }}
                                >
                                  <MenuItem value=""><em>Select decision</em></MenuItem>
                                  <MenuItem value="yes">Yes</MenuItem>
                                  <MenuItem value="maybe_yes">Maybe - Yes</MenuItem>
                                  <MenuItem value="maybe_no">Maybe - No</MenuItem>
                                  <MenuItem value="no">No</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Per page</InputLabel>
                  <Select
                    value={pagination.limit}
                    label="Per page"
                    onChange={(e) => handleLimitChange(e.target.value)}
                  >
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
        )}

        {/* Application Detail Modal */}
        <Dialog open={appModalOpen} onClose={() => setAppModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {appModal ? `${appModal.firstName} ${appModal.lastName}` : 'Application'}
          </DialogTitle>
          <DialogContent>
            {appModalLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : appModal ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Email</Typography>
                  <Typography variant="body2" gutterBottom>{appModal.email}</Typography>
                  <Typography variant="subtitle2">Submitted</Typography>
                  <Typography variant="body2" gutterBottom>{new Date(appModal.submittedAt).toLocaleDateString()}</Typography>
                  <Typography variant="subtitle2">Documents</Typography>
                  <Stack spacing={1} mt={1}>
                    {appModal.resumeUrl && (
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setDocPreview({ open: true, src: appModal.resumeUrl, kind: 'pdf', title: `${appModal.firstName} ${appModal.lastName} – Resume` }); }}>View Resume</Button>
                    )}
                    {appModal.coverLetterUrl && (
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setDocPreview({ open: true, src: appModal.coverLetterUrl, kind: 'pdf', title: `${appModal.firstName} ${appModal.lastName} – Cover Letter` }); }}>View Cover Letter</Button>
                    )}
                    {appModal.videoUrl && (
                      <AuthenticatedFileLink href={appModal.videoUrl} filename={`${appModal.firstName}_${appModal.lastName}_Video`}>Download Video</AuthenticatedFileLink>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <StatusChip status={appModal.status} />
                  <Box mt={2}>
                    <Typography variant="subtitle2">Details</Typography>
                    <Typography variant="body2" gutterBottom>Major: {appModal.major1}</Typography>
                    <Typography variant="body2" gutterBottom>Graduation Year: {appModal.graduationYear}</Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Typography variant="body2">No application data</Typography>
            )}
            
            {/* Document Scores Section */}
            {appModal && (
              <Box mt={3}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Document Scores
                </Typography>
                
                {scoresLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {/* Resume Scores */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Resume Scores ({modalResumeScores?.length || 0})
                          </Typography>
                          {modalResumeScores && modalResumeScores.length > 0 ? (
                            <Stack spacing={1}>
                              {modalResumeScores.map((score) => (
                              <Box key={score.id} sx={{ 
                                p: 1, 
                                border: '1px solid', 
                                borderColor: 'grey.300', 
                                borderRadius: 1,
                                backgroundColor: 'grey.50'
                              }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {score.evaluator?.fullName || 'Unknown Evaluator'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(score.createdAt).toLocaleDateString()}
                                </Typography>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                  {score.overallScore}/13
                                </Typography>
                                {score.notes && (
                                  <Typography variant="caption" sx={{ 
                                    display: 'block', 
                                    mt: 0.5,
                                    fontStyle: 'italic'
                                  }}>
                                    {score.notes}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No resume scores yet.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                    {/* Cover Letter Scores */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Cover Letter Scores ({modalCoverLetterScores?.length || 0})
                          </Typography>
                          {modalCoverLetterScores && modalCoverLetterScores.length > 0 ? (
                            <Stack spacing={1}>
                              {modalCoverLetterScores.map((score) => (
                              <Box key={score.id} sx={{ 
                                p: 1, 
                                border: '1px solid', 
                                borderColor: 'grey.300', 
                                borderRadius: 1,
                                backgroundColor: 'grey.50'
                              }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {score.evaluator?.fullName || 'Unknown Evaluator'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(score.createdAt).toLocaleDateString()}
                                </Typography>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                  {score.overallScore}/3
                                </Typography>
                                {score.notes && (
                                  <Typography variant="caption" sx={{ 
                                    display: 'block', 
                                    mt: 0.5,
                                    fontStyle: 'italic'
                                  }}>
                                    {score.notes}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No cover letter scores yet.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                    {/* Video Scores */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Video Scores ({modalVideoScores?.length || 0})
                          </Typography>
                          {modalVideoScores && modalVideoScores.length > 0 ? (
                            <Stack spacing={1}>
                              {modalVideoScores.map((score) => (
                              <Box key={score.id} sx={{ 
                                p: 1, 
                                border: '1px solid', 
                                borderColor: 'grey.300', 
                                borderRadius: 1,
                                backgroundColor: 'grey.50'
                              }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {score.evaluator?.fullName || 'Unknown Evaluator'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(score.createdAt).toLocaleDateString()}
                                </Typography>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                  {score.overallScore}/2
                                </Typography>
                                {score.notes && (
                                  <Typography variant="caption" sx={{ 
                                    display: 'block', 
                                    mt: 0.5,
                                    fontStyle: 'italic'
                                  }}>
                                    {score.notes}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No video scores yet.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  </Grid>
                )}
              </Box>
            )}
            
            {/* Interview Evaluations Section */}
            {appModal && (
              <Box mt={3}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Interview Evaluations
                </Typography>
                
                {evaluationsLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                    <CircularProgress />
                  </Box>
                ) : interviewEvaluations.length > 0 ? (
                  <Stack spacing={2}>
                    {interviewEvaluations.map((evaluation) => (
                      <Card key={evaluation.id} variant="outlined">
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {evaluation.interview.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {evaluation.interview.interviewType.replace(/_/g, ' ')} • 
                                Evaluated by {evaluation.evaluator.fullName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(evaluation.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                            {evaluation.decision && (
                              <Chip 
                                label={evaluation.decision.replace(/_/g, ' ')} 
                                color={
                                  evaluation.decision === 'YES' ? 'success' :
                                  evaluation.decision === 'MAYBE_YES' ? 'success' :
                                  evaluation.decision === 'UNSURE' ? 'warning' :
                                  evaluation.decision === 'MAYBE_NO' ? 'error' :
                                  'error'
                                }
                                variant="outlined"
                              />
                            )}
                          </Box>
                          
                          {/* Notes */}
                          {evaluation.notes && (
                            <Box mb={2}>
                              <Typography variant="subtitle2" gutterBottom>Notes:</Typography>
                              <Typography variant="body2" sx={{ 
                                backgroundColor: 'grey.50', 
                                p: 1, 
                                borderRadius: 1,
                                whiteSpace: 'pre-wrap'
                              }}>
                                {evaluation.notes}
                              </Typography>
                            </Box>
                          )}
                          
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No interview evaluations found for this application.
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAppModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Document Preview Modal */}
        {docPreview.open && (
          <DocumentPreviewModal
            src={docPreview.src}
            kind={docPreview.kind}
            title={docPreview.title}
            onClose={() => setDocPreview({ open: false, src: '', kind: 'pdf', title: '' })}
          />
        )}

        {/* Push All Decisions Confirmation Dialog */}
        <Dialog open={pushAllDialogOpen} onClose={() => {
          setPushAllDialogOpen(false);
          setPushAllPreview({ totalApproved: 0, invalidDecisions: 0, invalidDecisionCandidates: [] });
        }} maxWidth="md" fullWidth>
          <DialogTitle>Process All Decisions</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  📧 This will send emails and advance candidates to the next round
                </Typography>
                <Typography variant="body2">
                  • <strong>Yes</strong> decisions: Acceptance emails + advance to Coffee Chats round<br/>
                  • <strong>No</strong> decisions: Rejection emails + mark as rejected<br/>
                  • This action cannot be easily undone
                </Typography>
              </Alert>
              
              {/* Warning for invalid decisions */}
              {pushAllPreview.invalidDecisions > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    ⚠️ Warning: {pushAllPreview.invalidDecisions} application(s) have no decision or decisions other than "Yes" or "No"
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    All applications must have a clear "Yes" or "No" decision before proceeding. 
                    "Yes" decisions will advance to the next round with acceptance emails, "No" decisions will receive rejection emails.
                  </Typography>
                  
                  {/* List of candidates with invalid decisions */}
                  <Stack spacing={1}>
                    {pushAllPreview.invalidDecisionCandidates?.map((candidate) => {
                      const currentDecision = candidate.approved;
                      let decisionStatus = 'No decision';
                      let decisionType = 'none';
                      
                      if (currentDecision === true) {
                        decisionStatus = 'Yes';
                        decisionType = 'yes';
                      } else if (currentDecision === false) {
                        decisionStatus = 'No';
                        decisionType = 'no';
                      } else if (currentDecision === null) {
                        // Check if there's a comment indicating an intermediate decision
                        const latestComment = candidate.comments?.[0]?.content || '';
                        if (latestComment.includes('Maybe - Yes')) {
                          decisionStatus = 'Maybe - Yes (needs final decision)';
                          decisionType = 'intermediate';
                        } else if (latestComment.includes('Maybe - No')) {
                          decisionStatus = 'Maybe - No (needs final decision)';
                          decisionType = 'intermediate';
                        } else {
                          decisionStatus = 'No decision';
                          decisionType = 'none';
                        }
                      }
                      
                      return (
                        <Box key={candidate.id} sx={{ p: 1, border: '1px solid', borderColor: 'error.main', borderRadius: 1, bgcolor: 'error.light' }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            {candidate.firstName} {candidate.lastName} - {candidate.email}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                            Current decision: <strong>{decisionStatus}</strong>
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => fixInvalidDecision(candidate.id, 'yes')}
                              sx={{ textTransform: 'none' }}
                            >
                              Set to Yes
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => fixInvalidDecision(candidate.id, 'no')}
                              sx={{ textTransform: 'none' }}
                            >
                              Set to No
                            </Button>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Alert>
              )}
              
              <Typography variant="body2">
                {currentTab === 1 ? (
                  // Coffee Chats: count only phase 2 applications with yes/no decisions
                  (() => {
                    const coffeeApps = (adminApplications || []).filter(app => app.status === 'UNDER_REVIEW');
                    const toProcess = coffeeApps.filter(app => {
                      const localDecision = inlineDecisions[app.id];
                      const dbDecision = app.approved === true ? 'yes' : app.approved === false ? 'no' : '';
                      const decision = localDecision || dbDecision;
                      return decision === 'yes' || decision === 'no';
                    });
                    return (<span>Applications to process: <strong>{toProcess.length}</strong></span>);
                  })()
                ) : (
                  <span>Candidates to process: <strong>{candidates.filter(c => inlineDecisions[c.id] === 'yes' || inlineDecisions[c.id] === 'no').length}</strong></span>
                )}
              </Typography>
              <TextField
                label="Type PROCESS to confirm"
                value={pushAllConfirmText}
                onChange={(e) => setPushAllConfirmText(e.target.value)}
                placeholder="PROCESS"
                fullWidth
              />
              <FormControlLabel
                control={<Checkbox checked={pushAllAcknowledge} onChange={(e) => setPushAllAcknowledge(e.target.checked)} />}
                label="I understand this will send emails and advance candidates to the next round"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPushAllDialogOpen(false)} disabled={pushAllLoading}>Cancel</Button>
            <Button 
              onClick={confirmPushAll}
              variant="contained"
              color="error"
              disabled={pushAllLoading || pushAllConfirmText !== 'PROCESS' || !pushAllAcknowledge || pushAllPreview.invalidDecisions > 0}
            >
              {pushAllLoading ? 'Processing…' : 'Process All Decisions'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Decision Dialog */}
        <Dialog open={decisionDialogOpen} onClose={() => setDecisionDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Make Decision - {selectedCandidate && `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Round: {currentDecision.round === 1 ? 'Resume Review' : 
                                 currentDecision.round === 2 ? 'Coffee Chats' : 
                                 currentDecision.round === 3 ? 'First Round Interviews' : 
                                 currentDecision.round === 4 ? 'Final Decision' : 
                                 `Round ${currentDecision.round}`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Decision</InputLabel>
                  <Select
                    value={currentDecision.decision}
                    onChange={(e) => setCurrentDecision({ ...currentDecision, decision: e.target.value })}
                    label="Decision"
                  >
                    {decisionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {option.icon}
                          <Typography>{option.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes"
                  value={currentDecision.notes}
                  onChange={(e) => setCurrentDecision({ ...currentDecision, notes: e.target.value })}
                  placeholder="Add any notes about this decision..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDecisionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDecisionSubmit}
              variant="contained"
              disabled={!currentDecision.decision}
            >
              Submit Decision
            </Button>
          </DialogActions>
        </Dialog>

        {/* Final Decision Dialog */}
        <Dialog open={finalDecisionDialogOpen} onClose={() => setFinalDecisionDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Final Decision - {selectedCandidate && `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Final Decision</InputLabel>
                  <Select
                    value={finalDecision.decision}
                    onChange={(e) => setFinalDecision({ ...finalDecision, decision: e.target.value })}
                    label="Final Decision"
                  >
                    <MenuItem value="ACCEPT">Accept</MenuItem>
                    <MenuItem value="REJECT">Reject</MenuItem>
                    <MenuItem value="WAITLIST">Waitlist</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Feedback"
                  value={finalDecision.feedback}
                  onChange={(e) => setFinalDecision({ ...finalDecision, feedback: e.target.value })}
                  placeholder="Provide feedback for the candidate..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFinalDecisionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleFinalDecisionSubmit}
              variant="contained"
              disabled={!finalDecision.decision}
            >
              Submit Final Decision
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
    </AccessControl>
  );
}
