import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  CssBaseline,
  Paper,
  TextField,
  ThemeProvider,
  Typography,
  Alert,
  createTheme,
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

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/404');
    }
  }, [token, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed');
      } else {
        setSuccess('Password updated successfully!');
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: '50%' }}>
          <LeftSection>
            <Typography variant="h1" sx={{ textAlign: 'center' }}>
              Reset Your Password
            </Typography>
            <Typography variant="h5" sx={{ color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', maxWidth: '400px' }}>
              Enter a new password to complete the reset process.
            </Typography>
          </LeftSection>
        </Box>

        <Box sx={{ width: '50%' }}>
          <RightSection>
            <Paper elevation={0} sx={{ p: 6, maxWidth: '400px', backgroundColor: 'transparent' }}>
              <Typography variant="h4" sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}>
                Set New Password
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleResetPassword}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  sx={{ mb: 4 }}
                />
                <Button type="submit" fullWidth variant="contained" size="large">
                  Update Password
                </Button>
              </Box>
            </Paper>
          </RightSection>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
