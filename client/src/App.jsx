import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetail from './pages/ApplicationDetail';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import CandidateManagement from './pages/CandidateManagement';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './styles/variables.css';
// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <ApplicationList />
        </ProtectedRoute>
      }/>

      <Route
        path="/candidate-management"
        element={
          <ProtectedRoute>
            <CandidateManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/application-list"
        element={
          <ProtectedRoute>
            <ApplicationList />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/application/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        }
      />
      
    
      
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      );
};

export default function App() {
  // Apply global Montserrat Light for body, Montserrat Bold for headings
  useEffect(() => {
    document.body.style.fontFamily = 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
    document.body.style.fontWeight = '300'; // Montserrat Light as default body weight
    document.body.style.backgroundColor = '#ffffff'; // Clean white background
  }, []);

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}