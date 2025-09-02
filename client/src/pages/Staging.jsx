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

const AttendanceDisplay = ({ attendance }) => {
  const events = Object.keys(attendance);
  
  return (
    <Stack direction="row" spacing={1}>
      {events.map((event) => (
        <Tooltip key={event} title={event}>
          <Checkbox
            checked={attendance[event]}
            disabled
            size="small"
            icon={<CancelIcon fontSize="small" />}
            checkedIcon={<CheckCircleIcon fontSize="small" />}
          />
        </Tooltip>
      ))}
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

export default function Staging() {
  const [candidates, setCandidates] = useState([]);

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
    search: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pushAllDialogOpen, setPushAllDialogOpen] = useState(false);
  const [pushAllConfirmText, setPushAllConfirmText] = useState('');
  const [pushAllAcknowledge, setPushAllAcknowledge] = useState(false);
  const [pushAllLoading, setPushAllLoading] = useState(false);
  const [pushAllPreview, setPushAllPreview] = useState({ totalApproved: 0 });
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appModalLoading, setAppModalLoading] = useState(false);
  const [appModal, setAppModal] = useState(null);
  const [docPreview, setDocPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });

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
        const [candidatesData, activeCycle, adminApplications] = await Promise.all([
          stagingAPI.fetchCandidates(),
          stagingAPI.fetchActiveCycle(),
          stagingAPI.fetchAdminApplications()
        ]);
        setCandidates(candidatesData);
        setCurrentCycle(activeCycle);

        // Build grading completion map by candidateId
        const gradingMap = {};
        (adminApplications || []).forEach(app => {
          const complete = Boolean(app.hasResumeScore) && Boolean(app.hasCoverLetterScore) && Boolean(app.hasVideoScore);
          gradingMap[app.candidateId] = complete;
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

  const fetchCandidates = async () => {
    try {
      const [data, adminApplications] = await Promise.all([
        stagingAPI.fetchCandidates(),
        stagingAPI.fetchAdminApplications()
      ]);
      setCandidates(data);
      const gradingMap = {};
      (adminApplications || []).forEach(app => {
        const complete = Boolean(app.hasResumeScore) && Boolean(app.hasCoverLetterScore) && Boolean(app.hasVideoScore);
        gradingMap[app.candidateId] = complete;
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

  const handleInlineDecisionChange = async (candidate, value, phase = 'resume') => {
    try {
      // Persist decision
      if (value === 'yes') {
        await stagingAPI.updateApproval(candidate.id, true);
      } else if (value === 'no') {
        await stagingAPI.updateApproval(candidate.id, false);
      } else if (value === 'maybe_yes') {
        await stagingAPI.updateApproval(candidate.id, null);
        await stagingAPI.addApplicationComment(candidate.id, `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: Maybe - Yes`);
      } else if (value === 'maybe_no') {
        await stagingAPI.updateApproval(candidate.id, null);
        await stagingAPI.addApplicationComment(candidate.id, `${phase === 'coffee' ? 'Coffee Chat' : 'Resume Review'} decision: Maybe - No`);
      }

      // Update local UI selection
      setInlineDecisions(prev => ({ ...prev, [candidate.id]: value }));

      // Refresh data to reflect any downstream effects
      await fetchCandidates();

      setSnackbar({ open: true, message: 'Decision saved', severity: 'success' });
    } catch (error) {
      console.error('Error saving inline decision:', error);
      setSnackbar({ open: true, message: 'Failed to save decision', severity: 'error' });
    }
  };

  const openPushAll = async () => {
    try {
      const adminCandidates = await stagingAPI.fetchAdminCandidates();
      const eligibleStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'];
      const totalApproved = adminCandidates.filter(c => c.approved === true && eligibleStatuses.includes(c.status)).length;
      setPushAllPreview({ totalApproved });
    } catch (e) {
      console.error('Error preparing push-all preview:', e);
      setPushAllPreview({ totalApproved: 0 });
    }
    setPushAllConfirmText('');
    setPushAllAcknowledge(false);
    setPushAllDialogOpen(true);
  };

  const confirmPushAll = async () => {
    try {
      setPushAllLoading(true);
      await stagingAPI.advanceRound();
      setPushAllDialogOpen(false);
      setSnackbar({ open: true, message: 'Decisions pushed successfully', severity: 'success' });
      await fetchCandidates();
    } catch (e) {
      console.error('Error pushing decisions:', e);
      setSnackbar({ open: true, message: 'Failed to push decisions', severity: 'error' });
    } finally {
      setPushAllLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesStatus = filters.status === 'all' || candidate.status === filters.status;
    const matchesRound = filters.round === 'all' || candidate.currentRound === parseInt(filters.round);
    const matchesDecision = filters.decision === 'all' || 
      (filters.decision === 'pending' && !candidate.decisions[`round${candidate.currentRound}`]) ||
      (filters.decision !== 'pending' && candidate.decisions[`round${candidate.currentRound}`] === filters.decision);
    const matchesSearch = filters.search === '' || 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(filters.search.toLowerCase()) ||
      candidate.email.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesRound && matchesDecision && matchesSearch;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
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



        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
              <Tab label="Resume Review" />
              <Tab label="Coffee Chats" />
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
              <Grid item xs={12} md={3}>
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
            <Box mb={2} display="flex" justifyContent="flex-end">
              <Button variant="contained" color="primary" startIcon={<SkipNextIcon />} onClick={openPushAll}>
                Push All Decisions
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Grading Status</TableCell>
                    <TableCell>Current Round</TableCell>
                    <TableCell>Scores</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id} hover sx={{ cursor: 'pointer' }} onClick={async () => {
                      try {
                        setAppModalLoading(true);
                        const data = await apiClient.get(`/applications/${candidate.id}`);
                        setAppModal(data);
                        setAppModalOpen(true);
                      } catch (e) {
                        console.error('Failed to load application', e);
                        setSnackbar({ open: true, message: 'Failed to load application', severity: 'error' });
                      } finally {
                        setAppModalLoading(false);
                      }
                    }}>
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
                        {gradingCompleteByCandidate[candidate.candidateId] ? (
                          <Chip label="Grading Complete" color="success" size="small" />
                        ) : (
                          <Chip label="Grading in Progress" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          Round {candidate.currentRound}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {candidate.currentRound === 1 ? 'Resume Review' : 
                           candidate.currentRound === 2 ? 'Coffee Chats' : 
                           candidate.currentRound === 3 ? 'First Round Interviews' : 
                           candidate.currentRound === 4 ? 'Final Decision' : 
                           `Round ${candidate.currentRound}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="caption" display="block">
                            Overall: {candidate.scores.overall}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Resume: {candidate.scores.resume}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Cover: {candidate.scores.coverLetter}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Video: {candidate.scores.video}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <AttendanceDisplay attendance={candidate.attendance} />
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
                        </Box>
                      </TableCell>
                      
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        )}

        {/* Coffee Chats tab placeholder/filtering (Round 2) */}
        {currentTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Coffee Chats — Candidates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Current Round</TableCell>
                    <TableCell>Scores</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>Decisions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates
                    .filter(c => c.currentRound >= 2)
                    .map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {candidate.firstName} {candidate.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {candidate.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            Round {candidate.currentRound}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {candidate.currentRound === 1 ? 'Resume Review' : 
                             candidate.currentRound === 2 ? 'Coffee Chats' : 
                             candidate.currentRound === 3 ? 'First Round Interviews' : 
                             candidate.currentRound === 4 ? 'Final Decision' : 
                             `Round ${candidate.currentRound}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              Overall: {candidate.scores.overall}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Resume: {candidate.scores.resume}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <AttendanceDisplay attendance={candidate.attendance} />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              Next Round: First Round Interview
                            </Typography>
                            <FormControl size="small" fullWidth onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={inlineDecisions[candidate.id] || ''}
                                displayEmpty
                                onChange={(e) => handleInlineDecisionChange(candidate, e.target.value, 'coffee')}
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
                          </Box>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
        <Dialog open={pushAllDialogOpen} onClose={() => setPushAllDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Push All Decisions</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                This will advance all approved candidates to the next round. This action cannot be easily undone.
              </Alert>
              <Typography variant="body2">
                Approved candidates to advance: <strong>{pushAllPreview.totalApproved}</strong>
              </Typography>
              <TextField
                label="Type PUSH to confirm"
                value={pushAllConfirmText}
                onChange={(e) => setPushAllConfirmText(e.target.value)}
                placeholder="PUSH"
                fullWidth
              />
              <FormControlLabel
                control={<Checkbox checked={pushAllAcknowledge} onChange={(e) => setPushAllAcknowledge(e.target.checked)} />}
                label="I understand this will advance all approved candidates"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPushAllDialogOpen(false)} disabled={pushAllLoading}>Cancel</Button>
            <Button 
              onClick={confirmPushAll}
              variant="contained"
              color="error"
              disabled={pushAllLoading || pushAllConfirmText !== 'PUSH' || !pushAllAcknowledge}
            >
              {pushAllLoading ? 'Pushing…' : 'Confirm Push All'}
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
  );
}
