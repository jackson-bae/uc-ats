import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetail from './pages/ApplicationDetail';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Layout from './components/Layout';
import CandidateLayout from './components/CandidateLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import CandidateManagement from './pages/CandidateManagement';
import CycleManagement from './pages/CycleManagement';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import ReviewTeams from './pages/ReviewTeams';
import UserManagement from './pages/UserManagement';
import EventManagement from './pages/EventManagement';
import CandidateEvents from './pages/CandidateEvents';
import CandidateApplications from './pages/CandidateApplications';
import InterviewPreparation from './pages/InterviewPreparation';
import Interviews from './pages/Interviews';
import InterviewDetail from './pages/InterviewDetail';
import './styles/variables.css';
// Protected Route wrapper for admin/member users
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Use different layouts based on user role
  if (user.role === 'USER') {
    return <CandidateLayout>{children}</CandidateLayout>;
  }
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Protected Routes - Different content based on user role */}
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === 'USER' ? <CandidateDashboard /> : <Dashboard />}
        </ProtectedRoute>
      } />

      {/* Admin/Member Routes */}
      <Route path="/candidate-management" element={<Navigate to="/application-list" />} />
      <Route
        path="/cycles"
        element={
          <ProtectedRoute>
            <CycleManagement />
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
      
      <Route
        path="/review-teams"
        element={
          <ProtectedRoute>
            <ReviewTeams />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/user-management"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            {user?.role === 'USER' ? <CandidateEvents /> : <EventManagement />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/interviews"
        element={
          <ProtectedRoute>
            <Interviews />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/interviews/:id"
        element={
          <ProtectedRoute>
            <InterviewDetail />
          </ProtectedRoute>
        }
      />
      
      {/* Candidate-specific routes */}
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <CandidateApplications />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/interview-prep"
        element={
          <ProtectedRoute>
            <InterviewPreparation />
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