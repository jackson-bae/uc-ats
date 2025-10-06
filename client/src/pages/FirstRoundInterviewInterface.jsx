import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AccessControl from '../components/AccessControl';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import AuthenticatedImage from '../components/AuthenticatedImage';
import '../styles/FirstRoundInterviewInterface.css';

export default function FirstRoundInterviewInterface() {
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
  const [currentPage, setCurrentPage] = useState(0); // 0 = behavioral, 1 = market sizing
  const [preview, setPreview] = useState({ open: false, src: '', kind: '', title: '' });

  const decisionOptions = [
    { value: 'YES', label: 'Yes', color: 'green' },
    { value: 'MAYBE_YES', label: 'Maybe-Yes', color: 'light-green' },
    { value: 'MAYBE_NO', label: 'Maybe-No', color: 'orange' },
    { value: 'NO', label: 'No', color: 'red' }
  ];

  const scoreOptions = [1, 2, 3, 4, 5];

  const pageTitles = [
    { title: 'Behavioral Assessment', subtitle: 'Leadership, Problem Solving & Interest' },
    { title: 'Market Sizing Assessment', subtitle: 'Teamwork, Logic & Creativity' },
    { title: 'Final Decision', subtitle: 'Overall Assessment & Decision' }
  ];

  const handlePageChange = async (newPage) => {
    if (newPage >= 0 && newPage < pageTitles.length) {
      // Auto-save current evaluations before changing pages
      await saveAllEvaluations();
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('=== FIRST ROUND INTERVIEW INTERFACE LOADING ===');
        console.log('Loading first round interview data for:', { interviewId, groupIds });
        console.log('Current URL:', window.location.href);
        
        if (!interviewId) {
          throw new Error('No interview ID provided');
        }
        if (!groupIds || groupIds.length === 0) {
          console.warn('No group IDs provided, will show empty applications list');
          setApplications([]);
          setLoading(false);
          return;
        }
        
        // Load current user (try both admin and member endpoints)
        console.log('Loading current user...');
        let userRes;
        let isAdmin = false;
        try {
          userRes = await apiClient.get('/admin/profile');
          isAdmin = true;
          console.log('Current user (admin):', userRes);
        } catch (adminError) {
          try {
            userRes = await apiClient.get('/member/profile');
            isAdmin = false;
            console.log('Current user (member):', userRes);
          } catch (memberError) {
            throw new Error('Failed to load user profile');
          }
        }
        setCurrentUser(userRes);
        
        // Load interview details
        console.log('Loading interview details...');
        const interviewRes = isAdmin 
          ? await apiClient.get(`/admin/interviews/${interviewId}`)
          : await apiClient.get(`/member/interviews/${interviewId}`);
        console.log('Interview data loaded:', interviewRes);
        setInterview(interviewRes);
        
        // Load applications for selected groups
        console.log('Loading applications for groups:', groupIds);
        try {
          const applicationsRes = isAdmin
            ? await apiClient.get(`/admin/interviews/${interviewId}/applications?groupIds=${groupIds.join(',')}`)
            : await apiClient.get(`/member/interviews/${interviewId}/applications?groupIds=${groupIds.join(',')}`);
          console.log('Applications loaded:', applicationsRes);
          console.log('First application structure:', applicationsRes[0]);
          console.log('Application fields:', applicationsRes[0] ? Object.keys(applicationsRes[0]) : 'No applications');
          setApplications(applicationsRes);
        } catch (appError) {
          console.error('Failed to load applications:', appError);
          setApplications([]);
        }
        
        // Load existing evaluations
        console.log('Loading existing evaluations...');
        try {
          const evaluationsRes = isAdmin
            ? await apiClient.get(`/admin/evaluations?interviewId=${interviewId}`)
            : await apiClient.get(`/member/evaluations?interviewId=${interviewId}`);
          console.log('Evaluations loaded:', evaluationsRes);
          
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

  const getEvaluation = (applicationId) => {
    const evaluation = evaluations[applicationId] || {};
    
    return {
      notes: evaluation.notes || '',
      decision: evaluation.decision || null,
      behavioralLeadership: evaluation.behavioralLeadership || null,
      behavioralProblemSolving: evaluation.behavioralProblemSolving || null,
      behavioralInterest: evaluation.behavioralInterest || null,
      behavioralTotal: evaluation.behavioralTotal || null,
      marketSizingTeamwork: evaluation.marketSizingTeamwork || null,
      marketSizingLogic: evaluation.marketSizingLogic || null,
      marketSizingCreativity: evaluation.marketSizingCreativity || null,
      marketSizingTotal: evaluation.marketSizingTotal || null,
      behavioralNotes: evaluation.behavioralNotes || '',
      marketSizingNotes: evaluation.marketSizingNotes || '',
      additionalNotes: evaluation.additionalNotes || ''
    };
  };

  const updateEvaluation = (applicationId, updates) => {
    setEvaluations(prev => ({
      ...prev,
      [applicationId]: {
        ...getEvaluation(applicationId),
        ...updates
      }
    }));
    scheduleAutoSave(applicationId);
  };

  const updateBehavioralScore = (applicationId, field, value) => {
    const evaluation = getEvaluation(applicationId);
    const newScores = {
      ...evaluation,
      [field]: value
    };
    
    // Calculate behavioral total
    const leadership = newScores.behavioralLeadership || 0;
    const problemSolving = newScores.behavioralProblemSolving || 0;
    const interest = newScores.behavioralInterest || 0;
    newScores.behavioralTotal = leadership + problemSolving + interest;
    
    updateEvaluation(applicationId, newScores);
  };

  const updateMarketSizingScore = (applicationId, field, value) => {
    const evaluation = getEvaluation(applicationId);
    const newScores = {
      ...evaluation,
      [field]: value
    };
    
    // Calculate market sizing total
    const teamwork = newScores.marketSizingTeamwork || 0;
    const logic = newScores.marketSizingLogic || 0;
    const creativity = newScores.marketSizingCreativity || 0;
    newScores.marketSizingTotal = teamwork + logic + creativity;
    
    updateEvaluation(applicationId, newScores);
  };

  const scheduleAutoSave = (applicationId) => {
    if (autoSaveTimeouts[applicationId]) {
      clearTimeout(autoSaveTimeouts[applicationId]);
    }

    const timeoutId = setTimeout(() => {
      autoSaveEvaluation(applicationId);
    }, 2000);

    setAutoSaveTimeouts(prev => ({
      ...prev,
      [applicationId]: timeoutId
    }));
  };

  const autoSaveEvaluation = async (applicationId) => {
    try {
      const evaluation = getEvaluation(applicationId);
      
      // Determine if user is admin or member based on current user data
      const isAdmin = currentUser?.role === 'ADMIN';
      const endpoint = isAdmin ? `/admin/interviews/${interviewId}/evaluations` : '/member/evaluations';
      
      await apiClient.post(endpoint, {
        interviewId,
        applicationId,
        decision: evaluation.decision,
        notes: evaluation.notes,
        behavioralLeadership: evaluation.behavioralLeadership,
        behavioralProblemSolving: evaluation.behavioralProblemSolving,
        behavioralInterest: evaluation.behavioralInterest,
        behavioralTotal: evaluation.behavioralTotal,
        marketSizingTeamwork: evaluation.marketSizingTeamwork,
        marketSizingLogic: evaluation.marketSizingLogic,
        marketSizingCreativity: evaluation.marketSizingCreativity,
        marketSizingTotal: evaluation.marketSizingTotal,
        behavioralNotes: evaluation.behavioralNotes,
        marketSizingNotes: evaluation.marketSizingNotes,
        additionalNotes: evaluation.additionalNotes
      });
      
      // Auto-save completed successfully - no visual feedback needed
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus(prev => ({
        ...prev,
        [applicationId]: { type: 'error', message: 'Auto-save failed', timestamp: Date.now() }
      }));
    }
  };

  const saveEvaluation = async (applicationId) => {
    try {
      setSaving(true);
      const evaluation = getEvaluation(applicationId);
      
      // Determine if user is admin or member based on current user data
      const isAdmin = currentUser?.role === 'ADMIN';
      const endpoint = isAdmin ? `/admin/interviews/${interviewId}/evaluations` : '/member/evaluations';
      
      await apiClient.post(endpoint, {
        interviewId,
        applicationId,
        decision: evaluation.decision,
        notes: evaluation.notes,
        behavioralLeadership: evaluation.behavioralLeadership,
        behavioralProblemSolving: evaluation.behavioralProblemSolving,
        behavioralInterest: evaluation.behavioralInterest,
        behavioralTotal: evaluation.behavioralTotal,
        marketSizingTeamwork: evaluation.marketSizingTeamwork,
        marketSizingLogic: evaluation.marketSizingLogic,
        marketSizingCreativity: evaluation.marketSizingCreativity,
        marketSizingTotal: evaluation.marketSizingTotal,
        behavioralNotes: evaluation.behavioralNotes,
        marketSizingNotes: evaluation.marketSizingNotes,
        additionalNotes: evaluation.additionalNotes
      });
      
      alert('Evaluation saved successfully');
    } catch (error) {
      console.error('Failed to save evaluation:', error);
      alert('Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const saveAllEvaluations = async () => {
    try {
      setSaving(true);
      
      // Determine if user is admin or member based on current user data
      const isAdmin = currentUser?.role === 'ADMIN';
      const endpoint = isAdmin ? `/admin/interviews/${interviewId}/evaluations` : '/member/evaluations';
      
      const promises = applications.map(app => {
        const evaluation = getEvaluation(app.id);
        return apiClient.post(endpoint, {
          interviewId,
          applicationId: app.id,
          decision: evaluation.decision,
          notes: evaluation.notes,
          behavioralLeadership: evaluation.behavioralLeadership,
          behavioralProblemSolving: evaluation.behavioralProblemSolving,
          behavioralInterest: evaluation.behavioralInterest,
          behavioralTotal: evaluation.behavioralTotal,
          marketSizingTeamwork: evaluation.marketSizingTeamwork,
          marketSizingLogic: evaluation.marketSizingLogic,
          marketSizingCreativity: evaluation.marketSizingCreativity,
          marketSizingTotal: evaluation.marketSizingTotal,
          behavioralNotes: evaluation.behavioralNotes,
          marketSizingNotes: evaluation.marketSizingNotes,
          additionalNotes: evaluation.additionalNotes
        });
      });
      
      await Promise.all(promises);
      return true; // Return success status instead of showing alert
    } catch (error) {
      console.error('Failed to save evaluations:', error);
      alert('Failed to save evaluations');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const finishInterview = async () => {
    try {
      // Save all evaluations first
      const saved = await saveAllEvaluations();
      if (saved) {
        alert('Interview completed successfully! All evaluations have been saved.');
        navigate('/assigned-interviews');
      }
    } catch (error) {
      console.error('Failed to finish interview:', error);
      alert('Failed to complete interview');
    }
  };

  if (loading) {
    return (
      <div className="first-round-interview-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interview data...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="first-round-interview-container">
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
    <AccessControl allowedRoles={['ADMIN', 'MEMBER']}>
      <div className="first-round-interview-container">
        {/* Back Button - Outside Header */}
        <div className="back-button-container">
          <button 
            className="back-button"
            onClick={() => navigate('/assigned-interviews')}
          >
            <ArrowLeftIcon className="back-icon" />
            Back to Assigned Interviews
          </button>
        </div>

        {/* Header */}
        <div className="interview-header">
          
          <div className="interview-info">
            <h1>{interview.title}</h1>
            <p className="interview-subtitle">
              First Round Interview • {applications.length} candidates
            </p>
            <div className="page-info">
              <h2 className="current-page-title">{pageTitles[currentPage].title}</h2>
              <p className="current-page-subtitle">{pageTitles[currentPage].subtitle}</p>
            </div>
          </div>
          
          <div className="header-actions">
            {currentPage === pageTitles.length - 1 ? (
              <button 
                className="btn-finish"
                onClick={finishInterview}
                disabled={saving}
              >
                <CheckIcon className="btn-icon" />
                {saving ? 'Saving...' : 'Finish Interview'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Section Navigation */}
        <div className="section-navigation">
          <div className="pagination-controls">
            <button 
              className="page-nav-btn prev-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeftIcon className="nav-arrow" />
              <span>Previous Section</span>
            </button>
            <div className="page-indicator">
              <span className="page-label">Section</span>
              <span className="page-number">{currentPage + 1}</span>
              <span className="page-separator">of</span>
              <span className="total-pages">{pageTitles.length}</span>
            </div>
            <button 
              className="page-nav-btn next-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pageTitles.length - 1}
            >
              <span>Next Section</span>
              <ChevronRightIcon className="nav-arrow" />
            </button>
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
                const evaluation = getEvaluation(application.id);
                console.log('Rendering application:', application.name, {
                  headshotUrl: application.headshotUrl,
                  resumeUrl: application.resumeUrl,
                  coverLetterUrl: application.coverLetterUrl,
                  videoUrl: application.videoUrl
                });
                
                return (
                  <div key={application.id} className="application-card">
                    {/* Candidate Header */}
                    <div className="candidate-header">
                      <div className="candidate-info">
                        <div className="candidate-avatar">
                          {application.headshotUrl ? (
                            <AuthenticatedImage
                              src={application.headshotUrl}
                              alt={application.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            console.log('No headshot URL for:', application.name)
                          )}
                          <UserIcon 
                            className="avatar-icon" 
                            style={{ display: application.headshotUrl ? 'none' : 'flex' }}
                          />
                        </div>
                        <div className="candidate-details">
                          <h3>{application.name}</h3>
                          <p className="candidate-meta">
                            {application.major} • Class of {application.year}
                          </p>
                        </div>
                      </div>
                      <div className="candidate-actions">
                        <div className="documents-section">
                          <h4>Documents</h4>
                          {console.log('Documents section rendering for:', application.name)}
                          <div className="document-links">
                            {console.log('Document URLs check:', {
                              resume: application.resumeUrl,
                              coverLetter: application.coverLetterUrl,
                              video: application.videoUrl
                            })}
                            
                            {/* Resume Button */}
                            <button 
                              className="document-btn"
                              style={{ 
                                color: '#2563eb',
                                backgroundColor: 'white',
                                border: '2px solid #2563eb'
                              }}
                              onClick={() => {
                                console.log('Opening resume:', application.resumeUrl);
                                if (application.resumeUrl) {
                                  setPreview({ 
                                    open: true, 
                                    src: application.resumeUrl, 
                                    kind: 'pdf', 
                                    title: `${application.name} – Resume` 
                                  });
                                } else {
                                  alert('No resume available');
                                }
                              }}
                            >
                              <DocumentTextIcon className="btn-icon" style={{ color: '#2563eb' }} />
                              Resume
                            </button>
                            
                            {/* Cover Letter Button */}
                            <button 
                              className="document-btn"
                              style={{ 
                                color: '#2563eb',
                                backgroundColor: 'white',
                                border: '2px solid #2563eb'
                              }}
                              onClick={() => {
                                console.log('Opening cover letter:', application.coverLetterUrl);
                                if (application.coverLetterUrl) {
                                  setPreview({ 
                                    open: true, 
                                    src: application.coverLetterUrl, 
                                    kind: 'pdf', 
                                    title: `${application.name} – Cover Letter` 
                                  });
                                } else {
                                  alert('No cover letter available');
                                }
                              }}
                            >
                              <DocumentTextIcon className="btn-icon" style={{ color: '#2563eb' }} />
                              Cover Letter
                            </button>
                            
                            {/* Video Button */}
                            <button 
                              className="document-btn"
                              style={{ 
                                color: '#2563eb',
                                backgroundColor: 'white',
                                border: '2px solid #2563eb'
                              }}
                              onClick={() => {
                                console.log('Opening video:', application.videoUrl);
                                if (application.videoUrl) {
                                  setPreview({ 
                                    open: true, 
                                    src: application.videoUrl, 
                                    kind: 'video', 
                                    title: `${application.name} – Video` 
                                  });
                                } else {
                                  alert('No video available');
                                }
                              }}
                            >
                              <EyeIcon className="btn-icon" style={{ color: '#2563eb' }} />
                              Video
                            </button>
                          </div>
                        </div>
                        {saveStatus[application.id] && saveStatus[application.id].type === 'error' && (
                          <div className={`save-status ${saveStatus[application.id].type}`}>
                            {saveStatus[application.id].message}
                          </div>
                        )}
                        <button 
                          className="save-btn"
                          onClick={() => saveEvaluation(application.id)}
                          disabled={saving}
                        >
                          <CheckIcon className="btn-icon" />
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Evaluation Content */}
                    <div className="evaluation-content">
                      {/* Behavioral Page */}
                      {currentPage === 0 && (
                        <div className="assessment-page">
                          <div className="rubric-section">
                            <div className="rubric-header">
                              <h4>Behavioral Assessment</h4>
                              <div className="rubric-total">
                                Total: <span className="total-score">{evaluation.behavioralTotal || 0}</span>
                              </div>
                            </div>
                            <div className="score-grid">
                              <div className="score-item">
                                <label>Leadership</label>
                                <select 
                                  value={evaluation.behavioralLeadership || ''}
                                  onChange={(e) => updateBehavioralScore(application.id, 'behavioralLeadership', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="score-item">
                                <label>Problem Solving</label>
                                <select 
                                  value={evaluation.behavioralProblemSolving || ''}
                                  onChange={(e) => updateBehavioralScore(application.id, 'behavioralProblemSolving', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="score-item">
                                <label>Interest</label>
                                <select 
                                  value={evaluation.behavioralInterest || ''}
                                  onChange={(e) => updateBehavioralScore(application.id, 'behavioralInterest', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="notes-section">
                            <div className="notes-card">
                              <h4>Behavioral Notes</h4>
                              <textarea
                                className="notes-textarea"
                                placeholder="Add behavioral notes here..."
                                value={evaluation.behavioralNotes || ''}
                                onChange={(e) => updateEvaluation(application.id, { behavioralNotes: e.target.value })}
                                rows={6}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Market Sizing Page */}
                      {currentPage === 1 && (
                        <div className="assessment-page">
                          <div className="rubric-section">
                            <div className="rubric-header">
                              <h4>Market Sizing Assessment</h4>
                              <div className="rubric-total">
                                Total: <span className="total-score">{evaluation.marketSizingTotal || 0}</span>
                              </div>
                            </div>
                            <div className="score-grid">
                              <div className="score-item">
                                <label>Teamwork</label>
                                <select 
                                  value={evaluation.marketSizingTeamwork || ''}
                                  onChange={(e) => updateMarketSizingScore(application.id, 'marketSizingTeamwork', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="score-item">
                                <label>Logic</label>
                                <select 
                                  value={evaluation.marketSizingLogic || ''}
                                  onChange={(e) => updateMarketSizingScore(application.id, 'marketSizingLogic', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="score-item">
                                <label>Creativity</label>
                                <select 
                                  value={evaluation.marketSizingCreativity || ''}
                                  onChange={(e) => updateMarketSizingScore(application.id, 'marketSizingCreativity', parseInt(e.target.value) || null)}
                                  className="score-select"
                                >
                                  <option value="">-</option>
                                  {scoreOptions.map(score => (
                                    <option key={score} value={score}>{score}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="notes-section">
                            <div className="notes-card">
                              <h4>Market Sizing Notes</h4>
                              <textarea
                                className="notes-textarea"
                                placeholder="Add market sizing notes here..."
                                value={evaluation.marketSizingNotes || ''}
                                onChange={(e) => updateEvaluation(application.id, { marketSizingNotes: e.target.value })}
                                rows={6}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Final Decision Page */}
                      {currentPage === 2 && (
                        <div className="assessment-page">
                          <div className="decision-section">
                            <div className="decision-container">
                              <h4>Final Decision</h4>
                              <p className="decision-description">
                                Based on your assessment of the candidate's behavioral and market sizing performance, make your final decision.
                              </p>
                              <div className="decision-buttons">
                                {decisionOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    className={`decision-btn ${option.color} ${
                                      evaluation.decision === option.value ? 'selected' : ''
                                    }`}
                                    onClick={() => updateEvaluation(application.id, { decision: option.value })}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="summary-section">
                              <h4>Assessment Summary</h4>
                              <div className="summary-grid">
                                <div className="summary-item">
                                  <span className="summary-label">Behavioral Total:</span>
                                  <span className="summary-value">{evaluation.behavioralTotal || 0}/15</span>
                                </div>
                                <div className="summary-item">
                                  <span className="summary-label">Market Sizing Total:</span>
                                  <span className="summary-value">{evaluation.marketSizingTotal || 0}/15</span>
                                </div>
                                <div className="summary-item">
                                  <span className="summary-label">Combined Score:</span>
                                  <span className="summary-value total-combined">
                                    {(evaluation.behavioralTotal || 0) + (evaluation.marketSizingTotal || 0)}/30
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {preview.open && (
        <DocumentPreviewModal
          onClose={() => setPreview({ open: false, src: '', kind: '', title: '' })}
          src={preview.src}
          kind={preview.kind}
          title={preview.title}
        />
      )}
    </AccessControl>
  );
}
