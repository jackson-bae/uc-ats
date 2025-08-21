import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';
import '../styles/CandidateApplications.css';

export default function CandidateApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // This would need to be implemented on the backend to fetch applications for the current user
      // For now, we'll show a placeholder
      setApplications([]);
    } catch (e) {
      setError('Failed to load applications');
      console.error('Error fetching applications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="candidate-applications-container">
        <div className="loading">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-applications-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="candidate-applications-container">
      <div className="applications-header">
        <h1 className="applications-title">My Applications</h1>
        <p className="applications-subtitle">
          Track the status of your UConsulting applications
        </p>
      </div>

      <div className="applications-content">
        {applications.length === 0 ? (
          <div className="no-applications">
            <h2>No Applications Found</h2>
            <p>
              You haven't submitted any applications yet. Check back here once you've 
              applied to track your status.
            </p>
          </div>
        ) : (
          <div className="applications-list">
            {applications.map((application) => (
              <div key={application.id} className="application-card">
                <div className="application-header">
                  <h3>Application for {application.cycleName}</h3>
                  <span className={`status ${application.status.toLowerCase()}`}>
                    {application.status}
                  </span>
                </div>
                <div className="application-details">
                  <p><strong>Submitted:</strong> {new Date(application.submittedAt).toLocaleDateString()}</p>
                  <p><strong>Current Round:</strong> {application.currentRound || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
