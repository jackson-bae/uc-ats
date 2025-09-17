import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
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

  const decisionOptions = [
    { value: 'YES', label: 'Yes', color: 'green' },
    { value: 'MAYBE_YES', label: 'Maybe-Yes', color: 'light-green' },
    { value: 'UNSURE', label: 'Unsure', color: 'yellow' },
    { value: 'MAYBE_NO', label: 'Maybe-No', color: 'orange' },
    { value: 'NO', label: 'No', color: 'red' }
  ];

  const scoreOptions = [1, 2, 3, 4, 5];

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
      alert('All evaluations saved successfully');
    } catch (error) {
      console.error('Failed to save evaluations:', error);
      alert('Failed to save evaluations');
    } finally {
      setSaving(false);
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
    <div className="first-round-interview-container">
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
            First Round Interview • {applications.length} candidates
          </p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={saveAllEvaluations}
            disabled={saving}
          >
            <CheckIcon className="btn-icon" />
            {saving ? 'Saving...' : 'Save All'}
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
              
              return (
                <div key={application.id} className="application-card">
                  <div className="application-header">
                    <div className="candidate-info">
                      <h3>{application.name}</h3>
                      <p className="candidate-details">
                        {application.major} • Class of {application.year}
                      </p>
                    </div>
                    <div className="save-section">
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

                  {/* Evaluation Form */}
                  <div className="evaluation-form">
                    {/* Behavioral Rubric */}
                    <div className="rubric-section">
                      <h4 className="rubric-title">Behavioral Rubric</h4>
                      <div className="rubric-table">
                        <div className="rubric-header">
                          <div className="applicant-name-col">Applicant Name</div>
                          <div className="behavioral-col">
                            <div className="merged-header">Behavioral</div>
                            <div className="sub-headers">
                              <div>Leadership (1-5)</div>
                              <div>Problem Solving (1-5)</div>
                              <div>Interest (1-5)</div>
                            </div>
                          </div>
                          <div className="results-col">
                            <div className="merged-header">Results</div>
                            <div className="sub-headers">
                              <div>Total (1-15)</div>
                            </div>
                          </div>
                        </div>
                        <div className="rubric-row">
                          <div className="applicant-name-cell">
                            <input 
                              type="text" 
                              value={application.name}
                              readOnly
                              className="applicant-name-input"
                            />
                          </div>
                          <div className="behavioral-scores">
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
                          <div className="results-cell">
                            <input 
                              type="text" 
                              value={evaluation.behavioralTotal || ''}
                              readOnly
                              className="total-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Market Sizing Rubric */}
                    <div className="rubric-section">
                      <h4 className="rubric-title">Market Sizing Rubric</h4>
                      <div className="rubric-table">
                        <div className="rubric-header">
                          <div className="applicant-name-col">Applicant Name</div>
                          <div className="market-sizing-col">
                            <div className="merged-header">Market Sizing</div>
                            <div className="sub-headers">
                              <div>Teamwork (1-5)</div>
                              <div>Logic (1-5)</div>
                              <div>Creativity (1-5)</div>
                            </div>
                          </div>
                          <div className="results-col">
                            <div className="merged-header">Results</div>
                            <div className="sub-headers">
                              <div>Total (1-15)</div>
                            </div>
                          </div>
                        </div>
                        <div className="rubric-row">
                          <div className="applicant-name-cell">
                            <input 
                              type="text" 
                              value={application.name}
                              readOnly
                              className="applicant-name-input"
                            />
                          </div>
                          <div className="market-sizing-scores">
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
                          <div className="results-cell">
                            <input 
                              type="text" 
                              value={evaluation.marketSizingTotal || ''}
                              readOnly
                              className="total-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Sections */}
                    <div className="notes-sections">
                      <div className="notes-section">
                        <h4 className="notes-title">Behavioral Notes</h4>
                        <div className="notes-grid">
                          <textarea
                            className="notes-textarea"
                            placeholder="Add behavioral notes here..."
                            value={evaluation.behavioralNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { behavioralNotes: e.target.value })}
                            rows={3}
                          />
                          <textarea
                            className="notes-textarea"
                            placeholder="Add behavioral notes here..."
                            value={evaluation.behavioralNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { behavioralNotes: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="notes-section">
                        <h4 className="notes-title">Market Sizing Notes</h4>
                        <div className="notes-grid">
                          <textarea
                            className="notes-textarea"
                            placeholder="Add market sizing notes here..."
                            value={evaluation.marketSizingNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { marketSizingNotes: e.target.value })}
                            rows={3}
                          />
                          <textarea
                            className="notes-textarea"
                            placeholder="Add market sizing notes here..."
                            value={evaluation.marketSizingNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { marketSizingNotes: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="notes-section">
                        <h4 className="notes-title">Additional Notes / Decisions</h4>
                        <div className="notes-grid">
                          <textarea
                            className="notes-textarea"
                            placeholder="Add additional notes or decisions here..."
                            value={evaluation.additionalNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { additionalNotes: e.target.value })}
                            rows={3}
                          />
                          <textarea
                            className="notes-textarea"
                            placeholder="Add additional notes or decisions here..."
                            value={evaluation.additionalNotes || ''}
                            onChange={(e) => updateEvaluation(application.id, { additionalNotes: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Decision Section */}
                    <div className="decision-section">
                      <h4 className="section-title">Initial Decision</h4>
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
