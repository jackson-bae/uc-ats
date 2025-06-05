import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  Menu,
  Divider,
  Avatar,
  Alert,
  Checkbox,
  Fab,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  Launch as LaunchIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  SkipNext as SkipNextIcon,
  FilterList as FilterListIcon,
  Save as SaveIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const createAppTheme = (isDarkMode) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0'
    },
    secondary: {
      main: '#fff'
    },
    background: {
      default: isDarkMode ? '#121212' : '#f5f7fa',
      paper: isDarkMode ? '#1e1e1e' : '#ffffff'
    },
    text: {
      primary: isDarkMode ? '#fff' : '#2c3e50',
      secondary: isDarkMode ? '#b0b0b0' : '#7f8c8d'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: isDarkMode ? '#fff' : '#2c3e50'
    },
    h6: {
      fontWeight: 600,
      color: isDarkMode ? '#fff' : '#2c3e50'
    },
    body2: {
      color: isDarkMode ? '#b0b0b0' : '#7f8c8d'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: isDarkMode ? '0 2px 12px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: isDarkMode ? '1px solid #333' : '1px solid #f0f0f0',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.12)',
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#1e293b'
        }
      }
    }
  }
});

const DRAWER_WIDTH = 280;

const rounds = [
  { key: 'resume', name: 'Resume Review', next: 'coffee_chat' },
  { key: 'coffee_chat', name: 'Coffee Chat', next: 'interview1' },
  { key: 'interview1', name: 'Interview Round 1', next: 'interview2' },
  { key: 'interview2', name: 'Interview Round 2', next: 'final' },
  { key: 'final', name: 'Final Decision', next: null }
];

const mockData = {
  totalApplicants: 187,
  applicationsReviewed: 82,
  upcomingInterviews: 24,
  finalSelections: 'Pending',
  currentRound: 'interview1'
};

const mockTasks = [
  { id: 1, title: 'Grade Resume Reviews', dueDate: 'Today', priority: 'High', category: 'Grading', round: 'resume' },
  { id: 2, title: 'Schedule Coffee Chats', dueDate: 'Tomorrow', priority: 'Medium', category: 'Grading', round: 'coffee_chat' },
  { id: 3, title: 'Sign up for interviews', dueDate: 'Feb 18, 2025', priority: 'Low', category: 'Interviews', round: 'interview1' },
  { id: 4, title: 'Fill out referrals', dueDate: 'Feb 20, 2025', priority: 'Medium', category: 'Referrals', round: 'final' }
];

const mockCandidates = [
  { id: 1, name: 'Pranav Kunnath', email: 'pranav@email.com', status: 'Interview Round 1', score: 85, currentRound: 'interview1', approved: null, submittedAt: '2025-01-15' },
  { id: 2, name: 'Ronit Anilkumar', email: 'ronit@email.com', status: 'Resume Review', score: 92, currentRound: 'resume', approved: true, submittedAt: '2025-01-14' },
  { id: 3, name: 'Jishan Kharbanda', email: 'jishan@email.com', status: 'Final Decision', score: 78, currentRound: 'final', approved: false, submittedAt: '2025-01-13' },
  { id: 4, name: 'Jackson Bae', email: 'jackson@email.com', status: 'Interview Round 2', score: 88, currentRound: 'interview2', approved: null, submittedAt: '2025-01-12' }
];

const StatusIndicator = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Resume Review': return 'info';
      case 'Coffee Chat': return 'secondary';
      case 'Interview Round 1': return 'warning';
      case 'Interview Round 2': return 'primary';
      case 'Final Decision': return 'success';
      default: return 'default';
    }
  };

  return <Chip label={status} color={getStatusColor(status)} size="small" />;
};

const ApprovalIndicator = ({ approved, onApprovalChange }) => {
  if (approved === true) {
    return (
      <Chip
        icon={<ThumbUpIcon />}
        label="Approved"
        color="success"
        size="small"
        onDelete={() => onApprovalChange(null)}
      />
    );
  } else if (approved === false) {
    return (
      <Chip
        icon={<ThumbDownIcon />}
        label="Rejected"
        color="error"
        size="small"
        onDelete={() => onApprovalChange(null)}
      />
    );
  } else {
    return (
      <Stack direction="row" spacing={1}>
        <IconButton
          size="small"
          color="success"
          onClick={() => onApprovalChange(true)}
          sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main' } }}
        >
          <ThumbUpIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onApprovalChange(false)}
          sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main' } }}
        >
          <ThumbDownIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  }
};

