import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Stack, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import {
  Check as CheckIcon,
  Schedule as ClockIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  OpenInNew as ArrowTopRightOnSquareIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalApplicants: 0, tasks: 0, candidates: 0, currentRound: 'SUBMITTED' });
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [demographicData, setDemographicData] = useState({
    majors: [],
    genders: [],
    gpaRanges: [],
    graduationYears: [],
    transferStudents: [],
    firstGeneration: []
  });
  const [eventsLoading, setEventsLoading] = useState(false);
  const [demographicsLoading, setDemographicsLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/cycles/active'),
      ]);
      setStats(s);
      setActiveCycle(c);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineEvents = async () => {
    try {
      setEventsLoading(true);
      const events = await apiClient.get('/admin/events');
      
      const timelineEvents = events
        .sort((a, b) => new Date(a.eventStartDate) - new Date(b.eventStartDate))
        .map(event => {
          const eventDate = new Date(event.eventStartDate);
          const now = new Date();
          const isCompleted = eventDate < now;
          
          return {
            id: event.id,
            title: event.eventName,
            date: eventDate.toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: '2-digit'
            }),
            status: isCompleted ? 'completed' : 'pending',
            eventStartDate: event.eventStartDate,
            eventEndDate: event.eventEndDate,
            eventLocation: event.eventLocation
          };
        });
      
      setTimelineEvents(timelineEvents);
    } catch (err) {
      console.error('Error fetching timeline events:', err);
      setError('Failed to load recruitment timeline events');
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchDemographicData = async () => {
    try {
      setDemographicsLoading(true);
      const applications = await apiClient.get('/admin/applications');
      
      // Process demographic data
      const majors = {};
      const genders = {};
      const gpaRanges = { '3.5-4.0': 0, '3.0-3.4': 0, '2.5-2.9': 0, '2.0-2.4': 0, 'Below 2.0': 0 };
      const graduationYears = {};
      const transferStudents = { 'Transfer': 0, 'Non-Transfer': 0 };
      const firstGeneration = { 'First Generation': 0, 'Not First Generation': 0 };

      applications.forEach(app => {
        // Majors
        const major = app.major1 || 'Unknown';
        majors[major] = (majors[major] || 0) + 1;
        
        // Genders
        const gender = app.gender || 'Unknown';
        genders[gender] = (genders[gender] || 0) + 1;
        
        // GPA Ranges
        const gpa = parseFloat(app.cumulativeGpa);
        if (gpa >= 3.5) gpaRanges['3.5-4.0']++;
        else if (gpa >= 3.0) gpaRanges['3.0-3.4']++;
        else if (gpa >= 2.5) gpaRanges['2.5-2.9']++;
        else if (gpa >= 2.0) gpaRanges['2.0-2.4']++;
        else gpaRanges['Below 2.0']++;
        
        // Graduation Years
        const year = app.graduationYear || 'Unknown';
        graduationYears[year] = (graduationYears[year] || 0) + 1;
        
        // Transfer Students
        if (app.isTransferStudent) {
          transferStudents['Transfer']++;
        } else {
          transferStudents['Non-Transfer']++;
        }
        
        // First Generation
        if (app.isFirstGeneration) {
          firstGeneration['First Generation']++;
        } else {
          firstGeneration['Not First Generation']++;
        }
      });

      setDemographicData({
        majors: Object.entries(majors).map(([name, value]) => ({ name, value })),
        genders: Object.entries(genders).map(([name, value]) => ({ name, value })),
        gpaRanges: Object.entries(gpaRanges).map(([name, value]) => ({ name, value })),
        graduationYears: Object.entries(graduationYears).map(([name, value]) => ({ name, value })),
        transferStudents: Object.entries(transferStudents).map(([name, value]) => ({ name, value })),
        firstGeneration: Object.entries(firstGeneration).map(([name, value]) => ({ name, value }))
      });
    } catch (err) {
      console.error('Error fetching demographic data:', err);
      setError('Failed to load demographic data');
    } finally {
      setDemographicsLoading(false);
    }
  };

  useEffect(() => { 
    if (user) {
      load();
      fetchTimelineEvents();
      fetchDemographicData();
    }
  }, [user]);

  const handleViewMore = (section) => {
    // TODO: Implement navigation to detailed views
    console.log('View more:', section);
  };

  // Color schemes for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (!user) {
    return (
      <Box>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please log in to view the dashboard.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: 'primary.dark' }}>
            Admin Dashboard
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => {
              load();
              fetchTimelineEvents();
              fetchDemographicData();
            }} 
            disabled={loading || eventsLoading || demographicsLoading}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={4}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Active Cycle</Typography>
          {activeCycle ? (
            <>
              <Typography variant="h6">{activeCycle.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {activeCycle.startDate ? new Date(activeCycle.startDate).toLocaleDateString() : '—'}
                {' '}to{' '}
                {activeCycle.endDate ? new Date(activeCycle.endDate).toLocaleDateString() : '—'}
              </Typography>
            </>
          ) : (
            <Typography variant="body1">No active cycle</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Total Candidates (cycle)</Typography>
          <Typography variant="h4">{stats.totalApplicants}</Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">In Pipeline</Typography>
          <Typography variant="h4">{stats.candidates}</Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Current Stage</Typography>
          <Typography variant="h6">{stats.currentRound?.replace('_', ' ') || '—'}</Typography>
        </Paper>
      </Stack>

      {/* Recruitment Timeline Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'primary.dark' }}>
            Recruitment Timeline
          </Typography>
          <Button
            variant="text"
            endIcon={<ArrowTopRightOnSquareIcon />}
            onClick={() => handleViewMore('timeline')}
            sx={{ color: 'primary.main' }}
          >
            View More
          </Button>
        </Box>
        
        {eventsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : timelineEvents.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No events found for the current recruitment cycle.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <IconButton
              sx={{
                bgcolor: 'grey.100',
                border: 1,
                borderColor: 'grey.300',
                '&:hover': { bgcolor: 'primary.main', color: 'white' }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mx: 2, gap: 4, overflowX: 'auto' }}>
              {timelineEvents.map((event, index) => (
                <Box key={event.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      bgcolor: event.status === 'completed' ? 'success.main' : 'grey.500',
                      color: 'white',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    {event.status === 'completed' ? <CheckIcon /> : <ClockIcon />}
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.date}
                    </Typography>
                  </Box>
                  {index < timelineEvents.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 20,
                        left: '50%',
                        width: 32,
                        height: 2,
                        bgcolor: 'grey.300',
                        zIndex: 1
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
            
            <IconButton
              sx={{
                bgcolor: 'grey.100',
                border: 1,
                borderColor: 'grey.300',
                '&:hover': { bgcolor: 'primary.main', color: 'white' }
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Demographic Charts Section */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'primary.dark', mb: 3 }}>
        Application Demographics
      </Typography>

      {demographicsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Majors Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Applications by Major
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demographicData.majors.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* GPA Distribution Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  GPA Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographicData.gpaRanges}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {demographicData.gpaRanges.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Gender Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Gender Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographicData.genders}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {demographicData.genders.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Graduation Years */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Graduation Years
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demographicData.graduationYears}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Transfer Students */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Transfer Students
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographicData.transferStudents}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {demographicData.transferStudents.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* First Generation */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  First Generation Students
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographicData.firstGeneration}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {demographicData.firstGeneration.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}