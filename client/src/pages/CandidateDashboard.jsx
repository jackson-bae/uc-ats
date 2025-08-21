import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/CandidateDashboard.css';

export default function CandidateDashboard() {
  const { user } = useAuth();

  return (
    <div className="candidate-dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome, {user?.fullName}!</h1>
        <p className="dashboard-subtitle">
          Welcome to the UConsulting Application Tracking System. Here you can view events, 
          track your application status, and prepare for interviews.
        </p>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-cards">
            <div className="action-card">
              <h3>View Events</h3>
              <p>Check out upcoming UConsulting events and RSVP to attend.</p>
            </div>
            <div className="action-card">
              <h3>Application Status</h3>
              <p>Track the status of your application and view feedback.</p>
            </div>
            <div className="action-card">
              <h3>Interview Prep</h3>
              <p>Access resources to help you prepare for interviews.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