const PriorityIndicator = ({ priority }) => {
  const colors = {
    'High': 'error',
    'Medium': 'warning',
    'Low': 'success'
  };

  return <Chip label={priority} color={colors[priority]} size="small" variant="outlined" />;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [stats, setStats] = useState(mockData);
  const [tasks, setTasks] = useState(mockTasks);
  const [candidates, setCandidates] = useState(mockCandidates);

  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [bulkAdvanceDialogOpen, setBulkAdvanceDialogOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    email: '',
    graduationClass: ''
  });
  const [originalEmail, setOriginalEmail] = useState('');
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const loggedInEmail = user?.email || '';  // from AuthContext
        if (!loggedInEmail) return;
  
        const res = await fetch(`/api/admin/profile?email=${encodeURIComponent(loggedInEmail)}`);
        if (!res.ok) throw new Error('Failed to fetch profile');
        
        const data = await res.json();
        setUserProfile({
          fullName: data.fullName,
          email: data.email,
          graduationClass: data.graduationClass
        });
        setOriginalEmail(data.email);
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
  
    fetchProfile();
  }, []);
  
  const handleCycleCreation = async (cycleData) => {
    // Replace with actual logic for Supabase
    try {
      console.log('TODO: Create logic for application cycle and submitting to Supabase backend');
    } catch (error) {
      console.error('Error creating cycle: ', error);
    }
  };

  const handleAssignTask = async (taskData) => {
    // Replace with actual logic for Supabase
    try {
      console.log('TODO: Assign task');
    } catch (error) {
      console.error('Error assigning task: ', error);
    }
  };

  const handleStatusUpdate = async (candidateId, newStatus) => {
    // Replace with actual logic for Supabase
    try {
      console.log('TODO: Update candidate status');

      // Local state update
      setCandidates(prev => prev.map(candidate =>
        candidate.id === candidateId
          ? { ...candidate, status: newStatus }
          : candidate
      ));
    } catch (error) {
      console.error('Error updating status: ', error);
    }
  };

  const handleApprovalChange = async (candidateId, approved) => {
    try {
      console.log('TODO: Update candidate approvalin Supabase backend');
      setCandidates(prev => prev.map(candidate =>
        candidate.id === candidateId
          ? { ...candidate, approved }
          : candidate
      ));
    } catch (error) {
      console.error('Error updating candidate approval: ', error);
    }
  };

  const handleBulkAdvanceRound = async () => {
    try {
      const currentRoundKey = stats.currentRound;
      const currentRound = rounds.find(r => r.key === currentRoundKey);

      if (!currentRound || !currentRound.next) {
        alert('No next round available, or current round not set');
        return;
      }

      const nextRound = rounds.find(r => r.key === currentRound.next);
      const candidatesInCurrentRound = candidates.filter(c => c.currentRound === currentRoundKey);

      const approved = candidatesInCurrentRound.filter(c => c.approved === true);
      const rejected = candidatesInCurrentRound.filter(c => c.approved === false);
      const pending = candidatesInCurrentRound.filter(c => c.approved === null);

      if (pending.length > 0) {
        alert(`Cannot advance round: ${pending.length} candidates still have pending approval status`);
        return;
      }

      console.log('TODO: Implement bulk round advancement in Supabase backend');
      console.log('Advancing to next round:', approved.map(c => c.name));
      console.log('Rejecting candidates:', rejected.map(c => c.name));

      setCandidates(prev => prev.map(candidate => {
        if (approved.some(a => a.id === candidate.id)) {
          return {
            ...candidate,
            currentRound: currentRound.next,
            status: nextRound.name,
            approved: null
          };
        } else if (rejected.some(r => r.id === candidate.id)) {
          return {
            ...candidate,
            status: 'Rejected',
            currentRound: 'rejected'
          };
        }
        return candidate;
      }));

      setStats(prev => ({
        ...prev,
        currentRound: currentRound.next
      }))

      setBulkAdvanceDialogOpen(false);
      alert(`Successfully advanced ${approved.length} candidates to ${nextRound.name} and rejected ${rejected.length} candidates`);
    } catch (error) {
      console.error('Error advancing round: ', error);
    }
  };

  const handleProfileUpdate = async () => {
    console.log('Submitting profile update:', userProfile);
  
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userProfile, originalEmail })
      });
      
  
      if (response.status === 409) {
        setSnackbarMessage('Email is already taken by another user.');
        setSnackbarOpen(true);
        return;
      }
      
      if (!response.ok) throw new Error('Failed to update');
      
      const result = await response.json();
      console.log('Profile update response:', result);
      
      setOriginalEmail(userProfile.email);  // <-- update original email after success
      setSnackbarMessage('Profile updated successfully.');
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbarMessage('Error updating profile. Please try again.');
      setSnackbarOpen(true);
    }
  };
  
  
  

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', !isDarkMode);
  }

  const filteredCandidates = candidates.filter(candidate => {
    const statusMatch = statusFilter === 'all' || candidate.currentRound === statusFilter;
    const approvalMatch = approvalFilter === 'all' ||
      (approvalFilter === 'approved' && candidate.approved === true) ||
      (approvalFilter === 'rejected' && candidate.approved === false) ||
      (approvalFilter === 'pending' && candidate.approved === null);

    return statusMatch && approvalMatch;
  });

  const sidebarItems = [
    { key: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'candidates', text: 'Candidates', icon: <PeopleIcon /> },
    { key: 'grading', text: 'Grading', icon: <AssignmentIcon /> },
    { key: 'interviews', text: 'Interviews', icon: <EventIcon /> },
    { key: 'settings', text: 'Settings', icon: <SettingsIcon /> }
  ];

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#1e293b', color: 'white' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
          Club Admin
        </Typography>
      </Box>
      <List sx={{ pt: 2 }}>
        {sidebarItems.map((item) => (
          <ListItem
            key={item.key}
            button
            onClick={() => setSelectedTab(item.key)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              bgcolor: selectedTab === item.key ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: selectedTab === item.key ? '#60a5fa' : 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <AccountCircleIcon />
              </Avatar>
              <Box>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                {userProfile.fullName || 'Admin User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Class of {userProfile.graduationClass}
              </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'candidates':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h4" gutterBottom>Candidate Management</Typography>
              <Button
                variant="contained"
                startIcon={<SkipNextIcon />}
                onClick={() => setBulkAdvanceDialogOpen(true)}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                Advance Round
              </Button>
            </Stack>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="h6">Current Recruitment Round</Typography>
              <Typography variant="body1">
                {rounds.find(r => r.key === stats.currentRound)?.name} - {candidates.filter(c => c.currentRound === stats.currentRound).length} active candidates
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} mb={3}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Round Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Round Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Rounds</MenuItem>
                  {rounds.map(round => (
                    <MenuItem key={round.key} value={round.key}>{round.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Approval Filter</InputLabel>
                <Select
                  value={approvalFilter}
                  label="Approval Filter"
                  onChange={(e) => setApprovalFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Current Round</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Approval Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>{candidate.name}</TableCell>
                      <TableCell>{candidate.email}</TableCell>
                      <TableCell>
                        <StatusIndicator status={candidate.status} />
                      </TableCell>
                      <TableCell>{candidate.score}</TableCell>
                      <TableCell>
                        <ApprovalIndicator
                          approved={candidate.approved}
                          onApprovalChange={(approved) => handleApprovalChange(candidate.id, approved)}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Dialog open={bulkAdvanceDialogOpen} onClose={() => setBulkAdvanceDialogOpen(false)}>
              <DialogTitle>Advance Round</DialogTitle>
              <DialogContent>
                <Typography variant="body1" gutterBottom>
                  This will advance all approved candidates to the next round and reject all rejected candidates.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Current Round: {rounds.find(r => r.key === stats.currentRound)?.name}
                  <br />
                  Next Round: {rounds.find(r => r.key === rounds.find(r => r.key === stats.currentRound)?.next)?.name || 'None'}
                </Alert>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Approved: {candidates.filter(c => c.currentRound === stats.currentRound && c.approved === true).length} candidates
                  </Typography>
                  <Typography variant="body2">
                    Rejected: {candidates.filter(c => c.currentRound === stats.currentRound && c.approved === false).length} candidates
                  </Typography>
                  <Typography variant="body2">
                    Pending: {candidates.filter(c => c.currentRound === stats.currentRound && c.approved === null).length} candidates
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBulkAdvanceDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleBulkAdvanceRound}
                  variant="contained"
                  color="success"
                >
                  Advance Round
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      case 'grading':
        return (
          <Box>
            <Typography variant="h4" gutterBottom>Grading</Typography>
            <Typography variant="body1">Grading interface to be implemented later.</Typography>
          </Box>
        );
      case 'interviews':
        return (
          <Box>
            <Typography variant="h4" gutterBottom>Interviews</Typography>
            <Typography variant="body1">Interview management to be implemented later.</Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box>
            <Typography variant="h4" gutterBottom>Settings and Configuration</Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">User Profile</Typography>
                      <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleProfileUpdate}
                      size="small"
                      >
                        Save Profile
                      </Button>
                    </Stack>
                    <Stack spacing={3}>
                      <TextField
                      label="Full Name"
                      value={userProfile.fullName}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, fullName: e.target.value }))}
                      fullWidth
                      />
                      <TextField
                      label="Email Address"
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                      fullWidth
                      />
                      <TextField
                      label="Graduation Class"
                      value={userProfile.graduationClass}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, graduationClass: e.target.value }))}
                      placeholder="e.g. 2026"
                      fullWidth
                      />
                      <Typography variant="body2" color="text.secondary">
                        Changes will be saved to your profile and reflected across the system.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Appearance</Typography>
                    <Stack spacing={3}>
                      <FormControlLabel
                        control={
                          <Switch
                          checked={isDarkMode}
                          onChange={handleThemeToggle}
                          icon={<LightModeIcon />}
                          checkedIcon={<DarkModeIcon />}
                          />
                        }
                        label={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body1">Dark Mode</Typography>
                            {isDarkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                          </Stack>
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        Choose either a light or dark theme. Your preferences will be saved automatically.
                      </Typography>

                      <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>Theme Preview</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'primary.main'
                          }} />
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'background.paper',
                            border: 1,
                            borderColor: 'divider'
                          }} />
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'text.primary'
                          }} />
                          <Typography variant="caption" color="text.secondary">
                            {isDarkMode ? 'Dark Theme Active' : 'Light Theme Active'}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return (
          <Box>
            <Typography variant="h4" gutterBottom>Dashboard Overview</Typography>

            <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
              <Typography variant="h6">Current Recruitment Round</Typography>
              <Typography variant="body1">
                {rounds.find(r => r.key === stats.currentRound)?.name} - {candidates.filter(c => c.currentRound === stats.currentRound).length} active candidates
              </Typography>
            </Alert>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>Mock Data Preview</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2">Total Applicants</Typography>
                      <Typography variant="h5">{stats.totalApplicants}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2">Tasks</Typography>
                      <Typography variant="h5">{tasks.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2">Candidates</Typography>
                      <Typography variant="h5">{candidates.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2">Current Round</Typography>
                      <Typography variant="h5">{rounds.find(r => r.key === stats.currentRound)?.name}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
        )
    }
  }

  return (
    <ThemeProvider theme={createAppTheme(isDarkMode)}>
      <CssBaseline />
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet"></link>

      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            bgcolor: 'white',
            color: 'text.primary',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            zIndex: 2222
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton>
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
            }}
          >
            {drawer}
          </Drawer>

          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            mt: '64px'
          }}
        >
          {renderContent()}
        </Box>
      </Box>
      <Snackbar
      open={snackbarOpen}
      autoHideDuration={4000}
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setSnackbarOpen(false)}
        severity={
          snackbarMessage.toLowerCase().includes('success') ? 'success'
          : snackbarMessage.toLowerCase().includes('error') ? 'error'
          : snackbarMessage.toLowerCase().includes('taken') ? 'warning'
          : 'info'
        }
        sx={{ width: '100%' }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
    </ThemeProvider>
  );
}

