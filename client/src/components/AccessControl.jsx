import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, Paper, Typography } from '@mui/material';

const AccessControl = ({ 
  children, 
  allowedRoles = [], 
  fallbackMessage = "Access Denied",
  fallbackDescription = "You don't have permission to access this page."
}) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Not Logged In
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please log in to access this page.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {fallbackMessage}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {fallbackDescription} Current role: {user.role}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return children;
};

export default AccessControl;
