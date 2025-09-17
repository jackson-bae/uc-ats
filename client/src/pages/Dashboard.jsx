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
  const [timelineScrollPosition, setTimelineScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.allSettled([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/cycles/active'),
      ]);
      
      // Handle stats result
      if (s.status === 'fulfilled') {
        setStats(s.value);
      } else {
        console.error('Failed to load stats:', s.reason);
        setStats({ totalApplicants: 0, tasks: 0, candidates: 0, currentRound: 'SUBMITTED' });
      }
      
      // Handle active cycle result
      if (c.status === 'fulfilled') {
        setActiveCycle(c.value);
      } else {
        console.error('Failed to load active cycle:', c.reason);
        setActiveCycle(null);
      }
    } catch (e) {
      console.error('Error in load function:', e);
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineEvents = async () => {
    try {
      setEventsLoading(true);
      const events = await apiClient.get('/admin/events');
      
      // Handle case where events might be null or undefined
      if (!events || !Array.isArray(events)) {
        console.warn('No events data received or invalid format');
        setTimelineEvents([]);
        return;
      }
      
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
      setTimelineEvents([]); // Set empty array instead of showing error
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchDemographicData = async () => {
    try {
      setDemographicsLoading(true);
      const applications = await apiClient.get('/admin/applications');
      
      // Handle case where applications might be null or undefined
      if (!applications || !Array.isArray(applications)) {
        console.warn('No applications data received or invalid format');
        setDemographicData({
          majors: [],
          genders: [],
          gpaRanges: [],
          graduationYears: [],
          transferStudents: [],
          firstGeneration: []
        });
        return;
      }
      
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
      // Set empty demographic data instead of showing error
      setDemographicData({
        majors: [],
        genders: [],
        gpaRanges: [],
        graduationYears: [],
        transferStudents: [],
        firstGeneration: []
      });
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

  // Update scroll button states when timeline events change
  useEffect(() => {
    if (timelineEvents.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(updateScrollButtons, 100);
    }
  }, [timelineEvents]);

  const handleViewMore = (section) => {
    // TODO: Implement navigation to detailed views
    console.log('View more:', section);
  };

  const handleTimelineScroll = (direction) => {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) return;

    const scrollAmount = 200; // pixels to scroll
    const newPosition = direction === 'left' 
      ? timelineScrollPosition - scrollAmount 
      : timelineScrollPosition + scrollAmount;

    timelineContainer.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });

    setTimelineScrollPosition(newPosition);
  };

  const updateScrollButtons = () => {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) return;

    const { scrollLeft, scrollWidth, clientWidth } = timelineContainer;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    setTimelineScrollPosition(scrollLeft);
  };

  // Enhanced color schemes for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];
  const PIE_COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#a8edea', '#ff9a9e', '#ffecd2'];
  const BAR_COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

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
              onClick={() => handleTimelineScroll('left')}
              disabled={!canScrollLeft}
              sx={{
                bgcolor: 'grey.100',
                border: 1,
                borderColor: 'grey.300',
                '&:hover': { bgcolor: 'primary.main', color: 'white' },
                '&:disabled': { 
                  bgcolor: 'grey.50', 
                  color: 'grey.400',
                  borderColor: 'grey.200'
                }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            
            <Box 
              id="timeline-container"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                flex: 1, 
                mx: 2, 
                gap: 4, 
                overflowX: 'auto',
                scrollbarWidth: 'none', // Firefox
                '&::-webkit-scrollbar': { display: 'none' } // Chrome, Safari
              }}
              onScroll={updateScrollButtons}
            >
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
              onClick={() => handleTimelineScroll('right')}
              disabled={!canScrollRight}
              sx={{
                bgcolor: 'grey.100',
                border: 1,
                borderColor: 'grey.300',
                '&:hover': { bgcolor: 'primary.main', color: 'white' },
                '&:disabled': { 
                  bgcolor: 'grey.50', 
                  color: 'grey.400',
                  borderColor: 'grey.200'
                }
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Enhanced Demographic Charts Section */}
      <Typography variant="h5" component="h2" sx={{ 
        fontWeight: 700, 
        color: 'primary.dark', 
        mb: 4,
        textAlign: 'center',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 3,
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          borderRadius: 2
        }
      }}>
        Application Demographics
      </Typography>

      {demographicsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={60} sx={{ color: '#667eea' }} />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Majors Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#667eea',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  Applications by Major
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={demographicData.majors.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={11}
                      stroke="#666"
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                      fill="url(#majorGradient)"
                    >
                      {demographicData.majors.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="majorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* GPA Distribution Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#f093fb',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  GPA Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={demographicData.gpaRanges}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {demographicData.gpaRanges.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Gender Distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#4facfe',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  Gender Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={demographicData.genders}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {demographicData.genders.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Graduation Years */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#43e97b',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  Graduation Years
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={demographicData.graduationYears} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#666"
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                      fill="url(#yearGradient)"
                    />
                    <defs>
                      <linearGradient id="yearGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#43e97b" />
                        <stop offset="100%" stopColor="#38f9d7" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Transfer Students */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#fa709a',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #fa709a, #fee140)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  Transfer Students
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={demographicData.transferStudents}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {demographicData.transferStudents.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* First Generation */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#a8edea',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    width: 4,
                    height: 24,
                    background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
                    borderRadius: 2,
                    mr: 2
                  }
                }}>
                  First Generation Students
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={demographicData.firstGeneration}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {demographicData.firstGeneration.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                      }}
                    />
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