/*import { useState } from "react";

export default function AdminDashboard() {
  const [currentCycle, setCurrentCycle] = useState("Fall 2025");
  const [round, setRound] = useState(1);
  const [assignedTasks, setAssignedTasks] = useState([]);

  const reviewers = ["Alice", "Bob", "Charlie"];
  const candidates = ["Jane Doe", "John Smith", "Emily Liu"];

  const handleAdvanceRound = () => {
    setRound((prev) => prev + 1);
  };

  const handleAssignTasks = () => {
    const tasks = candidates.map((candidate, i) => ({
      reviewer: reviewers[i % reviewers.length],
      candidate,
      task: "Review Resume",
    }));
    setAssignedTasks(tasks);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="space-y-2">
        <p><strong>Current Cycle:</strong> {currentCycle}</p>
        <p><strong>Current Round:</strong> Round {round}</p>

        <button
          onClick={handleAdvanceRound}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Advance to Next Round
        </button>
      </div>

      <hr />

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Assign Tasks</h3>
        <button
          onClick={handleAssignTasks}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Assign Resume Reviews
        </button>

        {assignedTasks.length > 0 && (
          <ul className="mt-4 list-disc list-inside space-y-1">
            {assignedTasks.map((task, idx) => (
              <li key={idx}>
                {task.reviewer} → {task.task} for {task.candidate}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
  */