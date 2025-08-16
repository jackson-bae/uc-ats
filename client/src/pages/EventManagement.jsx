import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { TrashIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [eventStats, setEventStats] = useState({}); // Store RSVP/attendance counts
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    eventName: '',
    eventStartDate: '',
    eventEndDate: '',
    eventLocation: '',
    rsvpForm: '',
    attendanceForm: '',
    cycleId: ''
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/admin/events');
      setEvents(data);
      
      // Fetch stats for each event
      const stats = {};
      for (const event of data) {
        try {
          const eventStats = await apiClient.get(`/admin/events/${event.id}/stats`);
          stats[event.id] = eventStats.stats;
        } catch (e) {
          console.warn(`Failed to fetch stats for event ${event.id}:`, e);
          stats[event.id] = { rsvpCount: 0, attendanceCount: 0, hasRsvpForm: false, hasAttendanceForm: false };
        }
      }
      setEventStats(stats);
    } catch (e) {
      setError(e.message || 'Failed to load events');
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

  const createEvent = async () => {
    try {
      setError('');
      
      // Validate required fields
      if (!form.eventName || !form.eventStartDate || !form.eventEndDate || !form.cycleId) {
        setError('Please fill in all required fields');
        return;
      }

      await apiClient.post('/admin/events', {
        ...form,
        eventStartDate: new Date(form.eventStartDate).toISOString(),
        eventEndDate: new Date(form.eventEndDate).toISOString(),
      });
      
      setCreateOpen(false);
      setForm({
        eventName: '',
        eventStartDate: '',
        eventEndDate: '',
        eventLocation: '',
        rsvpForm: '',
        attendanceForm: '',
        cycleId: ''
      });
      
      await fetchEvents();
    } catch (e) {
      setError(e.message || 'Failed to create event');
    }
  };

  const deleteEvent = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await apiClient.delete(`/admin/events/${id}`);
        await fetchEvents();
      } catch (e) {
        setError(e.message || 'Failed to delete event');
      }
    }
  };

  const syncEventRSVP = async (eventId) => {
    try {
      setSyncLoading(prev => ({ ...prev, [`${eventId}-rsvp`]: true }));
      setError('');
      setSuccessMessage('');
      
      const result = await apiClient.post(`/admin/events/${eventId}/sync-rsvp`);
      setSuccessMessage(`RSVP sync completed: ${result.result.processed} responses processed, ${result.result.errors} errors`);
      
      // Refresh event stats
      await fetchEvents();
    } catch (e) {
      setError(e.message || 'Failed to sync RSVP responses');
    } finally {
      setSyncLoading(prev => ({ ...prev, [`${eventId}-rsvp`]: false }));
    }
  };

  const syncEventAttendance = async (eventId) => {
    try {
      setSyncLoading(prev => ({ ...prev, [`${eventId}-attendance`]: true }));
      setError('');
      setSuccessMessage('');
      
      const result = await apiClient.post(`/admin/events/${eventId}/sync-attendance`);
      setSuccessMessage(`Attendance sync completed: ${result.result.processed} responses processed, ${result.result.errors} errors`);
      
      // Refresh event stats
      await fetchEvents();
    } catch (e) {
      setError(e.message || 'Failed to sync attendance responses');
    } finally {
      setSyncLoading(prev => ({ ...prev, [`${eventId}-attendance`]: false }));
    }
  };

  const syncAllEvents = async () => {
    try {
      setSyncLoading(prev => ({ ...prev, 'all': true }));
      setError('');
      setSuccessMessage('');
      
      const result = await apiClient.post('/admin/events/sync-all');
      let totalProcessed = 0;
      let totalErrors = 0;
      
      result.results.forEach(eventResult => {
        if (eventResult.rsvp) {
          totalProcessed += eventResult.rsvp.processed;
          totalErrors += eventResult.rsvp.errors;
        }
        if (eventResult.attendance) {
          totalProcessed += eventResult.attendance.processed;
          totalErrors += eventResult.attendance.errors;
        }
      });
      
      setSuccessMessage(`All events synced: ${totalProcessed} responses processed, ${totalErrors} errors`);
      
      // Refresh event stats
      await fetchEvents();
    } catch (e) {
      setError(e.message || 'Failed to sync all event forms');
    } finally {
      setSyncLoading(prev => ({ ...prev, 'all': false }));
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchCycles();
  }, []);

  const formatDateTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleString();
  };

  const getCycleName = (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId);
    return cycle ? cycle.name : 'Unknown Cycle';
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Event Management</Typography>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={syncAllEvents}
            disabled={syncLoading['all']}
          >
            {syncLoading['all'] ? <CircularProgress size={20} /> : 'Sync All Forms'}
          </Button>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New Event
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Cycle</TableCell>
              <TableCell>RSVP</TableCell>
              <TableCell>Attendance</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => {
              const stats = eventStats[event.id] || { rsvpCount: 0, attendanceCount: 0, hasRsvpForm: false, hasAttendanceForm: false };
              
              return (
                <TableRow key={event.id}>
                  <TableCell>{event.eventName}</TableCell>
                  <TableCell>{formatDateTime(event.eventStartDate)}</TableCell>
                  <TableCell>{formatDateTime(event.eventEndDate)}</TableCell>
                  <TableCell>{event.eventLocation || '-'}</TableCell>
                  <TableCell>{getCycleName(event.cycleId)}</TableCell>
                  <TableCell>
                    <Stack spacing={1} alignItems="flex-start">
                      {event.rsvpForm ? (
                        <>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip 
                              label={`${stats.rsvpCount} RSVPs`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => window.open(event.rsvpForm, '_blank')}
                            >
                              View Form
                            </Button>
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={syncLoading[`${event.id}-rsvp`]}
                            onClick={() => syncEventRSVP(event.id)}
                          >
                            {syncLoading[`${event.id}-rsvp`] ? <CircularProgress size={16} /> : 'Sync'}
                          </Button>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No Form</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1} alignItems="flex-start">
                      {event.attendanceForm ? (
                        <>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip 
                              label={`${stats.attendanceCount} Attended`} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => window.open(event.attendanceForm, '_blank')}
                            >
                              View Form
                            </Button>
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={syncLoading[`${event.id}-attendance`]}
                            onClick={() => syncEventAttendance(event.id)}
                          >
                            {syncLoading[`${event.id}-attendance`] ? <CircularProgress size={16} /> : 'Sync'}
                          </Button>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No Form</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Event Name *"
              value={form.eventName}
              onChange={(e) => setForm({ ...form, eventName: e.target.value })}
              fullWidth
              required
            />
            
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date & Time *"
                type="datetime-local"
                value={form.eventStartDate}
                onChange={(e) => setForm({ ...form, eventStartDate: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date & Time *"
                type="datetime-local"
                value={form.eventEndDate}
                onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="Location"
              value={form.eventLocation}
              onChange={(e) => setForm({ ...form, eventLocation: e.target.value })}
              fullWidth
              placeholder="e.g., Business Building Room 101"
            />

            <TextField
              label="Recruiting Cycle *"
              select
              value={form.cycleId}
              onChange={(e) => setForm({ ...form, cycleId: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">Select a cycle</MenuItem>
              {cycles.map((cycle) => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name} {cycle.isActive && '(Active)'}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="RSVP Google Form URL"
              value={form.rsvpForm}
              onChange={(e) => setForm({ ...form, rsvpForm: e.target.value })}
              fullWidth
              placeholder="https://forms.gle/..."
              helperText="Paste the Google Form URL for event RSVPs"
            />

            <TextField
              label="Attendance Check-in Google Form URL"
              value={form.attendanceForm}
              onChange={(e) => setForm({ ...form, attendanceForm: e.target.value })}
              fullWidth
              placeholder="https://forms.gle/..."
              helperText="Paste the Google Form URL for event attendance tracking"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={createEvent} variant="contained">Create Event</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}