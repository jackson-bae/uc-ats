import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  DocumentTextIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import '../styles/InterviewInterface.css';

export default function InterviewInterface() {
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

  // Default rubric categories
  const rubricCategories = [
    { id: 'communication', name: 'Communication', description: 'Clarity, articulation, and professional communication' },
    { id: 'problem_solving', name: 'Problem Solving', description: 'Analytical thinking and approach to challenges' },
    { id: 'cultural_fit', name: 'Cultural Fit', description: 'Alignment with company values and team dynamics' },
    { id: 'technical_skills', name: 'Technical Skills', description: 'Relevant technical knowledge and abilities' },
    { id: 'leadership', name: 'Leadership', description: 'Leadership potential and initiative' }
  ];

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
        
        // Check if we have required parameters
        if (!interviewId) {
          throw new Error('No interview ID provided');
        }
        if (!groupIds || groupIds.length === 0) {
          throw new Error('No group IDs provided');
        }
        
        // Load current user first to check authentication
        console.log('Loading current user...');
        const userRes = await apiClient.get('/admin/profile');
        console.log('Current user:', userRes);
        setCurrentUser(userRes);
        
        // Load interview details
        console.log('Loading interview details...');
        const interviewRes = await apiClient.get(`/admin/interviews/${interviewId}`);
        console.log('Interview data loaded:', interviewRes);
        setInterview(interviewRes);
        
        // Load applications for selected groups
        console.log('Loading applications for groups:', groupIds);
        const applicationsRes = await apiClient.get(`/admin/interviews/${interviewId}/applications?groupIds=${groupIds.join(',')}`);
        console.log('Applications loaded:', applicationsRes);
        setApplications(applicationsRes);
        
        // Load existing evaluations
        console.log('Loading existing evaluations...');
        const evaluationsRes = await apiClient.get(`/admin/interviews/${interviewId}/evaluations`);
        console.log('Evaluations loaded:', evaluationsRes);
        const evaluationsMap = {};
        evaluationsRes.forEach(evaluation => {
          evaluationsMap[`${evaluation.applicationId}_${evaluation.evaluatorId}`] = evaluation;
        });
        setEvaluations(evaluationsMap);
        
      } catch (error) {
        console.error('Failed to load interview data:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Full error object:', error);
        
        let errorMessage = 'Failed to load interview data';
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
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
  }, [interviewId, groupIds.join(',')]);

  const getEvaluation = (applicationId) => {
    const key = `${applicationId}_${currentUser?.id}`;
    return evaluations[key] || {
      notes: '',
      decision: null,
      rubricScores: {}
    };
  };

  const updateEvaluation = (applicationId, updates) => {
    const key = `${applicationId}_${currentUser?.id}`;
    setEvaluations(prev => ({
      ...prev,
      [key]: {
        ...getEvaluation(applicationId),
        ...updates
      }
    }));
  };

  const updateNotes = (applicationId, notes) => {
    updateEvaluation(applicationId, { notes });
  };

  const updateDecision = (applicationId, decision) => {
    updateEvaluation(applicationId, { decision });
  };

  const updateRubricScore = (applicationId, category, score) => {
    const currentEval = getEvaluation(applicationId);
    updateEvaluation(applicationId, {
      rubricScores: {
        ...currentEval.rubricScores,
        [category]: score
      }
    });
  };

  const saveEvaluation = async (applicationId) => {
    try {
      setSaving(true);
      const evaluation = getEvaluation(applicationId);
      
      await apiClient.post(`/admin/interviews/${interviewId}/evaluations`, {
        applicationId,
        ...evaluation
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
      const promises = applications.map(app => {
        const evaluation = getEvaluation(app.id);
        return apiClient.post(`/admin/interviews/${interviewId}/evaluations`, {
          applicationId: app.id,
          ...evaluation
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
      <div className="interview-interface-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interview data...</p>
        </div>
      </div>
    );
  }

  if (!interview || applications.length === 0) {
    return (
      <div className="interview-interface-container">
        <div className="error-state">
          <h2>No interview data found</h2>
          <p>Please check your interview selection and try again.</p>
          <button className="btn-primary" onClick={() => navigate('/admin/assigned-interviews')}>
            Back to Interviews
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
          onClick={() => navigate('/admin/assigned-interviews')}
        >
          <ArrowLeftIcon className="back-icon" />
          Back to Interviews
        </button>
        
        <div className="interview-info">
          <h1>{interview.title}</h1>
          <p className="interview-meta">
            {interview.interviewType?.replace(/_/g, ' ')} • {applications.length} applications
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

      {/* Applications Grid */}
      <div className="applications-grid">
        {applications.map(application => {
          const evaluation = getEvaluation(application.id);
          
          return (
            <div key={application.id} className="application-card">
              {/* Application Header */}
              <div className="application-header">
                <div className="applicant-info">
                  <div className="applicant-avatar">
                    <UserIcon className="avatar-icon" />
                  </div>
                  <div className="applicant-details">
                    <h3>{application.name}</h3>
                    <p className="applicant-meta">
                      {application.major} • {application.year}
                    </p>
                  </div>
                </div>
                <button 
                  className="save-btn"
                  onClick={() => saveEvaluation(application.id)}
                  disabled={saving}
                >
                  <CheckIcon className="btn-icon" />
                  Save
                </button>
              </div>

              {/* Notes Section */}
              <div className="evaluation-section">
                <h4 className="section-title">
                  <DocumentTextIcon className="section-icon" />
                  Notes
                </h4>
                <textarea
                  className="notes-textarea"
                  value={evaluation.notes || ''}
                  onChange={(e) => updateNotes(application.id, e.target.value)}
                  placeholder="Add your interview notes here..."
                  rows={4}
                />
              </div>

              {/* Rubric Section */}
              <div className="evaluation-section">
                <h4 className="section-title">
                  <StarIcon className="section-icon" />
                  Evaluation Rubric
                </h4>
                <div className="rubric-grid">
                  {rubricCategories.map(category => (
                    <div key={category.id} className="rubric-item">
                      <div className="rubric-header">
                        <h5>{category.name}</h5>
                        <p className="rubric-description">{category.description}</p>
                      </div>
                      <div className="score-selector">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            className={`score-btn ${evaluation.rubricScores?.[category.id] === score ? 'selected' : ''}`}
                            onClick={() => updateRubricScore(application.id, category.id, score)}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Section */}
              <div className="evaluation-section">
                <h4 className="section-title">Initial Decision</h4>
                <div className="decision-options">
                  {decisionOptions.map(option => (
                    <label key={option.value} className="decision-option">
                      <input
                        type="radio"
                        name={`decision-${application.id}`}
                        value={option.value}
                        checked={evaluation.decision === option.value}
                        onChange={() => updateDecision(application.id, option.value)}
                      />
                      <span className={`decision-label ${option.color}`}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
