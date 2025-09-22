import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import UConsultingLogo from '../components/UConsultingLogo';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Container
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

export default function CoffeeChatsPublic() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', studentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [needsAccount, setNeedsAccount] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/meeting-slots');
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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setNeedsAccount(false);
      const response = await api.post(`/meeting-slots/${selectedSlot}/signup`, form);
      setSuccess(response.message || 'Successfully signed up! You will receive a confirmation email shortly.');
      setNeedsAccount(response.needsAccount || false);
      setForm({ fullName: '', email: '', studentId: '' });
      setSelectedSlot(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to sign up for this meeting slot');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateTime) => {
    // Convert UTC time to PST for display
    const utcDate = new Date(dateTime);
    // Convert UTC to PST (subtract 8 hours)
    const pstDate = new Date(utcDate.getTime() - (8 * 60 * 60 * 1000));
    
    // Format manually using UTC methods to avoid timezone issues
    const weekday = pstDate.toLocaleDateString('en-US', { weekday: 'long' });
    const month = pstDate.toLocaleDateString('en-US', { month: 'long' });
    const day = pstDate.getUTCDate();
    const hour = pstDate.getUTCHours();
    const minute = pstDate.getUTCMinutes();
    
    return `${weekday}, ${month} ${day}, ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  };

  const getSelectedSlotData = () => {
    return slots.find(s => s.id === selectedSlot);
  };

  return (
    <Box>
      {/* Hero Section with Club Photo - Full Width */}
      <Box sx={{ mb: 6 }}>
        {/* Club Photo - Full Width */}
        <Box sx={{ 
          position: 'relative', 
          mb: 4,
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          height: '500px',
          overflow: 'hidden'
        }}>
          <img 
            src="/api/uploads/clubPhoto.jpg" 
            alt="UConsulting Members"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block'
            }}
          />
          {/* Dark overlay for better text readability */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)'
          }} />
          
          {/* Logo in top left */}
          <Box sx={{
            position: 'absolute',
            top: { xs: 16, md: 24 },
            left: { xs: 16, md: 24 },
            zIndex: 1
          }}>
            <Box sx={{ filter: 'brightness(0) invert(1)' }}>
              <UConsultingLogo size="large" />
            </Box>
          </Box>

          {/* Overlay with Title */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            p: { xs: 3, md: 4 },
            zIndex: 1
          }}>
            <Typography variant="h2" component="h1" sx={{ 
              fontWeight: 700, 
              color: '#ffffff !important', 
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
            }}>
              Get to Know UC
            </Typography>
            <Typography variant="h6" sx={{ 
              color: '#ffffff !important', 
              maxWidth: 600,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              px: { xs: 2, md: 0 }
            }}>
              Connect with our members for 1:2 meetings to learn more about UConsulting and get your questions answered.
            </Typography>
          </Box>
        </Box>

        {/* Instructions */}
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body2">
                <strong>Important:</strong> You can only sign up for one meeting slot. If you've already signed up for a different time slot, you'll need to cancel that signup first by reaching out to uconsultingla@gmail.com.
              </Typography>
            </Alert>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {needsAccount && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setNeedsAccount(false)}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Don't have an account yet? Create one to track your application status and access more features!
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => window.open('/signup', '_blank')}
            sx={{ mt: 1 }}
          >
            Create Account
          </Button>
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* Available Slots */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3, color: 'primary.dark', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
              Available Meeting Slots
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : slots.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <ScheduleIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No Meeting Slots Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check back later for new meeting opportunities.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={{ xs: 1.5, md: 2 }}>
                {slots.map((slot) => (
                  <Card 
                    key={slot.id} 
                    variant="outlined"
                    sx={{ 
                      cursor: slot.remaining > 0 ? 'pointer' : 'default',
                      opacity: slot.remaining === 0 ? 0.6 : 1,
                      border: selectedSlot === slot.id ? 2 : 1,
                      borderColor: selectedSlot === slot.id ? 'primary.main' : 'divider',
                      '&:hover': slot.remaining > 0 ? {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      } : {}
                    }}
                    onClick={() => slot.remaining > 0 && setSelectedSlot(slot.id)}
                  >
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                      {/* Mobile-first layout */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'flex-start' },
                        gap: { xs: 2, sm: 0 },
                        mb: 2 
                      }}>
                        <Box sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600, 
                              mb: 1,
                              fontSize: { xs: '1.1rem', md: '1.25rem' },
                              lineHeight: 1.3
                            }}
                          >
                            {formatDateTime(slot.startTime)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PersonIcon sx={{ fontSize: { xs: 18, md: 16 }, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '0.875rem' } }}>
                              {slot.memberName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LocationIcon sx={{ fontSize: { xs: 18, md: 16 }, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '0.875rem' } }}>
                              {slot.location}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ 
                          textAlign: { xs: 'left', sm: 'right' },
                          alignSelf: { xs: 'flex-start', sm: 'flex-start' }
                        }}>
                          <Chip
                            label={slot.remaining === 0 ? 'Full' : `${slot.remaining} spots left`}
                            color={slot.remaining === 0 ? 'default' : 'primary'}
                            variant={slot.remaining === 0 ? 'outlined' : 'filled'}
                            size="small"
                            sx={{ fontSize: { xs: '0.75rem', md: '0.75rem' } }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                    {slot.remaining > 0 && (
                      <CardActions sx={{ 
                        justifyContent: 'center', 
                        pb: 2,
                        px: { xs: 2, md: 3 }
                      }}>
                        <Button
                          variant={selectedSlot === slot.id ? 'contained' : 'outlined'}
                          size="medium"
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlot(slot.id);
                          }}
                          sx={{
                            minHeight: { xs: 44, md: 36 }, // Larger touch target on mobile
                            fontSize: { xs: '0.9rem', md: '0.875rem' },
                            px: { xs: 3, md: 2 }
                          }}
                        >
                          {selectedSlot === slot.id ? 'Selected' : 'Select This Slot'}
                        </Button>
                      </CardActions>
                    )}
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Sign Up Form */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            position: { xs: 'static', md: 'sticky' }, 
            top: { xs: 'auto', md: 24 },
            mb: { xs: 2, md: 0 }
          }}>
            <Typography variant="h5" component="h2" sx={{ 
              fontWeight: 600, 
              mb: 3, 
              color: 'primary.dark',
              fontSize: { xs: '1.5rem', md: '1.75rem' }
            }}>
              Sign Up
            </Typography>

            {!selectedSlot ? (
              <Box sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                <PeopleIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ 
                  mb: 1,
                  fontSize: { xs: '1.1rem', md: '1.25rem' }
                }}>
                  Select a Meeting Slot
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.9rem', md: '0.875rem' }
                }}>
                  Choose an available time slot from the list to sign up for a meeting.
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Selected Slot Info */}
                {getSelectedSlotData() && (
                  <Box sx={{ 
                    mb: 3, 
                    p: { xs: 1.5, md: 2 }, 
                    bgcolor: 'primary.50', 
                    borderRadius: 2 
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600, 
                      mb: 1,
                      fontSize: { xs: '0.9rem', md: '0.875rem' }
                    }}>
                      Selected Meeting
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500,
                      fontSize: { xs: '0.9rem', md: '0.875rem' },
                      mb: 0.5
                    }}>
                      {formatDateTime(getSelectedSlotData().startTime)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      fontSize: { xs: '0.85rem', md: '0.875rem' },
                      lineHeight: 1.4
                    }}>
                      with {getSelectedSlotData().memberName} • {getSelectedSlotData().location}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ mb: 3 }} />

                {/* Sign Up Form */}
                <Box component="form" onSubmit={onSubmit}>
                  <Stack spacing={{ xs: 2.5, md: 3 }}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ color: 'text.secondary', mr: 1, fontSize: { xs: 20, md: 18 } }} />
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '1rem', md: '1rem' },
                          padding: { xs: '14px 14px 14px 0', md: '16px 14px 16px 0' }
                        }
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      placeholder="your.email@ucla.edu"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ color: 'text.secondary', mr: 1, fontSize: { xs: 20, md: 18 } }} />
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '1rem', md: '1rem' },
                          padding: { xs: '14px 14px 14px 0', md: '16px 14px 16px 0' }
                        }
                      }}
                    />

                    <TextField
                      fullWidth
                      label="UCLA Student ID"
                      placeholder="e.g., 123456789"
                      value={form.studentId}
                      onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                      required
                      InputProps={{
                        startAdornment: <SchoolIcon sx={{ color: 'text.secondary', mr: 1, fontSize: { xs: 20, md: 18 } }} />
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '1rem', md: '1rem' },
                          padding: { xs: '14px 14px 14px 0', md: '16px 14px 16px 0' }
                        }
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitting}
                      sx={{ 
                        mt: 2,
                        minHeight: { xs: 48, md: 44 },
                        fontSize: { xs: '1rem', md: '1rem' },
                        py: { xs: 1.5, md: 1.25 }
                      }}
                    >
                      {submitting ? 'Signing Up...' : 'Confirm Signup'}
                    </Button>
                  </Stack>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                  You will receive a confirmation email with meeting details.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
}


