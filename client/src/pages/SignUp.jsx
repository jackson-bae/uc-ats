import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
} from '@mui/material';
import styled from '@emotion/styled';
import { useAuth } from '../context/AuthContext';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
    background: { default: '#fafafa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '3.5rem' },
    h4: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '40px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1.1rem',
          padding: '12px 32px',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            transition: 'all 0.3s ease-in-out',
            '&:hover fieldset': { borderColor: '#1976d2' },
            '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: '2px' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

const LeftSection = styled(Box)(() => ({
  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: '2rem',
}));

const RightSection = styled(Box)(() => ({
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: '2rem',
}));

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: '50%' }}>
          <LeftSection>
            <Typography variant="h1" sx={{ mb: 2, textAlign: 'center' }}>
              UConsulting Application Tracker
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                fontWeight: 400,
                maxWidth: '400px',
              }}
            >
              Join us! Create your account to track club applications.
            </Typography>
          </LeftSection>
        </Box>

        <Box sx={{ width: '50%' }}>
          <RightSection>
            <Paper elevation={0} sx={{ p: 6, maxWidth: '400px', backgroundColor: 'transparent' }}>
              <Typography
                variant="h4"
                component="h3"
                sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}
              >
                Sign up
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSignUp} sx={{ width: '100%' }}>
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
                    <Typography
                      component="span"
                      onClick={() => navigate('/login')}
                      sx={{
                        color: 'primary.main',
                        cursor: 'pointer',
                        fontWeight: 600,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Sign in here
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </RightSection>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default SignUp;
