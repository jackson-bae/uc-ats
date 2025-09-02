import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';

const INTERVIEW_TYPES = [
  { value: 'COFFEE_CHAT', label: 'Coffee Chat Round', icon: '☕' },
  { value: 'ROUND_ONE', label: 'Round 1', icon: '👥' },
  { value: 'ROUND_TWO', label: 'Round 2', icon: '⭐' },
];

const INTERVIEW_STATUS = {
  UPCOMING: { label: 'Upcoming', color: 'primary' },
  ACTIVE: { label: 'Active', color: 'success' },
  COMPLETED: { label: 'Completed', color: 'default' },
};

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: '',
    startDate: '',
    endDate: '',
    location: '',
    maxCandidates: '',
    description: '',
    cycleId: '',
  });

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/admin/interviews');
      console.log('Fetched interviews:', data);
      setInterviews(data);
    } catch (e) {
      console.error('Error fetching interviews:', e);
      setError(e.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    try {
      const data = await apiClient.get('/admin/cycles');
      setCycles(data);
    } catch (e) {
      console.error('Failed to fetch cycles:', e);
    }
  };

  const createInterview = async () => {
    try {
      setError('');
      
      // Validate required fields
      if (!form.name || !form.type || !form.startDate || !form.endDate || !form.cycleId) {
        setError('Please fill in all required fields');
        return;
      }

      await apiClient.post('/admin/interviews', {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maxCandidates: parseInt(form.maxCandidates) || null,
      });
      
      setCreateOpen(false);
      setForm({
        name: '',
        type: '',
        startDate: '',
        endDate: '',
        location: '',
        maxCandidates: '',
        description: '',
        cycleId: '',
      });
      await fetchInterviews();
      setSuccessMessage('Interview created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to create interview');
    }
  };

  const deleteInterview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) {
      return;
    }
    
    try {
      await apiClient.delete(`/admin/interviews/${id}`);
      await fetchInterviews();
      setSuccessMessage('Interview deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to delete interview');
    }
  };

  const getInterviewStatus = (interview) => {
    const now = new Date();
    const startDate = new Date(interview.startDate);
    const endDate = new Date(interview.endDate);
    
    if (now < startDate) return 'UPCOMING';
    if (now >= startDate && now <= endDate) return 'ACTIVE';
    return 'COMPLETED';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getInterviewTypeInfo = (type) => {
    return INTERVIEW_TYPES.find(t => t.value === type) || { label: type, icon: '❓' };
  };

  useEffect(() => {
    fetchInterviews();
    fetchCycles();
  }, []);

  const activeInterviews = interviews.filter(i => getInterviewStatus(i) === 'ACTIVE' || getInterviewStatus(i) === 'UPCOMING');
  const pastInterviews = interviews.filter(i => getInterviewStatus(i) === 'COMPLETED');

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Interviews</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<UserGroupIcon />}
            onClick={() => navigate('/admin/assigned-interviews')}
          >
            View Assigned Interviews
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PlusIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
            onClick={() => setCreateOpen(true)}
          >
            New Interview
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Active & Upcoming Interviews */}
          <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>
            Active & Upcoming Interviews
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {activeInterviews.map((interview) => {
              const status = getInterviewStatus(interview);
              const typeInfo = getInterviewTypeInfo(interview.type);
              const cycle = cycles.find(c => c.id === interview.cycleId);
              
              return (
                <Grid item xs={12} md={6} lg={4} key={interview.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                        <Chip 
                          label={INTERVIEW_STATUS[status].label}
                          color={INTERVIEW_STATUS[status].color}
                          size="small"
                        />
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => navigate(`/interviews/${interview.id}`)}
                            >
                              <EyeIcon style={{ width: '1rem', height: '1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => deleteInterview(interview.id)}
                            >
                              <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {interview.name}
                      </Typography>
                      
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span style={{ fontSize: '1.2rem' }}>{typeInfo.icon}</span>
                          <Typography variant="body2" color="text.secondary">
                            {typeInfo.label} • {formatDate(interview.startDate)}
                          </Typography>
                        </Stack>
                        
                        {interview.maxCandidates && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <UserGroupIcon style={{ width: '1rem', height: '1rem' }} />
                            <Typography variant="body2" color="text.secondary">
                              Max Candidates: {interview.maxCandidates}
                            </Typography>
                          </Stack>
                        )}
                        
                        {interview.location && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <MapPinIcon style={{ width: '1rem', height: '1rem' }} />
                            <Typography variant="body2" color="text.secondary">
                              {interview.location}
                            </Typography>
                          </Stack>
                        )}
                        
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ClockIcon style={{ width: '1rem', height: '1rem' }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatTime(interview.startDate)} - {formatTime(interview.endDate)}
                          </Typography>
                        </Stack>
                      </Stack>
                      
                      {cycle && (
                        <Typography variant="caption" color="text.secondary">
                          Cycle: {cycle.name}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            
            {activeInterviews.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No active or upcoming interviews. Create your first interview to get started.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Past Interviews */}
          <Typography variant="h5" sx={{ mb: 2 }}>
            Past Interviews
          </Typography>
          <Grid container spacing={3}>
            {pastInterviews.map((interview) => {
              const typeInfo = getInterviewTypeInfo(interview.type);
              const cycle = cycles.find(c => c.id === interview.cycleId);
              
              return (
                <Grid item xs={12} md={6} lg={4} key={interview.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                        <Chip 
                          label="Completed"
                          color="default"
                          size="small"
                        />
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => deleteInterview(interview.id)}
                          >
                            <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {interview.name}
                      </Typography>
                      
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span style={{ fontSize: '1.2rem' }}>{typeInfo.icon}</span>
                          <Typography variant="body2" color="text.secondary">
                            {typeInfo.label} • {formatDate(interview.startDate)}
                          </Typography>
                        </Stack>
                        
                        {interview.maxCandidates && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <UserGroupIcon style={{ width: '1rem', height: '1rem' }} />
                            <Typography variant="body2" color="text.secondary">
                              Max Candidates: {interview.maxCandidates}
                            </Typography>
                          </Stack>
                        )}
                        
                        {interview.location && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <MapPinIcon style={{ width: '1rem', height: '1rem' }} />
                            <Typography variant="body2" color="text.secondary">
                              {interview.location}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                      
                      {cycle && (
                        <Typography variant="caption" color="text.secondary">
                          Cycle: {cycle.name}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            
            {pastInterviews.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No past interviews found.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Create Interview Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create New Interview</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            <TextField 
              label="Interview Name" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              fullWidth 
              required
            />
            
            <TextField
              select
              label="Interview Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              fullWidth
              required
            >
              {INTERVIEW_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              select
              label="Recruiting Cycle"
              value={form.cycleId}
              onChange={(e) => setForm({ ...form, cycleId: e.target.value })}
              fullWidth
              required
            >
              {cycles.map((cycle) => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </MenuItem>
              ))}
            </TextField>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Start Date & Time" 
                  type="datetime-local" 
                  value={form.startDate} 
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} 
                  fullWidth 
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="End Date & Time" 
                  type="datetime-local" 
                  value={form.endDate} 
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} 
                  fullWidth 
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <TextField 
              label="Location" 
              value={form.location} 
              onChange={(e) => setForm({ ...form, location: e.target.value })} 
              fullWidth 
              placeholder="e.g., Business School Room 204, Virtual"
            />
            
            <TextField 
              label="Maximum Candidates" 
              type="number" 
              value={form.maxCandidates} 
              onChange={(e) => setForm({ ...form, maxCandidates: e.target.value })} 
              fullWidth 
              placeholder="Leave empty for unlimited"
            />
            
            <TextField 
              label="Description" 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              fullWidth 
              multiline 
              rows={3}
              placeholder="Optional description of the interview process"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={createInterview} variant="contained">Create Interview</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
