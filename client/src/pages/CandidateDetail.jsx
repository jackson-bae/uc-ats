import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import '../styles/CandidateDetail.css';

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const data = await apiClient.get(`/admin/candidates/comprehensive`);
        const foundCandidate = data.find(c => c.id === id);
        if (foundCandidate) {
          setCandidate(foundCandidate);
        } else {
          setError('Candidate not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id]);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="candidate-detail">
        <div className="loading-state">Loading candidate details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-detail">
        <div className="error-state">Error: {error}</div>
        <Link to="/candidate-list" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Candidates
        </Link>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="candidate-detail">
        <div className="error-state">Candidate not found</div>
        <Link to="/candidate-list" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Candidates
        </Link>
      </div>
    );
  }

  return (
    <div className="candidate-detail">
      {/* Header */}
      <div className="candidate-detail-header">
        <Link to="/candidate-list" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Candidates
        </Link>
        <h1 className="page-title">Candidate Details</h1>
      </div>

      {/* Candidate Info Card */}
      <div className="candidate-info-card">
        <div className="candidate-profile">
          {candidate.applications && candidate.applications.length > 0 && candidate.applications[0].headshotUrl ? (
            <AuthenticatedImage
              src={candidate.applications[0].headshotUrl}
              alt={`${candidate.firstName} ${candidate.lastName}`}
              className="candidate-avatar-large"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div className="candidate-avatar-large-fallback">
              {getInitials(candidate.firstName, candidate.lastName)}
            </div>
          )}
          <div className="candidate-basic-info">
            <h2 className="candidate-name">{candidate.firstName} {candidate.lastName}</h2>
            <p className="candidate-email">{candidate.email}</p>
            <p className="candidate-student-id">Student ID: {candidate.studentId}</p>
            <div className="candidate-status">
              <span className={`status-badge ${candidate.applications && candidate.applications.length > 0 ? 'applied' : 'not_applied'}`}>
                {candidate.applications && candidate.applications.length > 0 ? 'APPLIED' : 'NOT APPLIED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="details-grid">
        {/* Applications Section */}
        <div className="detail-section">
          <h3 className="section-title">Applications ({candidate.applications?.length || 0})</h3>
          {candidate.applications && candidate.applications.length > 0 ? (
            <div className="applications-list">
              {candidate.applications.map((application, index) => (
                <div key={application.id} className="application-item">
                  <div className="application-header">
                    <span className="application-status">{application.status}</span>
                    <span className="application-date">{formatDate(application.submittedAt)}</span>
                  </div>
                  <div className="application-details">
                    <p><strong>Major:</strong> {application.major1} {application.major2 && `, ${application.major2}`}</p>
                    <p><strong>Graduation Year:</strong> {application.graduationYear}</p>
                    <p><strong>GPA:</strong> {application.cumulativeGpa}</p>
                    <p><strong>Transfer Student:</strong> {application.isTransferStudent ? 'Yes' : 'No'}</p>
                    <p><strong>First Generation:</strong> {application.isFirstGeneration ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No applications found</p>
          )}
        </div>

        {/* Group Assignment Section */}
        <div className="detail-section">
          <h3 className="section-title">Group Assignment</h3>
          {candidate.assignedGroup ? (
            <div className="group-info">
              <p><strong>Group ID:</strong> {candidate.assignedGroup.id}</p>
              <p><strong>Created:</strong> {formatDate(candidate.assignedGroup.createdAt)}</p>
            </div>
          ) : (
            <p className="no-data">Not assigned to any group</p>
          )}
        </div>

        {/* Event Attendance Section */}
        <div className="detail-section">
          <h3 className="section-title">Event Attendance ({candidate.eventAttendance?.length || 0})</h3>
          {candidate.eventAttendance && candidate.eventAttendance.length > 0 ? (
            <div className="events-list">
              {candidate.eventAttendance.map((attendance, index) => (
                <div key={attendance.id} className="event-item">
                  <p><strong>{attendance.event.eventName}</strong></p>
                  <p className="event-date">{formatDate(attendance.event.eventStartDate)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No event attendance recorded</p>
          )}
        </div>

        {/* Event RSVP Section */}
        <div className="detail-section">
          <h3 className="section-title">Event RSVPs ({candidate.eventRsvp?.length || 0})</h3>
          {candidate.eventRsvp && candidate.eventRsvp.length > 0 ? (
            <div className="events-list">
              {candidate.eventRsvp.map((rsvp, index) => (
                <div key={rsvp.id} className="event-item">
                  <p><strong>{rsvp.event.eventName}</strong></p>
                  <p className="event-date">{formatDate(rsvp.event.eventStartDate)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No event RSVPs recorded</p>
          )}
        </div>

        {/* System Info Section */}
        <div className="detail-section">
          <h3 className="section-title">System Information</h3>
          <div className="system-info">
            <p><strong>Created:</strong> {formatDate(candidate.createdAt)}</p>
            <p><strong>Last Updated:</strong> {formatDate(candidate.updatedAt)}</p>
            <p><strong>Candidate ID:</strong> {candidate.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
