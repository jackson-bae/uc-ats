import { createTheme } from '@mui/material/styles';

// Official UConsulting brand theme
const authTheme = createTheme({
  palette: {
    primary: { 
      main: '#042742',      // Official UConsulting primary color
      light: '#063557',     // Slightly lighter for hover
      dark: '#031d2e',      // Darker for pressed state
    },
    secondary: { 
      main: '#0C74C1',      // Official UConsulting accent color
      light: '#5ba3e8',     
      dark: '#084a7d',      
    },
    background: { 
      default: '#ffffff',   // Clean white background
      paper: '#ffffff',     // White cards
    },
    text: {
      primary: '#042742',   // Official brand color for text
      secondary: '#64748b', // Gray text
    },
    error: {
      main: '#ef4444',      
      light: '#fee2e2',     
    },
    success: {
      main: '#10b981',      
      light: '#dcfce7',     
    },
    warning: {
      main: '#f59e0b',      
      light: '#fef3c7',     
    },
    info: {
      main: '#3b82f6',      
      light: '#eff6ff',     
    },
  },
  typography: {
    fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h3: { 
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 700,  // Montserrat Bold
      fontSize: '2rem',
      color: '#042742',
      textAlign: 'center',
    },
    h4: { 
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 700,  // Montserrat Bold for headings
      color: '#042742',
      textAlign: 'center',
    },
    h6: { 
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 700,  // Montserrat Bold for headings
      color: '#042742',
    },
    body1: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 300,  // Montserrat Light for body text
    },
    body2: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 300,  // Montserrat Light for body text
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',         
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          padding: '0.75rem 1.5rem',
          transition: 'all 0.2s ease',
        },
        contained: {
          backgroundColor: '#042742',     // Official UConsulting primary
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#063557',   // Lighter on hover
          },
        },
        text: {
          color: '#042742',
          '&:hover': {
            backgroundColor: 'rgba(4, 39, 66, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.5rem',       
            '&:hover fieldset': { 
              borderColor: '#042742',
            },
            '&.Mui-focused fieldset': { 
              borderColor: '#042742', 
              borderWidth: '2px',
            },
          },
          '& .MuiFormLabel-root': {
            color: '#64748b',             
            '&.Mui-focused': {
              color: '#042742',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',           
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
        },
      },
    },
  },
});

export default authTheme; 