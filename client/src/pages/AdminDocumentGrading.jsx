import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';
import ResumeGradingModal from '../components/ResumeGradingModal';
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
  const [gradeOnlyAssigned, setGradeOnlyAssigned] = useState(false);

  // Calculate progress data based on actual grading completion
  const calculateProgressData = () => {
    const totalApplications = applications.length;
    
    const resumeGraded = applications.filter(app => app.hasResumeScore).length;
    const coverLetterGraded = applications.filter(app => app.hasCoverLetterScore).length;
    const videoGraded = applications.filter(app => app.hasVideoScore).length;

    // Calculate total grades needed vs completed
    const totalResumeGradesNeeded = applications.reduce((sum, app) => sum + (app.resumeTotalMembers || 0), 0);
    const totalResumeGradesCompleted = applications.reduce((sum, app) => sum + ((app.resumeTotalMembers || 0) - (app.resumeMissingGrades || 0)), 0);
    
    const totalCoverLetterGradesNeeded = applications.reduce((sum, app) => sum + (app.coverLetterTotalMembers || 0), 0);
    const totalCoverLetterGradesCompleted = applications.reduce((sum, app) => sum + ((app.coverLetterTotalMembers || 0) - (app.coverLetterMissingGrades || 0)), 0);
    
    const totalVideoGradesNeeded = applications.reduce((sum, app) => sum + (app.videoTotalMembers || 0), 0);
    const totalVideoGradesCompleted = applications.reduce((sum, app) => sum + ((app.videoTotalMembers || 0) - (app.videoMissingGrades || 0)), 0);

    return [
      {
        title: 'Resume Completion',
        icon: <DocumentIcon />,
        completed: resumeGraded,
        total: totalApplications,
        gradesCompleted: totalResumeGradesCompleted,
        gradesNeeded: totalResumeGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalApplications > 0 ? Math.round((resumeGraded / totalApplications) * 100) : 0,
        color: 'success'
      },
      {
        title: 'Cover Letter Completion',
        icon: <EditIcon />,
        completed: coverLetterGraded,
        total: totalApplications,
        gradesCompleted: totalCoverLetterGradesCompleted,
        gradesNeeded: totalCoverLetterGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalApplications > 0 ? Math.round((coverLetterGraded / totalApplications) * 100) : 0,
        color: 'success'
      },
      {
        title: 'Video Review Completion',
        icon: <VideoIcon />,
        completed: videoGraded,
        total: totalApplications,
        gradesCompleted: totalVideoGradesCompleted,
        gradesNeeded: totalVideoGradesNeeded,
        deadline: 'Oct 5th, EOD',
        percentage: totalApplications > 0 ? Math.round((videoGraded / totalApplications) * 100) : 0,
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

  const handleGradeResume = (application) => {
    setSelectedApplication(application);
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
        // Show missing grades information
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
                    {item.completed} / {item.total} Tasks Complete | {item.gradesCompleted} / {item.gradesNeeded} Grades | Deadline: {item.deadline}
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
                  <TableCell sx={{ fontWeight: 600 }}>Flag</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
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
                          onClick={() => row.hasDocument && handleGradeResume(row.application)}
                        >
                          {row.document}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <FlagOutlinedIcon />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(row.status, row.application, tabValue === 0 ? 'resume' : tabValue === 1 ? 'coverLetter' : 'video')}
                          color={getStatusColor(row.status)}
                          size="small"
                          icon={row.status === 'completed' ? <CheckCircleIcon /> : <ScheduleIcon />}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Resume Grading Modal */}
      <ResumeGradingModal
        open={gradingModalOpen}
        onClose={handleCloseGradingModal}
        application={selectedApplication}
      />
    </Box>
  );
}
