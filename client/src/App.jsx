import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetail from './pages/ApplicationDetail';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import SignUp from './pages/SignUp';
import ApplicationCycleManager from './pages/ApplicationCycleManager';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import CandidateManagement from './pages/CandidateManagement';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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
          <UserDashboard />
        </ProtectedRoute>
      }/>

      <Route
        path="/admin"
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
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      
      
      <Route
        path="/application-cycles"
        element={
          <ProtectedRoute>
            <ApplicationCycleManager />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<NotFound />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

<Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}