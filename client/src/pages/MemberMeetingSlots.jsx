import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  Event as EventIcon
} from '@mui/icons-material';

export default function MemberMeetingSlots() {
  const { token } = useAuth();
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ location: '', startTime: '', endTime: '', capacity: 2 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');
  const [editingSlot, setEditingSlot] = useState(null);
  const [editForm, setEditForm] = useState({ location: '', startTime: '', endTime: '', capacity: 2 });
  const [editDateError, setEditDateError] = useState('');

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/member/meeting-slots');
      setSlots(data);
    } catch (e) {
      setError(e.message || 'Failed to load meeting slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const validateDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    
    // Check if year is within reasonable bounds (1900-2100)
    if (year < 1900 || year > 2100) {
      return 'Year must be between 1900 and 2100';
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    
    // Check if date is not too far in the past
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    if (date < oneYearAgo) {
      return 'Date cannot be more than 1 year in the past';
    }
    
    return null;
  };

  const handleDateChange = (field, value) => {
    const error = validateDate(value);
    setDateError(error || '');
    setForm({ ...form, [field]: value });
  };

  const onCreate = async (e) => {
    e.preventDefault();
    
    // Validate dates before submitting
    const startTimeError = validateDate(form.startTime);
    const endTimeError = validateDate(form.endTime);
    
    if (startTimeError || endTimeError) {
      setDateError(startTimeError || endTimeError);
      return;
    }
    
    // Check if end time is after start time
    if (form.endTime && form.startTime && new Date(form.endTime) <= new Date(form.startTime)) {
      setDateError('End time must be after start time');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      setDateError('');
      
      console.log('Sending form data:', form);
      console.log('startTime type:', typeof form.startTime);
      console.log('startTime value:', form.startTime);
      console.log('endTime type:', typeof form.endTime);
      console.log('endTime value:', form.endTime);
      
      const response = await api.post('/member/meeting-slots', form);
      console.log('Response from server:', response);
      
      setForm({ location: '', startTime: '', endTime: '', capacity: 2 });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to create meeting slot');
    } finally {
      setSubmitting(false);
    }
  };

  const setAttendance = async (signupId, attended) => {
    try {
      await api.patch(`/member/meeting-signups/${signupId}/attendance`, { attended });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update attendance');
    }
  };

  const startEdit = (slot) => {
    setEditingSlot(slot);
    // Convert UTC time back to datetime-local format for editing
    const startDate = new Date(slot.startTime);
    const endDate = slot.endTime ? new Date(slot.endTime) : null;
    
    console.log('Original slot startTime:', slot.startTime);
    console.log('Parsed startDate:', startDate);
    console.log('StartDate toISOString:', startDate.toISOString());
    
    // Format for datetime-local input - convert from UTC to PST
    const formatForInput = (date) => {
      // The date is stored as UTC, convert to PST for editing
      const pstDate = new Date(date.getTime() - (8 * 60 * 60 * 1000));
      
      // Format for datetime-local input (YYYY-MM-DDTHH:MM)
      const year = pstDate.getFullYear();
      const month = String(pstDate.getMonth() + 1).padStart(2, '0');
      const day = String(pstDate.getDate()).padStart(2, '0');
      const hours = String(pstDate.getHours()).padStart(2, '0');
      const minutes = String(pstDate.getMinutes()).padStart(2, '0');
      
      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
      console.log('PST date:', pstDate);
      console.log('Formatted for input:', formatted);
      return formatted;
    };
    
    const startTimeFormatted = formatForInput(startDate);
    const endTimeFormatted = endDate ? formatForInput(endDate) : '';
    
    console.log('Setting edit form with:', {
      startTime: startTimeFormatted,
      endTime: endTimeFormatted
    });
    
    setEditForm({
      location: slot.location,
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      capacity: slot.capacity
    });
    setEditDateError('');
  };

  const cancelEdit = () => {
    setEditingSlot(null);
    setEditForm({ location: '', startTime: '', endTime: '', capacity: 2 });
    setEditDateError('');
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    
    // Validate dates before submitting
    const startTimeError = validateDate(editForm.startTime);
    const endTimeError = validateDate(editForm.endTime);
    
    if (startTimeError || endTimeError) {
      setEditDateError(startTimeError || endTimeError);
      return;
    }
    
    // Check if end time is after start time
    if (editForm.endTime && editForm.startTime && new Date(editForm.endTime) <= new Date(editForm.startTime)) {
      setEditDateError('End time must be after start time');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      setEditDateError('');
      
      console.log('Updating slot:', editingSlot.id, 'with data:', editForm);
      console.log('Edit form startTime:', editForm.startTime);
      console.log('Edit form endTime:', editForm.endTime);
      
      const response = await api.put(`/member/meeting-slots/${editingSlot.id}`, editForm);
      console.log('Update response:', response);
      setEditingSlot(null);
      setEditForm({ location: '', startTime: '', endTime: '', capacity: 2 });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update meeting slot');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (slotId) => {
    // Find the slot to check if it has signups
    const slot = slots.find(s => s.id === slotId);
    const hasSignups = slot && slot.signups.length > 0;
    
    const confirmMessage = hasSignups 
      ? `Are you sure you want to delete this meeting slot? This will cancel the meeting for ${slot.signups.length} signup(s) and send them cancellation emails. This action cannot be undone.`
      : 'Are you sure you want to delete this meeting slot? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      await api.delete(`/member/meeting-slots/${slotId}`);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to delete meeting slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCalendar = (slot) => {
    try {
      // Use stored UTC timestamps directly and let Google Calendar handle conversion
      const utcStartDate = new Date(slot.startTime);
      const utcEndDate = slot.endTime ? new Date(slot.endTime) : new Date(utcStartDate.getTime() + 30 * 60 * 1000);

      // Format for Google Calendar (UTC, no manual offsets)
      const formatDateForGoogle = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const startTime = formatDateForGoogle(utcStartDate);
      const endTime = formatDateForGoogle(utcEndDate);

      const eventTitle = 'Get to Know UC - Meeting Slot';

      // For human-readable text, format in Los Angeles tz (handles PST/PDT automatically)
      const timeString = utcStartDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      });
      const dateString = utcStartDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
      });

      const eventDescription = `Get to Know UC Meeting Slot\n\nMeeting Details:\nDate: ${dateString}\nTime: ${timeString} PT\nLocation: ${slot.location}\n\nThis is your scheduled meeting slot for "Get to Know UC" where you'll meet with potential candidates.`;
      const eventLocation = slot.location;

      const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
      googleCalendarUrl.searchParams.set('action', 'TEMPLATE');
      googleCalendarUrl.searchParams.set('text', eventTitle);
      googleCalendarUrl.searchParams.set('dates', `${startTime}/${endTime}`);
      googleCalendarUrl.searchParams.set('details', eventDescription);
      googleCalendarUrl.searchParams.set('location', eventLocation);
      googleCalendarUrl.searchParams.set('sf', 'true');
      googleCalendarUrl.searchParams.set('output', 'xml');
      // Ensure Calendar UI opens with the intended timezone
      googleCalendarUrl.searchParams.set('ctz', 'America/Los_Angeles');

      window.open(googleCalendarUrl.toString(), '_blank');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      alert('Failed to open calendar. Please try again.');
    }
  };

  const formatDateTime = (dateTime) => {
    console.log('formatDateTime input:', dateTime);
    // Convert UTC time to PST for display
    const utcDate = new Date(dateTime);
    console.log('UTC date:', utcDate);
    console.log('UTC date toISOString:', utcDate.toISOString());
    
    // Convert UTC to PST (subtract 8 hours)
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    console.log('PST date:', pstDate);
    
    // Format manually using UTC methods to avoid timezone issues
    const weekday = pstDate.toLocaleDateString('en-US', { weekday: 'short' });
    const month = pstDate.toLocaleDateString('en-US', { month: 'short' });
    const day = pstDate.getUTCDate();
    const hour = pstDate.getUTCHours();
    const minute = pstDate.getUTCMinutes();
    
    const formatted = `${weekday}, ${month} ${day}, ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
    console.log('formatDateTime output:', formatted);
    return formatted;
  };

  const getSlotStatus = (slot) => {
    const now = new Date();
    // Convert stored UTC times back to PST for comparison
    const startTime = new Date(new Date(slot.startTime).getTime() - (8 * 60 * 60 * 1000));
    const endTime = slot.endTime ? new Date(new Date(slot.endTime).getTime() - (8 * 60 * 60 * 1000)) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    return 'completed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'primary';
      case 'active': return 'success';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  // Filter out past meeting slots
  const getCurrentAndFutureSlots = () => {
    const now = new Date();
    return slots.filter(slot => {
      // Convert stored UTC time to PST for comparison
      const startTime = new Date(new Date(slot.startTime).getTime() - (8 * 60 * 60 * 1000));
      // Only show slots that haven't ended yet
      return startTime >= now;
    });
  };

  const currentAndFutureSlots = getCurrentAndFutureSlots();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: 'primary.dark' }}>
              Get to Know UC
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Manage your meeting slots and track attendance for 1:2 meetings with potential candidates.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            endIcon={<OpenInNewIcon />}
            onClick={() => window.open('/meet', '_blank')}
            sx={{ 
              minWidth: 200,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'primary.50'
              }
            }}
          >
            View Public Page
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Create New Slot Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3, color: 'primary.dark' }}>
          Create New Meeting Slot
        </Typography>
        
        <Box component="form" onSubmit={onCreate}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Location"
                placeholder="e.g., Kerckhoff 152"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                InputProps={{
                  startAdornment: <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => handleDateChange('startTime', e.target.value)}
                required
                error={!!dateError}
                helperText={dateError}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16), // Prevent past dates
                  max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 16) // Max 1 year in future
                }}
                InputProps={{
                  startAdornment: <ScheduleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Time (Optional)"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => handleDateChange('endTime', e.target.value)}
                inputProps={{
                  min: form.startTime || new Date().toISOString().slice(0, 16),
                  max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 16)
                }}
                InputProps={{
                  startAdornment: <ScheduleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Capacity"
                type="number"
                min={1}
                max={10}
                value={form.capacity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string during editing, but default to 2 when form is reset
                  if (value === '') {
                    setForm({ ...form, capacity: '' });
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                      setForm({ ...form, capacity: numValue });
                    }
                  }
                }}
                onBlur={(e) => {
                  // Ensure we have a valid number when field loses focus
                  const value = e.target.value;
                  if (value === '' || isNaN(parseInt(value, 10))) {
                    setForm({ ...form, capacity: 2 });
                  }
                }}
                InputProps={{
                  startAdornment: <PeopleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting || !!dateError || !form.location || !form.startTime || !form.capacity || form.capacity < 1 || form.capacity > 10}
                startIcon={<AddIcon />}
                sx={{ height: '56px' }}
              >
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Edit Meeting Slot Form */}
      {editingSlot && (
        <Paper sx={{ p: 3, mb: 4, border: '2px solid', borderColor: 'primary.main' }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3, color: 'primary.dark' }}>
            Edit Meeting Slot
          </Typography>
          
          <Box component="form" onSubmit={onUpdate}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Location"
                  placeholder="e.g., Kerckhoff 152"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => {
                    const error = validateDate(e.target.value);
                    setEditDateError(error || '');
                    setEditForm({ ...editForm, startTime: e.target.value });
                  }}
                  required
                  error={!!editDateError}
                  helperText={editDateError}
                  inputProps={{
                    min: new Date().toISOString().slice(0, 16),
                    max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 16)
                  }}
                  InputProps={{
                    startAdornment: <ScheduleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="End Time (Optional)"
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => {
                    const error = validateDate(e.target.value);
                    setEditDateError(error || '');
                    setEditForm({ ...editForm, endTime: e.target.value });
                  }}
                  inputProps={{
                    min: editForm.startTime || new Date().toISOString().slice(0, 16),
                    max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 16)
                  }}
                  InputProps={{
                    startAdornment: <ScheduleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  min={1}
                  max={10}
                  value={editForm.capacity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEditForm({ ...editForm, capacity: '' });
                    } else {
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                        setEditForm({ ...editForm, capacity: numValue });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseInt(value, 10))) {
                      setEditForm({ ...editForm, capacity: 2 });
                    }
                  }}
                  InputProps={{
                    startAdornment: <PeopleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Stack spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={submitting || !!editDateError || !editForm.location || !editForm.startTime || !editForm.capacity || editForm.capacity < 1 || editForm.capacity > 10}
                    startIcon={<EditIcon />}
                    sx={{ height: '28px' }}
                  >
                    {submitting ? 'Updating...' : 'Update'}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth
                    onClick={cancelEdit}
                    disabled={submitting}
                    sx={{ height: '28px' }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Meeting Slots List */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
            Your Meeting Slots
          </Typography>
          <Chip
            label={`${currentAndFutureSlots.length} Active`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : currentAndFutureSlots.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <ScheduleIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {slots.length === 0 ? 'No Meeting Slots Yet' : 'No Active Meeting Slots'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {slots.length === 0 
                ? 'Create your first meeting slot to start connecting with potential candidates.'
                : 'All your meeting slots have passed. Create new ones to continue connecting with potential candidates.'
              }
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {currentAndFutureSlots.map((slot) => {
              const status = getSlotStatus(slot);
              const attendedCount = slot.signups.filter(s => s.attended).length;
              
              return (
                <Card key={slot.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatDateTime(slot.startTime)}
                          </Typography>
                          <Chip
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            color={getStatusColor(status)}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {slot.location}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {slot.signups.length} / {slot.capacity} signed up
                            {attendedCount > 0 && ` • ${attendedCount} attended`}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Add to Google Calendar">
                          <IconButton 
                            size="small"
                            onClick={() => handleAddToCalendar(slot)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EventIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit slot">
                          <IconButton 
                            size="small"
                            onClick={() => startEdit(slot)}
                            disabled={editingSlot !== null}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={slot.signups.length > 0 ? "Delete slot (will send cancellation emails)" : "Delete slot"}>
                          <IconButton 
                            size="small"
                            onClick={() => onDelete(slot.id)}
                            disabled={editingSlot !== null}
                            sx={{ color: 'error.main' }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {slot.signups.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          Signups ({slot.signups.length})
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Student ID</TableCell>
                                <TableCell align="center">Attended</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {slot.signups.map((signup) => (
                                <TableRow key={signup.id}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {signup.fullName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                      {signup.email}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                      {signup.studentId || '-'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox
                                      checked={signup.attended}
                                      onChange={(e) => setAttendance(signup.id, e.target.checked)}
                                      color="success"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}


