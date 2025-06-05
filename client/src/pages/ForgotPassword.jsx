import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
} from '@mui/material';
import styled from '@emotion/styled';

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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      console.log(data); // optional: to verify response
      setSubmitted(true);
    } catch (err) {
      console.error('Error sending reset request:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: '50%' }}>
          <LeftSection>
            <Typography variant="h1" sx={{ mb: 2, textAlign: 'center' }}>
              Club Application Tracker
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
              Forgot your password? No worries—reset it here.
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
                Forgot Password
              </Typography>

              {submitted ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  If an account with that email exists, a reset link will be sent.
                </Alert>
              ) : (
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 4 }}
                  />

                  <Button type="submit" fullWidth variant="contained" size="large">
                    Send Reset Link
                  </Button>

                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Remember your password?{' '}
                      <Typography
                        component="span"
                        onClick={() => navigate('/login')}
                        sx={{
                          color: 'primary.main',
                          cursor: 'pointer',
                          fontWeight: 600,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        Sign in here
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </RightSection>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
