import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  ThemeProvider,
  CssBaseline,
  Alert,
  Container,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import authTheme from '../styles/authTheme';
import UConsultingLogo from '../components/UConsultingLogo';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [graduationClass, setGraduationClass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, user, loading } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Don't render the signup form if user is already authenticated
  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return null; // Component will redirect via useEffect
  }

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !fullName || !graduationClass) {
      setError('All fields are required');
      return;
    }

    const result = await register({
      email,
      password,
      fullName,
      graduationClass
    });

    if (result.success) {
      navigate('/application-list');
    } else {
      setError(result.error);
    }
  };

  return (
    <ThemeProvider theme={authTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UConsultingLogo size="large" style={{ marginBottom: '1rem' }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              Join our Application Tracking System
            </Typography>
          </Box>
          
          <Paper sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 4 }}>
              Sign Up
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSignUp}>
              <TextField
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Graduation Class"
                value={graduationClass}
                onChange={(e) => setGraduationClass(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 4 }}
              />

              <Button type="submit" fullWidth variant="contained" size="large" sx={{ mb: 3 }}>
                Sign Up
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Already have an account?{' '}
                  <Button
                    onClick={() => navigate('/login')}
                    variant="text"
                    size="small"
                    sx={{ minWidth: 'auto', p: 0, textTransform: 'none' }}
                  >
                    Sign in here
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SignUp;
