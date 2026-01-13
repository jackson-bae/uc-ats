import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ApplicationDetail from './ApplicationDetail';

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

  const getAttendanceStatus = (event) => {
    const eventName = event.eventName || event.name || event.id;
    let isAttended = false;
    
    if (attendance && eventName) {
      if (attendance[eventName] !== undefined) {
        isAttended = Boolean(attendance[eventName]);
      } else {
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

  const attendedEventsList = events.filter(event => getAttendanceStatus(event));

  // Check if candidate attended GTKUC (Get to Know UC meeting)
  const hasGTKUC = attendance && attendance['GTKUC'];

  // Create a combined list including GTKUC if attended
  const allAttendedItems = [
    ...attendedEventsList,
    ...(hasGTKUC ? [{ id: 'gtkuc', eventName: 'GTKUC' }] : [])
  ];
  const totalAttendedCount = allAttendedItems.length;

  if (totalAttendedCount === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60px">
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No events attended
        </Typography>
      </Box>
    );
  }

  const maxVisibleEvents = 2;
  const visibleEvents = allAttendedItems.slice(0, maxVisibleEvents);
  const hiddenCount = totalAttendedCount - maxVisibleEvents;

  const tooltipContent = allAttendedItems.map(e => e.eventName || e.name || e.id).join('\n');

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Stack spacing={0.25} sx={{ maxWidth: '100%', overflow: 'hidden' }}>
        <Chip
          label={`${totalAttendedCount} event${totalAttendedCount !== 1 ? 's' : ''}`}
          color="success"
          size="small"
          sx={{ fontSize: '0.7rem', height: 20 }}
        />

        {visibleEvents.map((event) => {
          const eventName = event.eventName || event.name || event.id;

          return (
            <Box key={event.id || event.name} display="flex" alignItems="center" gap={0.25}>
              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
              <Typography
                variant="caption"
                color="success.main"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 500,
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

        {hiddenCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
            +{hiddenCount} more
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
};

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
          Missing: {missingItems.join(', ') || 'None'}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default function Staging() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [candidates, setCandidates] = useState([]);
  const [events, setEvents] = useState([]);
  const [reviewTeams, setReviewTeams] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);

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
  
  const [testForNote, setTestForNote] = useState('');
  const [isEditingTestFor, setIsEditingTestFor] = useState(false);
  const [savingTestFor, setSavingTestFor] = useState(false);
  
  const [coffeeChatInterviewFilter, setCoffeeChatInterviewFilter] = useState('all');
  const [coffeeChatInterviews, setCoffeeChatInterviews] = useState([]);
  
  const [coffeeChatDecisionFilter, setCoffeeChatDecisionFilter] = useState('all');
  
  const [firstRoundInterviewFilter, setFirstRoundInterviewFilter] = useState('all');
  const [firstRoundInterviews, setFirstRoundInterviews] = useState([]);
  
  const [firstRoundDecisionFilter, setFirstRoundDecisionFilter] = useState('all');
  
  const [modalResumeScores, setModalResumeScores] = useState([]);
  const [modalCoverLetterScores, setModalCoverLetterScores] = useState([]);
  const [modalVideoScores, setModalVideoScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [docPreview, setDocPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });
  
  const [finalRoundNotesModalOpen, setFinalRoundNotesModalOpen] = useState(false);
  const [finalRoundNotesLoading, setFinalRoundNotesLoading] = useState(false);
  const [finalRoundInterviewNotes, setFinalRoundInterviewNotes] = useState([]);
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState(null);
  
  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [editingScoreType, setEditingScoreType] = useState(null);
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
      
      if (editingScoreType === 'resume') {
        updateData.notes = editScoreForm.notes || undefined;
      } else {
        updateData.notesOne = editScoreForm.notes || undefined;
      }
      
      await apiClient.patch(endpoint, updateData);
      
      if (appModal?.candidateId) {
        await Promise.all([
          fetchModalResumeScores(appModal.candidateId),
          fetchModalCoverLetterScores(appModal.candidateId),
          fetchModalVideoScores(appModal.candidateId)
        ]);
      }
      
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
      
      const notes = await apiClient.get(`/admin/applications/${applicationId}/final-round-interview-evaluations`);
      
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

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters]);

  const [currentDecision, setCurrentDecision] = useState({
    candidateId: null,
    decision: '',
    notes: '',
    round: null
  });

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
        
        const candidatesData = candidatesResponse.candidates || candidatesResponse;
        const adminApplicationsData = adminApplicationsResponse.applications || adminApplicationsResponse;
        
        setCandidates(candidatesData);
        setCurrentCycle(activeCycle);
        setAdminApplications(adminApplicationsData || []);
        setEvents(eventsData || []);
        setReviewTeams(reviewTeamsData || []);
        
        calculateDemographics(candidatesData, false);
        
        setPagination(prev => ({
          ...prev,
          total: candidatesData.length,
          totalPages: Math.ceil(candidatesData.length / prev.limit),
          hasNextPage: prev.page < Math.ceil(candidatesData.length / prev.limit),
          hasPrevPage: prev.page > 1
        }));

        if (existingDecisionsData && existingDecisionsData.decisions) {
          setInlineDecisions(existingDecisionsData.decisions);
        }

        const gradingMap = {};
        (adminApplicationsData || []).forEach(app => {
          const hasResume = Boolean(app.resumeUrl);
          const hasCoverLetter = Boolean(app.coverLetterUrl);
          const hasVideo = Boolean(app.videoUrl);
          
          const hasResumeScore = Boolean(app.hasResumeScore);
          const hasCoverLetterScore = Boolean(app.hasCoverLetterScore);
          const hasVideoScore = Boolean(app.hasVideoScore);
          
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

  useEffect(() => {
    if (currentTab === 1 && adminApplications.length > 0) {
      const coffeeChatApps = adminApplications.filter(app => String(app.currentRound) === '2');
      if (coffeeChatApps.length > 0) {
        fetchCoffeeChatEvaluations(coffeeChatApps);
      }
    }
  }, [currentTab, adminApplications]);

  useEffect(() => {
    if (currentTab === 1) {
      fetchCoffeeChatInterviews();
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 2) {
      fetchFirstRoundInterviews();
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 0) {
      if (candidates && candidates.length > 0) {
        calculateDemographics(candidates, false);
      }
    } else if (currentTab === 1) {
      if (adminApplications && adminApplications.length > 0) {
        const coffeeChatApps = adminApplications.filter(app => String(app.currentRound) === '2');
        calculateDemographics(coffeeChatApps, true);
      }
    } else if (currentTab === 2) {
      if (adminApplications && adminApplications.length > 0) {
        const firstRoundApps = adminApplications.filter(app => String(app.currentRound) === '3');
        calculateDemographics(firstRoundApps, true);
      }
    } else if (currentTab === 3) {
      if (adminApplications && adminApplications.length > 0) {
        const finalRoundApps = adminApplications.filter(app => String(app.currentRound) === '4' && app.candidate);
        calculateDemographics(finalRoundApps, true);
      }
    }
  }, [currentTab, candidates, adminApplications, inlineDecisions]);

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
      
      const candidatesData = candidatesResponse.candidates || candidatesResponse;
      const adminApplicationsData = adminApplicationsResponse.applications || adminApplicationsResponse;
      
      setCandidates(candidatesData);
      setAdminApplications(adminApplicationsData || []);
      setEvents(eventsData || []);
      setReviewTeams(reviewTeamsData || []);
      
      calculateDemographics(candidatesData, false);
      
      setPagination(prev => ({
        ...prev,
        total: candidatesData.length,
        totalPages: Math.ceil(candidatesData.length / prev.limit),
        hasNextPage: prev.page < Math.ceil(candidatesData.length / prev.limit),
        hasPrevPage: prev.page > 1
      }));
      
      if (existingDecisionsData && existingDecisionsData.decisions) {
        setInlineDecisions(existingDecisionsData.decisions);
      }
      
      const gradingMap = {};
      (adminApplicationsData || []).forEach(app => {
        const hasResume = Boolean(app.resumeUrl);
        const hasCoverLetter = Boolean(app.coverLetterUrl);
        const hasVideo = Boolean(app.videoUrl);
        
        const hasResumeScore = Boolean(app.hasResumeScore);
        const hasCoverLetterScore = Boolean(app.hasCoverLetterScore);
        const hasVideoScore = Boolean(app.hasVideoScore);
        
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

  const calculateRankingScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    
    const decisionScores = {
      'YES': 4,
      'MAYBE_YES': 3,
      'UNSURE': 2,
      'MAYBE_NO': 1,
      'NO': 0
    };
    
    const evaluationsWithDecisions = evaluations.filter(evaluation => 
      evaluation.decision && 
      evaluation.decision.trim() !== '' && 
      decisionScores.hasOwnProperty(evaluation.decision)
    );
    
    if (evaluationsWithDecisions.length === 0) return 0;
    
    const totalScore = evaluationsWithDecisions.reduce((sum, evaluation) => {
      return sum + decisionScores[evaluation.decision];
    }, 0);
    
    return totalScore / evaluationsWithDecisions.length;
  };

  const calculateFirstRoundRankingScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    
    const evaluationsWithScores = evaluations.filter(evaluation => 
      evaluation.behavioralTotal !== null && 
      evaluation.behavioralTotal !== undefined &&
      evaluation.marketSizingTotal !== null && 
      evaluation.marketSizingTotal !== undefined
    );
    
    if (evaluationsWithScores.length === 0) {
      return calculateRankingScore(evaluations);
    }
    
    const totalBehavioral = evaluationsWithScores.reduce((sum, evaluation) => {
      return sum + (evaluation.behavioralTotal || 0);
    }, 0);
    
    const totalMarketSizing = evaluationsWithScores.reduce((sum, evaluation) => {
      return sum + (evaluation.marketSizingTotal || 0);
    }, 0);
    
    const avgBehavioral = totalBehavioral / evaluationsWithScores.length;
    const avgMarketSizing = totalMarketSizing / evaluationsWithScores.length;
    
    const combinedScore = ((avgBehavioral + avgMarketSizing) / 30) * 10;
    
    return combinedScore;
  };

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

  const getApplicationsForInterview = (interviewId) => {
    const interview = coffeeChatInterviews.find(i => i.id === interviewId);
    if (!interview) return [];

    let config = {};
    try {
      config = typeof interview.description === 'string' 
        ? JSON.parse(interview.description) 
        : interview.description || {};
    } catch (e) {
      console.warn('Failed to parse interview description:', e);
      return [];
    }

    const applicationIds = new Set();
    config.applicationGroups?.forEach(group => {
      group.applicationIds?.forEach(appId => applicationIds.add(appId));
    });

    return adminApplications.filter(app => applicationIds.has(app.id));
  };

  const getApplicationsForFirstRoundInterview = (interviewId) => {
    const interview = firstRoundInterviews.find(i => i.id === interviewId);
    if (!interview) return [];

    let config = {};
    try {
      config = typeof interview.description === 'string' 
        ? JSON.parse(interview.description) 
        : interview.description || {};
    } catch (e) {
      console.warn('Failed to parse interview description:', e);
      return [];
    }

    const applicationIds = new Set();
    config.applicationGroups?.forEach(group => {
      group.applicationIds?.forEach(appId => applicationIds.add(appId));
    });

    return adminApplications.filter(app => applicationIds.has(app.id));
  };

  const fetchCoffeeChatEvaluations = async (applications) => {
    try {
      const applicationIds = applications.map(app => app.id);
      const summaries = await stagingAPI.fetchEvaluationSummaries(applicationIds);

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

  const fetchFirstRoundEvaluations = async (applications) => {
    try {
      const applicationIds = applications.map(app => app.id);
      const summaries = await stagingAPI.fetchEvaluationSummaries(applicationIds);

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
    const graduationYearBreakdown = {
      '2026': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2027': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2028': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      '2029': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };
    
    const genderBreakdown = {
      'Male': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'Female': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'Other/Prefer not to say': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };
    
    const referralBreakdown = {
      'Yes': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
      'No': { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
    };

    data.forEach((item) => {
      const candidate = isApplicationData ? item.candidate : item;
      
      if (!isApplicationData && !candidate) return;
      
      let year, gender, hasReferral;
      if (isApplicationData) {
        year = item.year || item.graduationYear;
        gender = item.gender;
        hasReferral = item.hasReferral;
      } else {
        year = candidate.graduationYear;
        gender = candidate.gender;
        hasReferral = candidate.hasReferral;
      }
      
      if (!year || !['2026', '2027', '2028', '2029'].includes(year)) {
        year = 'Other';
      }
      if (!graduationYearBreakdown[year]) {
        graduationYearBreakdown[year] = { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 };
      }
      graduationYearBreakdown[year].total++;
      
      let decision = '';
      if (isApplicationData) {
        decision = inlineDecisions[item.id] || (item.approved === true ? 'yes' : item.approved === false ? 'no' : '');
      } else {
        decision = inlineDecisions[candidate.id] || '';
      }
      
      if (decision === 'yes') graduationYearBreakdown[year].yes++;
      else if (decision === 'no') graduationYearBreakdown[year].no++;
      else if (decision === 'maybe_yes' || decision === 'maybe_no') graduationYearBreakdown[year].maybe++;
      else graduationYearBreakdown[year].pending++;
      
      if (!gender) gender = 'Other/Prefer not to say';
      else if (gender.toLowerCase().includes('male')) gender = 'Male';
      else if (gender.toLowerCase().includes('female')) gender = 'Female';
      else gender = 'Other/Prefer not to say';
      
      genderBreakdown[gender].total++;
      if (decision === 'yes') genderBreakdown[gender].yes++;
      else if (decision === 'no') genderBreakdown[gender].no++;
      else if (decision === 'maybe_yes' || decision === 'maybe_no') genderBreakdown[gender].maybe++;
      else genderBreakdown[gender].pending++;

      const referralKey = hasReferral ? 'Yes' : 'No';
      referralBreakdown[referralKey].total++;
      if (decision === 'yes') referralBreakdown[referralKey].yes++;
      else if (decision === 'no') referralBreakdown[referralKey].no++;
      else if (decision === 'maybe_yes' || decision === 'maybe_no') referralBreakdown[referralKey].maybe++;
      else referralBreakdown[referralKey].pending++;
    });
    
    setDemographics({ graduationYear: graduationYearBreakdown, gender: genderBreakdown, referral: referralBreakdown });
  };

  const handleInlineDecisionChange = async (item, value, phase = 'resume') => {
    try {
      await stagingAPI.saveDecision(item.id, value, phase);
      setInlineDecisions(prev => ({ ...prev, [item.id]: value }));
      setSnackbar({ open: true, message: 'Decision saved successfully', severity: 'success' });
      await fetchCandidates();
    } catch (error) {
      console.error('Error saving inline decision:', error);
      setSnackbar({ open: true, message: 'Failed to save decision', severity: 'error' });
      setInlineDecisions(prev => ({ ...prev, [item.id]: prev[item.id] || '' }));
    }
  };

  const handleExportDecisions = () => {
    const dataSource = adminApplications || [];
    
    if (dataSource.length === 0) {
      setSnackbar({ open: true, message: 'No candidate data available to export', severity: 'warning' });
      return;
    }
    
    let roundFilteredData = dataSource;
    let roundName = 'All Rounds';
    
    if (currentTab === 0) {
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '1');
      roundName = 'Resume Review';
    } else if (currentTab === 1) {
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '2');
      roundName = 'Coffee Chat';
    } else if (currentTab === 2) {
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '3');
      roundName = 'First Round';
    } else if (currentTab === 3) {
      roundFilteredData = dataSource.filter(app => String(app.currentRound) === '4');
      roundName = 'Final Round';
    }
    
    if (roundFilteredData.length === 0) {
      setSnackbar({ open: true, message: `No candidates found in ${roundName} round`, severity: 'warning' });
      return;
    }
    
    const exportDialog = window.confirm(
      `Export ${roundName} Decisions:\n\nOK = Only candidates with Yes/No decisions\nCancel = All candidates`
    );
    
    let candidatesToExport = roundFilteredData;
    if (exportDialog) {
      candidatesToExport = roundFilteredData.filter(app => app.approved === true || app.approved === false);
    }
    
    const csvHeaders = ['Name', 'Email', 'Student ID', 'Decision', 'Grad Year', 'Gender', 'Referral'];
    const csvRows = candidatesToExport.map(app => {
      const name = `${app.firstName || ''} ${app.lastName || ''}`.trim();
      const email = app.email || '';
      const studentId = app.studentId || '';
      const decision = app.approved === true ? 'Yes' : app.approved === false ? 'No' : 'Pending';
      const gradYear = app.graduationYear || app.year || '';
      const gender = app.gender || '';
      const referral = app.hasReferral ? 'Yes' : 'No';
      
      return [name, email, studentId, decision, gradYear, gender, referral];
    });
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${roundName.replace(' ', '_')}_decisions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({ open: true, message: `Exported ${candidatesToExport.length} candidates`, severity: 'success' });
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesStatus = filters.status === 'all' || candidate.status === filters.status;
    const matchesRound = filters.round === 'all' || parseInt(candidate.currentRound) === parseInt(filters.round);
    const matchesDecision = filters.decision === 'all' || 
      (filters.decision === 'pending' && !candidate.decisions[`round${candidate.currentRound}`]) ||
      (filters.decision !== 'pending' && candidate.decisions[`round${candidate.currentRound}`] === filters.decision);
    
    let matchesAttendance = true;
    if (filters.attendance !== 'all' && events.length > 0) {
      const totalEvents = events.length;
      const attendedEvents = events.filter(event => {
        const eventName = event.eventName || event.name || event.id;
        if (!candidate.attendance || !eventName) return false;
        
        if (candidate.attendance[eventName] !== undefined) {
          return Boolean(candidate.attendance[eventName]);
        }
        
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
    
    let matchesReviewTeam = true;
    if (filters.reviewTeam !== 'all') {
      if (filters.reviewTeam === 'unassigned') {
        matchesReviewTeam = !candidate.reviewTeam;
      } else {
        matchesReviewTeam = candidate.reviewTeam && candidate.reviewTeam.id === filters.reviewTeam;
      }
    }
    
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
  }).sort((a, b) => b.scores.overall - a.scores.overall);

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
        <Box className="staging-page" sx={{ p: 3 }}>
          <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#042742' }}>
                Candidate Staging
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Review candidates, track attendance, evaluate scores, and make decisions
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportDecisions}
              >
                Export Decisions
              </Button>
              <Chip 
                label={currentCycle ? `Current Cycle: ${currentCycle.name}` : 'No Active Cycle'}
                color={currentCycle ? 'primary' : 'default'}
              />
            </Box>
          </Box>

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

          {/* Improved Demographics Section */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📊 Demographics Overview ({currentTab === 0 ? 'Resume Review' : currentTab === 1 ? 'Coffee Chat' : currentTab === 2 ? 'First Round' : 'Final Round'} Round)
              </Typography>
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Graduation Year
                  </Typography>
                  <Stack spacing={1.5}>
                    {Object.entries(demographics.graduationYear).map(([year, stats]) => {
                      const totalApps = Object.values(demographics.graduationYear).reduce((sum, s) => sum + s.total, 0);
                      const pct = totalApps > 0 ? ((stats.total / totalApps) * 100).toFixed(1) : 0;
                      const yesPct = stats.total > 0 ? ((stats.yes / stats.total) * 100).toFixed(1) : 0;
                      const noPct = stats.total > 0 ? ((stats.no / stats.total) * 100).toFixed(1) : 0;
                      return (
                        <Box key={year} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="body1" fontWeight="bold">
                            Class of {year} ({stats.total} • {pct}%)
                          </Typography>
                          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                            <Chip label={`Yes: ${stats.yes} (${yesPct}%)`} color="success" size="small" />
                            <Chip label={`No: ${stats.no} (${noPct}%)`} color="error" size="small" />
                            <Chip label={`Maybe: ${stats.maybe}`} color="warning" size="small" />
                            <Chip label={`Pending: ${stats.pending}`} size="small" />
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Gender
                  </Typography>
                  <Stack spacing={1.5}>
                    {Object.entries(demographics.gender).map(([gender, stats]) => {
                      const totalApps = Object.values(demographics.gender).reduce((sum, s) => sum + s.total, 0);
                      const pct = totalApps > 0 ? ((stats.total / totalApps) * 100).toFixed(1) : 0;
                      const yesPct = stats.total > 0 ? ((stats.yes / stats.total) * 100).toFixed(1) : 0;
                      const noPct = stats.total > 0 ? ((stats.no / stats.total) * 100).toFixed(1) : 0;
                      return (
                        <Box key={gender} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="body1" fontWeight="bold">
                            {gender} ({stats.total} • {pct}%)
                          </Typography>
                          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                            <Chip label={`Yes: ${stats.yes} (${yesPct}%)`} color="success" size="small" />
                            <Chip label={`No: ${stats.no} (${noPct}%)`} color="error" size="small" />
                            <Chip label={`Maybe: ${stats.maybe}`} color="warning" size="small" />
                            <Chip label={`Pending: ${stats.pending}`} size="small" />
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Referral Status
                  </Typography>
                  <Stack spacing={1.5}>
                    {Object.entries(demographics.referral).map(([ref, stats]) => {
                      const totalApps = Object.values(demographics.referral).reduce((sum, s) => sum + s.total, 0);
                      const pct = totalApps > 0 ? ((stats.total / totalApps) * 100).toFixed(1) : 0;
                      const yesPct = stats.total > 0 ? ((stats.yes / stats.total) * 100).toFixed(1) : 0;
                      const noPct = stats.total > 0 ? ((stats.no / stats.total) * 100).toFixed(1) : 0;
                      return (
                        <Box key={ref} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="body1" fontWeight="bold">
                            Referred: {ref} ({stats.total} • {pct}%)
                          </Typography>
                          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                            <Chip label={`Yes: ${stats.yes} (${yesPct}%)`} color="success" size="small" />
                            <Chip label={`No: ${stats.no} (${noPct}%)`} color="error" size="small" />
                            <Chip label={`Maybe: ${stats.maybe}`} color="warning" size="small" />
                            <Chip label={`Pending: ${stats.pending}`} size="small" />
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table stickyHeader sx={{ tableLayout: 'fixed', minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 220 }}>Candidate</TableCell>
                      <TableCell sx={{ width: 100 }}>Score</TableCell>
                      <TableCell sx={{ width: 150 }}>Grading</TableCell>
                      <TableCell sx={{ width: 180 }}>Attendance</TableCell>
                      <TableCell sx={{ width: 140 }}>Decision</TableCell>
                      <TableCell sx={{ width: 110 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCandidates.map((candidate) => {
                      const gradingData = gradingCompleteByCandidate[candidate.id];
                      const displayDecision = inlineDecisions[candidate.id] || '';
                      
                      return (
                        <TableRow key={candidate.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1} sx={{ overflow: 'hidden' }}>
                              <AuthenticatedImage
                                src={candidate.headshotUrl}
                                alt={`${candidate.firstName} ${candidate.lastName}`}
                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                fallback={<PersonIcon />}
                              />
                              <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {candidate.firstName} {candidate.lastName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block'
                                  }}
                                >
                                  {candidate.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <ScoreDisplay score={candidate.scores.overall || 0} />
                          </TableCell>
                          <TableCell>
                            <GradingStatusDisplay candidate={candidate} gradingData={gradingData} />
                          </TableCell>
                          <TableCell>
                            <AttendanceDisplay attendance={candidate.attendance} events={events} />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={displayDecision}
                                displayEmpty
                                onChange={(e) => handleInlineDecisionChange(candidate, e.target.value)}
                                sx={{
                                  '& .MuiSelect-select': {
                                    bgcolor: getDecisionHighlight(displayDecision).bg,
                                    border: `1px solid ${getDecisionHighlight(displayDecision).border}`,
                                    borderRadius: 1,
                                  }
                                }}
                                renderValue={(selected) => {
                                  if (!selected) return <em>Pending</em>;
                                  const labels = { yes: 'Yes', maybe_yes: 'Maybe Yes', maybe_no: 'Maybe No', no: 'No' };
                                  return labels[selected] || selected;
                                }}
                              >
                                <MenuItem value=""><em>Pending</em></MenuItem>
                                <MenuItem value="yes">Yes</MenuItem>
                                <MenuItem value="maybe_yes">Maybe Yes</MenuItem>
                                <MenuItem value="maybe_no">Maybe No</MenuItem>
                                <MenuItem value="no">No</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => {
                                setAppModal(candidate);
                                setAppModalOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                <Typography variant="body2">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <FormControl size="small">
                    <InputLabel>Per page</InputLabel>
                    <Select value={pagination.limit} label="Per page" onChange={(e) => handleLimitChange(e.target.value)}>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                  </FormControl>
                  <Button disabled={!pagination.hasPrevPage} onClick={() => handlePageChange(pagination.page - 1)}>Previous</Button>
                  <Typography>Page {pagination.page} of {pagination.totalPages}</Typography>
                  <Button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(pagination.page + 1)}>Next</Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Candidate Details Modal - Popup with Embedded Application Detail */}
          <Dialog
            open={appModalOpen}
            onClose={() => {
              setAppModalOpen(false);
              setAppModal(null);
            }}
            maxWidth="xl"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                bgcolor: '#f5f5f5',
                height: '90vh',
                maxHeight: '90vh'
              }
            }}
          >
            <DialogTitle sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: 'white',
              borderBottom: '1px solid #e0e0e0',
              py: 1
            }}>
              <Box display="flex" alignItems="center" gap={2}>
                {appModal && (
                  <Typography variant="h6">
                    {appModal.firstName} {appModal.lastName} - Application Details
                  </Typography>
                )}
              </Box>
              <IconButton onClick={() => { setAppModalOpen(false); setAppModal(null); }}>
                <ClearIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, overflow: 'auto' }}>
              {appModal && (
                <ApplicationDetail applicationId={appModal.id} embedded={true} />
              )}
            </DialogContent>
          </Dialog>

          <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>
    </AccessControl>
  );
}
