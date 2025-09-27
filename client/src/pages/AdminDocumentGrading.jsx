import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';
import DocumentGradingModal from '../components/DocumentGradingModal';
import FlagDocumentModal from '../components/FlagDocumentModal';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Description as DocumentIcon,
  Edit as EditIcon,
  Videocam as VideoIcon,
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { Switch, FormControlLabel } from '@mui/material';

// Tab Panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`grading-tabpanel-${index}`}
      aria-labelledby={`grading-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDocumentGrading() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-az');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [firstGenFilter, setFirstGenFilter] = useState('all');
  const [transferFilter, setTransferFilter] = useState('all');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState('resume');
  const [gradeOnlyAssigned, setGradeOnlyAssigned] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flaggingApplication, setFlaggingApplication] = useState(null);
  const [flaggingDocumentType, setFlaggingDocumentType] = useState('resume');
  const [flaggedDocuments, setFlaggedDocuments] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [resolvedDocuments, setResolvedDocuments] = useState([]);
  const [resolvedLoading, setResolvedLoading] = useState(false);

  // Calculate progress data based on actual grading completion
  const calculateProgressData = () => {
    const totalApplications = applications.length;
    
    // Filter applications that have the required documents
    const applicationsWithResume = applications.filter(app => app.resumeUrl);
    const applicationsWithCoverLetter = applications.filter(app => app.coverLetterUrl);
    const applicationsWithVideo = applications.filter(app => app.videoUrl);
    
    // Count completed gradings only for applications that have the documents
    const resumeGraded = applicationsWithResume.filter(app => app.hasResumeScore).length;
    const coverLetterGraded = applicationsWithCoverLetter.filter(app => app.hasCoverLetterScore).length;
    const videoGraded = applicationsWithVideo.filter(app => app.hasVideoScore).length;

    // Calculate total grades needed vs completed only for applications with documents
    const totalResumeGradesNeeded = applicationsWithResume.reduce((sum, app) => sum + (app.resumeTotalMembers || 0), 0);
    const totalResumeGradesCompleted = applicationsWithResume.reduce((sum, app) => sum + ((app.resumeTotalMembers || 0) - (app.resumeMissingGrades || 0)), 0);
    
    const totalCoverLetterGradesNeeded = applicationsWithCoverLetter.reduce((sum, app) => sum + (app.coverLetterTotalMembers || 0), 0);
    const totalCoverLetterGradesCompleted = applicationsWithCoverLetter.reduce((sum, app) => sum + ((app.coverLetterTotalMembers || 0) - (app.coverLetterMissingGrades || 0)), 0);
    
    const totalVideoGradesNeeded = applicationsWithVideo.reduce((sum, app) => sum + (app.videoTotalMembers || 0), 0);
    const totalVideoGradesCompleted = applicationsWithVideo.reduce((sum, app) => sum + ((app.videoTotalMembers || 0) - (app.videoMissingGrades || 0)), 0);

    return [
      {
        title: 'Resume Completion',
        icon: <DocumentIcon />,
        completed: resumeGraded,
        total: applicationsWithResume.length,
        gradesCompleted: totalResumeGradesCompleted,
        gradesNeeded: totalResumeGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalResumeGradesNeeded > 0 ? Math.round((totalResumeGradesCompleted / totalResumeGradesNeeded) * 100) : 0,
        color: 'success'
      },
      {
        title: 'Cover Letter Completion',
        icon: <EditIcon />,
        completed: coverLetterGraded,
        total: applicationsWithCoverLetter.length,
        gradesCompleted: totalCoverLetterGradesCompleted,
        gradesNeeded: totalCoverLetterGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalCoverLetterGradesNeeded > 0 ? Math.round((totalCoverLetterGradesCompleted / totalCoverLetterGradesNeeded) * 100) : 0,
        color: 'success'
      },
      {
        title: 'Video Review Completion',
        icon: <VideoIcon />,
        completed: videoGraded,
        total: applicationsWithVideo.length,
        gradesCompleted: totalVideoGradesCompleted,
        gradesNeeded: totalVideoGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalVideoGradesNeeded > 0 ? Math.round((totalVideoGradesCompleted / totalVideoGradesNeeded) * 100) : 0,
        color: 'success'
      }
    ];
  };

  const progressData = calculateProgressData();

  // Fetch applications for admin grading
  useEffect(() => {
    if (gradeOnlyAssigned) {
      fetchMemberApplications();
    } else {
      fetchAllApplications();
    }
  }, [gradeOnlyAssigned]);

  // Fetch flagged/resolved documents when respective tabs are selected
  useEffect(() => {
    if (tabValue === 3) { // Flagged tab
      fetchFlaggedDocuments();
    } else if (tabValue === 4) { // Resolved tab
      fetchResolvedDocuments();
    }
  }, [tabValue]);

  // Filter and sort applications based on current filters
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.major.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status.toLowerCase() === statusFilter;
    const matchesYear = yearFilter === 'all' || app.year === yearFilter;
    const matchesGender = genderFilter === 'all' || app.gender.toLowerCase() === genderFilter;
    const matchesFirstGen = firstGenFilter === 'all' || 
                           (firstGenFilter === 'yes' && app.isFirstGeneration) ||
                           (firstGenFilter === 'no' && !app.isFirstGeneration);
    const matchesTransfer = transferFilter === 'all' || 
                           (transferFilter === 'yes' && app.isTransferStudent) ||
                           (transferFilter === 'no' && !app.isTransferStudent);

    return matchesSearch && matchesStatus && matchesYear && matchesGender && matchesFirstGen && matchesTransfer;
  });

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortBy) {
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'name-za':
        return b.name.localeCompare(a.name);
      case 'date-new':
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      case 'date-old':
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      default:
        return 0;
    }
  });

  // Generate grading data for each document type
  const generateGradingData = (documentType) => {
    return sortedApplications.map(app => {
      let document = '';
      let hasDocument = false;
      let isGraded = false;
      let status = 'pending';

      switch (documentType) {
        case 'resume':
          document = 'Resume';
          hasDocument = !!app.resumeUrl;
          isGraded = app.hasResumeScore;
          break;
        case 'coverLetter':
          document = 'Cover Letter';
          hasDocument = !!app.coverLetterUrl;
          isGraded = app.hasCoverLetterScore;
          break;
        case 'video':
          document = 'Video';
          hasDocument = !!app.videoUrl;
          isGraded = app.hasVideoScore;
          break;
        default:
          return null;
      }

      // Determine status based on document availability and grading status
      if (!hasDocument) {
        status = 'no-document';
      } else if (isGraded) {
        status = 'completed';
      } else {
        status = 'pending';
      }

      return {
        id: `${app.id}-${documentType}`,
        candidate: app.name,
        document,
        hasDocument,
        isGraded,
        status,
        application: app
      };
    }).filter(Boolean);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGradeDocument = (application, documentType) => {
    setSelectedApplication(application);
    setSelectedDocumentType(documentType);
    setGradingModalOpen(true);
  };

  const handleCloseGradingModal = () => {
    setGradingModalOpen(false);
    setSelectedApplication(null);
    // Refresh applications to update grading status
    if (gradeOnlyAssigned) {
      fetchMemberApplications();
    } else {
      fetchAllApplications();
    }
  };

  const handleFlagDocument = (application, documentType) => {
    setFlaggingApplication(application);
    setFlaggingDocumentType(documentType);
    setFlagModalOpen(true);
  };

  const handleCloseFlagModal = () => {
    setFlagModalOpen(false);
    setFlaggingApplication(null);
    setFlaggingDocumentType('resume');
    // Refresh flagged documents after flagging
    fetchFlaggedDocuments();
  };

  const handleResolveFlag = async (flagId) => {
    try {
      await apiClient.patch(`/admin/flagged-documents/${flagId}/resolve`);
      fetchFlaggedDocuments(); // Refresh the flagged list
      if (tabValue === 4) {
        fetchResolvedDocuments(); // Refresh the resolved list if on resolved tab
      }
    } catch (err) {
      console.error('Error resolving flag:', err);
    }
  };

  const handleUnresolveFlag = async (flagId) => {
    try {
      await apiClient.patch(`/admin/flagged-documents/${flagId}/unresolve`);
      fetchFlaggedDocuments(); // Refresh the flagged list
      if (tabValue === 4) {
        fetchResolvedDocuments(); // Refresh the resolved list if on resolved tab
      }
    } catch (err) {
      console.error('Error unresolving flag:', err);
    }
  };

  const handleSendBackToMembers = async (flagId) => {
    try {
      const response = await apiClient.patch(`/admin/flagged-documents/${flagId}/send-back`);
      alert(`Document sent back to members for grading. Group members: ${response.groupMembers.map(m => m.fullName).join(', ')}`);
      fetchFlaggedDocuments(); // Refresh the flagged list
      if (tabValue === 4) {
        fetchResolvedDocuments(); // Refresh the resolved list if on resolved tab
      }
    } catch (err) {
      console.error('Error sending document back to members:', err);
      alert('Error sending document back to members');
    }
  };

  const fetchFlaggedDocuments = async () => {
    try {
      setFlaggedLoading(true);
      const response = await apiClient.get('/admin/flagged-documents?resolved=false');
      setFlaggedDocuments(response);
    } catch (err) {
      console.error('Error fetching flagged documents:', err);
    } finally {
      setFlaggedLoading(false);
    }
  };

  const fetchResolvedDocuments = async () => {
    try {
      setResolvedLoading(true);
      const response = await apiClient.get('/admin/flagged-documents?resolved=true');
      setResolvedDocuments(response);
    } catch (err) {
      console.error('Error fetching resolved documents:', err);
    } finally {
      setResolvedLoading(false);
    }
  };

  const fetchAllApplications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/applications');
      setApplications(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching all applications:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberApplications = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/review-teams/member-applications/${user.id}`);
      setApplications(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching member applications:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status, application, documentType) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        // When in "Grade Only Assigned" mode, just show "Grade Now" since user only sees their assigned documents
        if (gradeOnlyAssigned) {
          return 'Grade Now';
        }
        
        // Show missing grades information for admin view
        let missingGrades = 0;
        let totalMembers = 0;
        
        switch (documentType) {
          case 'resume':
            missingGrades = application.resumeMissingGrades || 0;
            totalMembers = application.resumeTotalMembers || 0;
            break;
          case 'coverLetter':
            missingGrades = application.coverLetterMissingGrades || 0;
            totalMembers = application.coverLetterTotalMembers || 0;
            break;
          case 'video':
            missingGrades = application.videoMissingGrades || 0;
            totalMembers = application.videoTotalMembers || 0;
            break;
        }
        
        if (missingGrades > 0 && totalMembers > 0) {
          return `Missing ${missingGrades}/${totalMembers} grades`;
        }
        return 'Grade Now';
      case 'no-document':
        return 'No Document';
      default:
        return 'Unknown';
    }
  };

  const getMissingMembersTooltip = (application, documentType) => {
    if (gradeOnlyAssigned) return '';
    
    // Get the team members from the application data
    const teamMembers = application.groupMembers || [];
    if (teamMembers.length === 0) return 'No team information available';
    
    // Get completed evaluators for this document type
    let completedEvaluators = [];
    switch (documentType) {
      case 'resume':
        completedEvaluators = application.resumeCompletedEvaluators || [];
        break;
      case 'coverLetter':
        completedEvaluators = application.coverLetterCompletedEvaluators || [];
        break;
      case 'video':
        completedEvaluators = application.videoCompletedEvaluators || [];
        break;
    }
    
    // Find missing members
    const missingMembers = teamMembers.filter(member => 
      member && member.id && !completedEvaluators.includes(member.id)
    );
    
    if (missingMembers.length === 0) {
      return 'All team members have completed their grades';
    }
    
    const missingNames = missingMembers.map(member => 
      member.fullName || member.name || 'Unknown Member'
    ).filter(Boolean);
    
    if (missingNames.length === 0) {
      return 'Missing grades from team members (names unavailable)';
    }
    
    return `Missing grades from: ${missingNames.join(', ')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'no-document':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Main Title */}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 4 }}>
        Admin Document Grading
      </Typography>

      {/* Admin Summary */}
      {!loading && !error && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'primary.dark', mb: 1 }}>
                {gradeOnlyAssigned ? 'My Review Team Applications' : 'All Applications Overview'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {gradeOnlyAssigned 
                  ? 'Grade documents for applications assigned to your review teams.'
                  : 'As an admin, you can grade documents for all applications in the current cycle.'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total applications: {applications.length}
              </Typography>
              {gradeOnlyAssigned && applications.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    You are assigned to review applications from the following teams:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {[...new Set(applications.map(app => app.groupName))].map((teamName, index) => (
                      <Chip
                        key={index}
                        label={teamName}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={gradeOnlyAssigned}
                  onChange={(e) => setGradeOnlyAssigned(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Grade Only Assigned
                </Typography>
              }
            />
          </Box>
        </Paper>
      )}

      {/* Progress Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'primary.dark', mb: 3 }}>
          Document Grading Progress
        </Typography>
        
        <Stack spacing={3}>
          {progressData.map((item, index) => (
            <Box key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: 'primary.main', mr: 2 }}>
                  {item.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.gradesCompleted} / {item.gradesNeeded} Grades | Deadline: {item.deadline}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Complete {item.percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'success.main'
                  }
                }}
              />
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Start Grading Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.dark', mb: 3 }}>
          Start Grading
        </Typography>

        {/* Search and Sort Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search candidates..."
            variant="outlined"
            size="small"
            sx={{ flex: 1, maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="name-az">Name (A-Z)</MenuItem>
              <MenuItem value="name-za">Name (Z-A)</MenuItem>
              <MenuItem value="date-new">Date (Newest)</MenuItem>
              <MenuItem value="date-old">Date (Oldest)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Filters Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={yearFilter}
              label="Year"
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
              <MenuItem value="2024">2024</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={genderFilter}
              label="Gender"
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>First Gen</InputLabel>
            <Select
              value={firstGenFilter}
              label="First Gen"
              onChange={(e) => setFirstGenFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Transfer</InputLabel>
            <Select
              value={transferFilter}
              label="Transfer"
              onChange={(e) => setTransferFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Document Type Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="document grading tabs">
            <Tab
              icon={<DocumentIcon />}
              label="Resumes"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<EditIcon />}
              label="Cover Letters"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<VideoIcon />}
              label="Videos"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<FlagIcon />}
              label="Flagged"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<CheckCircleIcon />}
              label="Resolved"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        {/* Grading Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Candidate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Document</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tabValue === 3 || tabValue === 4 ? 'Flag Details' : 'Flag'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // Handle flagged documents tab
                  if (tabValue === 3) {
                    if (flaggedLoading) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                            <LinearProgress sx={{ width: '100%' }} />
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    if (flaggedDocuments.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                              No flagged documents found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return flaggedDocuments.map((flaggedDoc) => (
                      <TableRow key={flaggedDoc.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {flaggedDoc.application.firstName} {flaggedDoc.application.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {flaggedDoc.application.major1} • {flaggedDoc.application.graduationYear}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DocumentIcon />}
                            sx={{ textTransform: 'none' }}
                            onClick={() => handleGradeDocument(flaggedDoc.application, flaggedDoc.documentType)}
                          >
                            {flaggedDoc.documentType === 'resume' ? 'Resume' : 
                             flaggedDoc.documentType === 'coverLetter' ? 'Cover Letter' : 'Video'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                              {flaggedDoc.reason}
                            </Typography>
                            {flaggedDoc.message && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {flaggedDoc.message}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" display="block">
                              Flagged by {flaggedDoc.flagger.fullName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label="Flagged"
                              color="error"
                              size="small"
                              icon={<FlagIcon />}
                              sx={{ fontWeight: 600 }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleResolveFlag(flaggedDoc.id)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleSendBackToMembers(flaggedDoc.id)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Send Back
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ));
                  }

                  // Handle resolved documents tab
                  if (tabValue === 4) {
                    if (resolvedLoading) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                            <LinearProgress sx={{ width: '100%' }} />
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    if (resolvedDocuments.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                              No resolved documents found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return resolvedDocuments.map((resolvedDoc) => (
                      <TableRow key={resolvedDoc.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {resolvedDoc.application.firstName} {resolvedDoc.application.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {resolvedDoc.application.major1} • {resolvedDoc.application.graduationYear}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DocumentIcon />}
                            sx={{ textTransform: 'none' }}
                            onClick={() => handleGradeDocument(resolvedDoc.application, resolvedDoc.documentType)}
                          >
                            {resolvedDoc.documentType === 'resume' ? 'Resume' : 
                             resolvedDoc.documentType === 'coverLetter' ? 'Cover Letter' : 'Video'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {resolvedDoc.reason}
                            </Typography>
                            {resolvedDoc.message && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {resolvedDoc.message}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" display="block">
                              Flagged by {resolvedDoc.flagger.fullName}
                            </Typography>
                            <Typography variant="caption" color="success.main" display="block">
                              Resolved by {resolvedDoc.resolver?.fullName} on {new Date(resolvedDoc.resolvedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label="Resolved"
                              color="success"
                              size="small"
                              icon={<CheckCircleIcon />}
                              sx={{ fontWeight: 600 }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => handleUnresolveFlag(resolvedDoc.id)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Unresolve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleSendBackToMembers(resolvedDoc.id)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Send Back
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ));
                  }

                  // Handle regular document tabs
                  const currentGradingData = generateGradingData(
                    tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video'
                  );
                  
                  if (currentGradingData.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography color="text.secondary">
                            No applications found for this document type.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return currentGradingData.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.candidate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.application?.major} • {row.application?.year}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DocumentIcon />}
                          sx={{ textTransform: 'none' }}
                          disabled={!row.hasDocument}
                          onClick={() => row.hasDocument && handleGradeDocument(row.application, tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video')}
                        >
                          {row.document}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const documentType = tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video';
                          const isFlagged = row.application[`${documentType}Flagged`];
                          
                          return (
                            <Tooltip title={isFlagged ? `Flagged: ${isFlagged.reason}` : "Flag document for review"}>
                              <IconButton 
                                size="small"
                                onClick={() => handleFlagDocument(row.application, documentType)}
                                disabled={!row.hasDocument || isFlagged}
                                color={isFlagged ? "error" : "default"}
                              >
                                {isFlagged ? <FlagIcon /> : <FlagOutlinedIcon />}
                              </IconButton>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Tooltip 
                          title={getMissingMembersTooltip(row.application, tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video')}
                          placement="top"
                          arrow
                        >
                          <Chip
                            label={getStatusText(row.status, row.application, tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video')}
                            color={getStatusColor(row.status)}
                            size="small"
                            icon={row.status === 'completed' ? <CheckCircleIcon /> : <ScheduleIcon />}
                            sx={{ fontWeight: 600, cursor: 'help' }}
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Document Grading Modal */}
      <DocumentGradingModal
        open={gradingModalOpen}
        onClose={handleCloseGradingModal}
        application={selectedApplication}
        documentType={selectedDocumentType}
      />

      {/* Flag Document Modal */}
      <FlagDocumentModal
        open={flagModalOpen}
        onClose={handleCloseFlagModal}
        application={flaggingApplication}
        documentType={flaggingDocumentType}
      />
    </Box>
  );
}
