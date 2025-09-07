import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import '../styles/InterviewInterface.css';

export default function MemberInterviewInterface() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const interviewId = searchParams.get('interviewId');
  const groupIds = searchParams.get('groupIds')?.split(',') || [];
  
  const [interview, setInterview] = useState(null);
  const [applications, setApplications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const decisionOptions = [
    { value: 'YES', label: 'Yes', color: 'green' },
    { value: 'MAYBE_YES', label: 'Maybe-Yes', color: 'light-green' },
    { value: 'UNSURE', label: 'Unsure', color: 'yellow' },
    { value: 'MAYBE_NO', label: 'Maybe-No', color: 'orange' },
    { value: 'NO', label: 'No', color: 'red' }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('Loading interview data for:', { interviewId, groupIds });
        console.log('URL search params:', searchParams.toString());
        console.log('Parsed groupIds:', groupIds);
        
        // Check if we have required parameters
        if (!interviewId) {
          throw new Error('No interview ID provided');
        }
        if (!groupIds || groupIds.length === 0) {
          console.warn('No group IDs provided, will show empty applications list');
          setApplications([]);
          setLoading(false);
          return;
        }
        
        // Load current user first to check authentication
        console.log('Loading current user...');
        const userRes = await apiClient.get('/member/profile');
        console.log('Current user:', userRes);
        setCurrentUser(userRes);
        
        // Load interview details
        console.log('Loading interview details...');
        const interviewRes = await apiClient.get(`/member/interviews/${interviewId}`);
        console.log('Interview data loaded:', interviewRes);
        setInterview(interviewRes);
        
        // Load applications for selected groups
        console.log('Loading applications for groups:', groupIds);
        try {
          const applicationsRes = await apiClient.get(`/member/interviews/${interviewId}/applications?groupIds=${groupIds.join(',')}`);
          console.log('Applications loaded:', applicationsRes);
          setApplications(applicationsRes);
        } catch (appError) {
          console.error('Failed to load applications:', appError);
          setApplications([]);
        }
        
        // Load existing evaluations
        console.log('Loading existing evaluations...');
        try {
          const evaluationsRes = await apiClient.get(`/member/evaluations?interviewId=${interviewId}`);
          console.log('Evaluations loaded:', evaluationsRes);
          
          // Convert evaluations array to object keyed by application ID
          const evaluationsObj = {};
          evaluationsRes.forEach(evaluation => {
            evaluationsObj[evaluation.applicationId] = evaluation;
          });
          setEvaluations(evaluationsObj);
        } catch (evaluationError) {
          console.error('Failed to load evaluations:', evaluationError);
          setEvaluations({});
        }
        
      } catch (error) {
        console.error('Failed to load interview data:', error);
        alert('Failed to load interview data: ' + error.message);
        navigate('/assigned-interviews');
      } finally {
        setLoading(false);
      }
    };

    if (interviewId && groupIds.length > 0) {
      loadData();
    } else {
      console.log('Missing required parameters:', { interviewId, groupIds });
      setLoading(false);
    }
  }, [interviewId, groupIds.join(','), navigate]);

  const handleDecisionChange = (applicationId, decision) => {
    setEvaluations(prev => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        decision
      }
    }));

    // Auto-save after a delay
    clearTimeout(autoSaveTimeouts[applicationId]);
    const timeout = setTimeout(() => {
      saveEvaluation(applicationId);
    }, 1000);
    setAutoSaveTimeouts(prev => ({
      ...prev,
      [applicationId]: timeout
    }));
  };

  const handleNotesChange = (applicationId, notes) => {
    setEvaluations(prev => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        notes
      }
    }));

    // Auto-save after a delay
    clearTimeout(autoSaveTimeouts[applicationId]);
    const timeout = setTimeout(() => {
      saveEvaluation(applicationId);
    }, 2000);
    setAutoSaveTimeouts(prev => ({
      ...prev,
      [applicationId]: timeout
    }));
  };

  const saveEvaluation = async (applicationId) => {
    try {
      setSaving(true);
      setSaveStatus(prev => ({ ...prev, [applicationId]: 'saving' }));

      const evaluation = evaluations[applicationId];
      if (!evaluation) return;

      const payload = {
        interviewId,
        applicationId,
        decision: evaluation.decision,
        notes: evaluation.notes || '',
        evaluatorId: currentUser.id
      };

      await apiClient.post('/member/evaluations', payload);
      
      // Auto-save completed successfully - no visual feedback needed

    } catch (error) {
      console.error('Failed to save evaluation:', error);
      setSaveStatus(prev => ({ ...prev, [applicationId]: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const getSaveStatusIcon = (applicationId) => {
    const status = saveStatus[applicationId];
    switch (status) {
      case 'saving':
        return <div className="save-indicator saving">Saving...</div>;
      case 'error':
        return <div className="save-indicator error">Error</div>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="interview-interface-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interview data...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="interview-interface-container">
        <div className="error-state">
          <h2>Interview not found</h2>
          <p>The interview you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/assigned-interviews')}
          >
            <ArrowLeftIcon className="btn-icon" />
            Back to Assigned Interviews
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-interface-container">
      {/* Header */}
      <div className="interview-header">
        <button 
          className="back-button"
          onClick={() => navigate('/assigned-interviews')}
        >
          <ArrowLeftIcon className="back-icon" />
          Back to Assigned Interviews
        </button>
        
        <div className="interview-info">
          <h1>{interview.title}</h1>
          <p className="interview-subtitle">
            {interview.interviewType?.replace(/_/g, ' ')} • {applications.length} candidates
          </p>
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-container">
        {applications.length === 0 ? (
          <div className="no-applications">
            <UserIcon className="empty-icon" />
            <h3>No candidates assigned</h3>
            <p>No candidates have been assigned to the selected groups for this interview.</p>
          </div>
        ) : (
          <div className="applications-grid">
            {applications.map((application) => {
              const evaluation = evaluations[application.id] || {};
              
              return (
                <div key={application.id} className="application-card">
                  <div className="application-header">
                    <div className="candidate-info">
                      <h3>{application.name}</h3>
                      <p className="candidate-details">
                        {application.major} • Class of {application.year}
                      </p>
                    </div>
                    {getSaveStatusIcon(application.id)}
                  </div>

                  {/* Decision Buttons */}
                  <div className="decision-section">
                    <h4>Decision</h4>
                    <div className="decision-buttons">
                      {decisionOptions.map((option) => (
                        <button
                          key={option.value}
                          className={`decision-btn ${option.color} ${
                            evaluation.decision === option.value ? 'selected' : ''
                          }`}
                          onClick={() => handleDecisionChange(application.id, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="notes-section">
                    <h4>Notes</h4>
                    <textarea
                      className="notes-textarea"
                      placeholder="Add your evaluation notes here..."
                      value={evaluation.notes || ''}
                      onChange={(e) => handleNotesChange(application.id, e.target.value)}
                    />
                  </div>

                  {/* Documents Section */}
                  <div className="documents-section">
                    <h4>Documents</h4>
                    <div className="document-links">
                      {application.resumeUrl && (
                        <a 
                          href={application.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          <DocumentTextIcon className="document-icon" />
                          Resume
                        </a>
                      )}
                      {application.coverLetterUrl && (
                        <a 
                          href={application.coverLetterUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          <DocumentTextIcon className="document-icon" />
                          Cover Letter
                        </a>
                      )}
                      {application.videoUrl && (
                        <a 
                          href={application.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          <DocumentTextIcon className="document-icon" />
                          Video
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
