import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, DocumentIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import '../styles/ApplicationDetail.css';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null); // Store current user ID
  const [averageGrades, setAverageGrades] = useState({
    resume: 0,
    video: 0,
    cover_letter: 0,
    total: 0,
    count: 0
  }); // Store average grades

  // Document scores
  const [resumeScores, setResumeScores] = useState([]);
  const [coverLetterScores, setCoverLetterScores] = useState([]);
  const [videoScores, setVideoScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [preview, setPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });
  const [isCommentsMinimized, setIsCommentsMinimized] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // Referral state
  const [referral, setReferral] = useState(null);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralForm, setReferralForm] = useState({ referrerName: '', relationship: '' });
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Event attendance
  const [eventData, setEventData] = useState({ events: [], totalPoints: 0 });
  const [eventLoading, setEventLoading] = useState(true);

  // Interview evaluations
  const [interviewEvaluations, setInterviewEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);


  // Function to fetch and store average grades for the current application
  const logAverageGrades = async () => {
    try {
      const averages = await apiClient.get(`/applications/${id}/grades/average`);
      
      // Store the averages in state
      setAverageGrades({
        resume: averages.resume,
        video: averages.video,
        cover_letter: averages.cover_letter,
        total: averages.total,
        count: averages.count
      });
    } catch (error) {
      console.error('Error fetching average grades:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const list = await apiClient.get(`/applications/${id}/comments`);
      setComments(list);
      // Scroll to bottom after comments are loaded
      setTimeout(() => {
        if (commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Referral functions
  const fetchReferral = async () => {
    try {
      const referralData = await apiClient.get(`/applications/${id}/referral`);
      setReferral(referralData);
    } catch (e) {
      if (e.response?.status !== 404) {
        console.error('Error fetching referral:', e);
      }
      setReferral(null);
    }
  };

  const addReferral = async () => {
    if (!referralForm.referrerName.trim() || !referralForm.relationship.trim()) {
      return;
    }

    setIsSubmittingReferral(true);
    try {
      const newReferral = await apiClient.post(`/applications/${id}/referral`, referralForm);
      setReferral(newReferral);
      setIsReferralModalOpen(false);
      setReferralForm({ referrerName: '', relationship: '' });
      // Refresh average grades to show the bonus
      await logAverageGrades();
    } catch (e) {
      console.error('Error adding referral:', e);
      alert(e.response?.data?.error || 'Failed to add referral');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const removeReferral = async () => {
    if (!confirm('Are you sure you want to remove this referral?')) {
      return;
    }

    try {
      await apiClient.delete(`/applications/${id}/referral`);
      setReferral(null);
      // Refresh average grades to remove the bonus
      await logAverageGrades();
    } catch (e) {
      console.error('Error removing referral:', e);
      alert(e.response?.data?.error || 'Failed to remove referral');
    }
  };

  // Calculate average scores from the actual score arrays
  const calculateAverageScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const validScores = scores.map(score => parseFloat(score.overallScore)).filter(score => !isNaN(score));
    if (validScores.length === 0) return 0;
    const total = validScores.reduce((sum, score) => sum + score, 0);
    return total / validScores.length;
  };

  // Get calculated averages for display
  const getCalculatedAverages = () => {
    const resumeAvg = calculateAverageScore(resumeScores);
    const videoAvg = calculateAverageScore(videoScores);
    const coverLetterAvg = calculateAverageScore(coverLetterScores);
    
    // Calculate overall total by summing all document scores (not averaging)
    let overallTotal = 0;
    if (resumeScores.length > 0) overallTotal += resumeAvg;
    if (videoScores.length > 0) overallTotal += videoAvg;
    if (coverLetterScores.length > 0) overallTotal += coverLetterAvg;
    
    // Add event points directly (raw points, not scaled)
    const eventPointsContribution = eventData.totalPoints || 0;
    overallTotal += eventPointsContribution;
    
    const result = {
      resume: resumeAvg,
      video: videoAvg,
      cover_letter: coverLetterAvg,
      total: overallTotal,
      count: resumeScores.length + videoScores.length + coverLetterScores.length,
      referralBonus: 0, // Referrals no longer contribute to overall score
      eventPointsContribution: eventPointsContribution
    };
    
    return result;
  };

  const fetchResumeScores = async (candidateId) => {
    try {
      if (!candidateId) {
        return;
      }
      const scores = await apiClient.get(`/review-teams/resume-scores/${candidateId}`);
      setResumeScores(scores);
    } catch (e) {
      console.error('Error fetching resume scores:', e);
    }
  };

  const fetchCoverLetterScores = async (candidateId) => {
    try {
      if (!candidateId) {
        return;
      }
      const scores = await apiClient.get(`/review-teams/cover-letter-scores/${candidateId}`);
      setCoverLetterScores(scores);
    } catch (e) {
      console.error('Error fetching cover letter scores:', e);
    }
  };

  const fetchVideoScores = async (candidateId) => {
    try {
      if (!candidateId) {
        return;
      }
      const scores = await apiClient.get(`/review-teams/video-scores/${candidateId}`);
      setVideoScores(scores);
    } catch (e) {
      console.error('Error fetching video scores:', e);
    }
  };

  const fetchEventData = async () => {
    try {
      const data = await apiClient.get(`/applications/${id}/events`);
      setEventData(data);
    } catch (e) {
      console.error('Error fetching event data:', e);
    } finally {
      setEventLoading(false);
    }
  };

  const fetchInterviewEvaluations = async () => {
    try {
      setEvaluationsLoading(true);
      const evaluations = await apiClient.get(`/admin/applications/${id}/interview-evaluations`);
      setInterviewEvaluations(evaluations);
    } catch (e) {
      console.error('Error fetching interview evaluations:', e);
      setInterviewEvaluations([]);
    } finally {
      setEvaluationsLoading(false);
    }
  };



  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch application data
        const [appData, userData] = await Promise.all([
          apiClient.get(`/applications/${id}`),
          apiClient.get('/applications/current-user/id')
        ]);
        
        setApplication(appData);
        setCurrentUserId(userData.userId);
        
        // Log average grades
        await logAverageGrades();

        // Load comments
        await fetchComments();
        
        // Load document scores
        await fetchResumeScores(appData.candidateId);
        await fetchCoverLetterScores(appData.candidateId);
        await fetchVideoScores(appData.candidateId);
        
        // Load event data
        await fetchEventData();
        
        // Load interview evaluations
        await fetchInterviewEvaluations();
        
        // Load referral data
        await fetchReferral();
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (comments.length > 0 && !isCommentsMinimized) {
      setTimeout(scrollToBottom, 100);
    }
  }, [comments, isCommentsMinimized]);

  if (loading) {
    return (
      <div className="application-detail">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading application details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="application-detail">
        <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</div>
        <Link to="/application-list" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Applications
        </Link>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="application-detail">
        <div style={{ marginBottom: '1rem' }}>Application not found</div>
        <Link to="/application-list" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="application-detail">
      {/* Header with back button and status */}
      <div className="detail-header">
        <div className="header-left">
          <Link to="/application-list" className="back-link">
            <ArrowLeftIcon className="back-icon" />
            Back to Applications
          </Link>
          <div className="name-and-status">
            <div>
              <div className="candidate-header">
                <h1 className="candidate-name">
                  {application.firstName} {application.lastName}
                </h1>
                <span className="applicant-id">ID: {application.id}</span>
              </div>
              
              <div className="average-grades-container">
                {(() => {
                  const calculatedAverages = getCalculatedAverages();
                  return (
                    <>
                      <div className="average-grade">
                        <span className="average-grade-label">Resume</span>
                        <div>
                          <span className="average-grade-value">{calculatedAverages.resume.toFixed(1)}</span>
                          <span className="average-grade-total">/ 13</span>
                        </div>
                        {resumeScores.length > 0 && (
                          <div className="average-grade-count">
                            from {resumeScores.length} {resumeScores.length === 1 ? 'review' : 'reviews'}
                          </div>
                        )}
                      </div>
                      
                      <div className="average-grade">
                        <span className="average-grade-label">Video</span>
                        <div>
                          <span className="average-grade-value">{calculatedAverages.video.toFixed(1)}</span>
                          <span className="average-grade-total">/ 2</span>
                        </div>
                        {videoScores.length > 0 && (
                          <div className="average-grade-count">
                            from {videoScores.length} {videoScores.length === 1 ? 'review' : 'reviews'}
                          </div>
                        )}
                      </div>
                      
                      <div className="average-grade">
                        <span className="average-grade-label">Cover Letter</span>
                        <div>
                          <span className="average-grade-value">{calculatedAverages.cover_letter.toFixed(1)}</span>
                          <span className="average-grade-total">/ 3</span>
                        </div>
                        {coverLetterScores.length > 0 && (
                          <div className="average-grade-count">
                            from {coverLetterScores.length} {coverLetterScores.length === 1 ? 'review' : 'reviews'}
                          </div>
                        )}
                      </div>
                      
                      <div className="average-grade">
                        <span className="average-grade-label">Event Points</span>
                        <div>
                          <span className="average-grade-value">{eventData.totalPoints}</span>
                          <span className="average-grade-total">pts</span>
                        </div>
                        <div className="average-grade-count">
                          {eventData.events.filter(e => e.rsvpStatus === 'RSVPed' || e.attendanceStatus === 'Attended').filter(e => e.attendanceStatus === 'Attended').length} attended of {eventData.events.filter(e => e.rsvpStatus === 'RSVPed' || e.attendanceStatus === 'Attended').length} relevant
                        </div>
                      </div>
                      
                      <div className="average-grade" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                        <span className="average-grade-label">Overall</span>
                        <div>
                          <span className="average-grade-value" style={{ color: '#0369a1' }}>{calculatedAverages.total.toFixed(1)}</span>
                          <span className="average-grade-total">/ 18</span>
                        </div>
                        {calculatedAverages.count > 0 && (
                          <div className="average-grade-count">
                            from {calculatedAverages.count} {calculatedAverages.count === 1 ? 'review' : 'reviews'}
                          </div>
                        )}
                        {calculatedAverages.eventPointsContribution > 0 && (
                          <div className="average-grade-count" style={{ color: '#059669', fontWeight: '600' }}>
                            +{Math.floor(calculatedAverages.eventPointsContribution / 3)} events
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className={`status-badge ${application.status.toLowerCase()}`}>
              {application.status.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="detail-content">
        {/* Left column - Application details */}
        <div className="detail-main">
          {/* Basic Information */}
          <div className="info-section">
            <h2 className="section-title">Basic Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">
                  <a href={`mailto:${application.email}`}>{application.email}</a>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">{application.phoneNumber}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Student ID</span>
                <span className="info-value">{application.studentId}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Submitted</span>
                <span className="info-value">
                  {new Date(application.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="info-section">
            <h2 className="section-title">Academic Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Graduation Year</span>
                <span className="info-value">{application.graduationYear}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Transfer Student</span>
                <span className="info-value">
                  {application.isTransferStudent ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Cumulative GPA</span>
                <span className="info-value">{application.cumulativeGpa}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Major GPA</span>
                <span className="info-value">{application.majorGpa || 'Not provided'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Primary Major</span>
                <span className="info-value">{application.major1}</span>
              </div>
              {application.major2 && (
                <div className="info-item">
                  <span className="info-label">Secondary Major</span>
                  <span className="info-value">{application.major2}</span>
                </div>
              )}
              {application.priorCollegeYears && (
                <div className="info-item">
                  <span className="info-label">Prior College Years</span>
                  <span className="info-value">{application.priorCollegeYears}</span>
                </div>
              )}
            </div>
          </div>

          {/* Demographic Information */}
          {(application.gender || application.isFirstGeneration !== null) && (
            <div className="info-section">
              <h2 className="section-title">Demographic Information</h2>
              <div className="info-grid">
                {application.gender && (
                  <div className="info-item">
                    <span className="info-label">Gender</span>
                    <span className="info-value">{application.gender}</span>
                  </div>
                )}
                {application.isFirstGeneration !== null && (
                  <div className="info-item">
                    <span className="info-label">First Generation</span>
                    <span className="info-value">
                      {application.isFirstGeneration ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="info-section">
            <h2 className="section-title">Documents</h2>
            <div className="info-grid">
              {application.resumeUrl && (
                <div className="info-item">
                  <a
                    href="#"
                    className="document-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setPreview({ open: true, src: application.resumeUrl, kind: 'pdf', title: `${application.firstName} ${application.lastName} – Resume` });
                    }}
                  >
                    <DocumentIcon className="document-icon" />
                    Resume (PDF)
                  </a>
                </div>
              )}
              {application.blindResumeUrl && (
                <div className="info-item">
                  <a
                    href="#"
                    className="document-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setPreview({ open: true, src: application.blindResumeUrl, kind: 'pdf', title: `${application.firstName} ${application.lastName} – Blind Resume` });
                    }}
                  >
                    <DocumentIcon className="document-icon" />
                    Blind Resume (PDF)
                  </a>
                </div>
              )}
              {application.coverLetterUrl && (
                <div className="info-item">
                  <a
                    href="#"
                    className="document-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setPreview({ open: true, src: application.coverLetterUrl, kind: 'pdf', title: `${application.firstName} ${application.lastName} – Cover Letter` });
                    }}
                  >
                    <DocumentIcon className="document-icon" />
                    Cover Letter (PDF)
                  </a>
                </div>
              )}
              {application.videoUrl && (
                <div className="info-item">
                  <a
                    href="#"
                    className="document-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setPreview({ open: true, src: application.videoUrl, kind: 'video', title: `${application.firstName} ${application.lastName} – Video` });
                    }}
                  >
                    <DocumentIcon className="document-icon" />
                    Video
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Event Attendance */}
          <div className="info-section">
            <h2 className="section-title">Event Attendance</h2>
            {eventLoading ? (
              <div className="empty-state">Loading event data...</div>
            ) : eventData.events.length === 0 ? (
              <div className="empty-state">No events found for this cycle.</div>
            ) : (
              <div>
                <div className="event-summary">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <span style={{ fontWeight: '600', color: '#0369a1' }}>
                      Total Event Points: {eventData.totalPoints}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#0369a1' }}>
                      {eventData.events.filter(e => e.rsvpStatus === 'RSVPed' || e.attendanceStatus === 'Attended').filter(e => e.attendanceStatus === 'Attended').length} attended of {eventData.events.filter(e => e.rsvpStatus === 'RSVPed' || e.attendanceStatus === 'Attended').length} relevant events
                    </span>
                  </div>
                </div>
                
                <div className="events-list">
                  {eventData.events
                    .filter(event => event.rsvpStatus === 'RSVPed' || event.attendanceStatus === 'Attended')
                    .map((event) => (
                    <div 
                      key={event.id} 
                      className="event-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div className="event-name">
                            {event.eventName}
                            {event.isMeeting && event.memberName && (
                              <span style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                color: '#0369a1',
                                marginLeft: '8px'
                              }}>
                                with {event.memberName}
                              </span>
                            )}
                          </div>
                          <div className="event-details">
                            {new Date(event.eventStartDate).toLocaleDateString()} • {event.eventLocation || 'Location TBD'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div className={`event-points ${event.points === 0 ? 'no-points' : ''}`}>
                            {event.points} pts
                          </div>
                        </div>
                      </div>
                      
                      <div className="event-status-badges">
                        <div className={`status-badge ${event.rsvpStatus === 'RSVPed' ? 'rsvped' : 'not-rsvped'}`}>
                          {event.rsvpStatus}
                        </div>
                        <div className={`status-badge ${event.attendanceStatus === 'Attended' ? 'attended' : 'not-attended'}`}>
                          {event.attendanceStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Photo */}
        <div className="detail-sidebar">
          <div className="candidate-photo">
            <h3 className="photo-title">Photo</h3>
            {application.headshotUrl ? (
              <AuthenticatedImage
                src={application.headshotUrl}
                alt={`${application.firstName} ${application.lastName}`}
                className="photo-image"
              />
            ) : (
              <div className="photo-placeholder">
                No photo available
              </div>
            )}
          </div>
          

          {/* Comments Chatbox */}
          <div className="info-section" style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            overflow: 'hidden',
            backgroundColor: '#fafafa'
          }}>
            {/* Chatbox Header */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer'
              }}
              onClick={() => setIsCommentsMinimized(!isCommentsMinimized)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChatBubbleLeftRightIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Comments ({comments.length})
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {comments.length > 0 && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280',
                    backgroundColor: '#e5e7eb',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {comments.length} message{comments.length !== 1 ? 's' : ''}
                  </span>
                )}
                {isCommentsMinimized ? (
                  <ChevronDownIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                ) : (
                  <ChevronUpIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                )}
              </div>
            </div>

            {/* Chatbox Content */}
            {!isCommentsMinimized && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                {/* Messages Area */}
                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '16px 20px',
                  backgroundColor: '#ffffff'
                }}>
                  {comments.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#6b7280', 
                      padding: '40px 20px',
                      fontStyle: 'italic'
                    }}>
                      No comments yet. Start the conversation!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {comments.map((c) => (
                        <div 
                          key={c.id} 
                          style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '12px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            maxWidth: '80%',
                            alignSelf: 'flex-start'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '6px'
                          }}>
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: '#10b981' 
                            }} />
                            <span style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: '600',
                              color: '#374151' 
                            }}>
                              {c.user?.fullName || c.user?.email || 'Unknown'}
                            </span>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              color: '#6b7280' 
                            }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ 
                            whiteSpace: 'pre-wrap', 
                            fontSize: '0.875rem',
                            color: '#374151',
                            lineHeight: '1.5'
                          }}>
                            {c.content}
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div style={{ 
                  padding: '16px 20px', 
                  borderTop: '1px solid #e5e7eb',
                  backgroundColor: '#f8fafc'
                }}>
                  {commentError && (
                    <div style={{ 
                      color: '#dc2626', 
                      fontSize: '0.875rem',
                      marginBottom: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px'
                    }}>
                      {commentError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Type your comment here..."
                      style={{ 
                        flex: 1,
                        minHeight: '40px',
                        maxHeight: '120px',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          if (newComment.trim() && !isSubmittingComment) {
                            // Trigger submit
                            const submitEvent = new Event('click');
                            e.target.nextElementSibling.dispatchEvent(submitEvent);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={async () => {
                        setCommentError('');
                        const content = newComment.trim();
                        if (!content) {
                          setCommentError('Please enter a comment');
                          return;
                        }
                        setIsSubmittingComment(true);
                        try {
                          await apiClient.post(`/applications/${id}/comments`, { content });
                          setNewComment('');
                          await fetchComments();
                          // Auto-scroll to bottom after new comment
                          setTimeout(scrollToBottom, 200);
                        } catch (e) {
                          console.error('Failed to post comment', e);
                          setCommentError('Failed to post comment');
                        } finally {
                          setIsSubmittingComment(false);
                        }
                      }}
                      disabled={isSubmittingComment || !newComment.trim()}
                      style={{ 
                        padding: '10px 16px',
                        backgroundColor: isSubmittingComment || !newComment.trim() ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: isSubmittingComment || !newComment.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        minWidth: '80px'
                      }}
                    >
                      {isSubmittingComment ? 'Posting...' : 'Send'}
                    </button>
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    marginTop: '6px',
                    textAlign: 'center'
                  }}>
                    Press Ctrl+Enter to send
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="info-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Referral</h2>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f0fdf4', 
          borderRadius: '8px', 
          border: '1px solid #bbf7d0' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
              Referral Information
            </h3>
            {!referral && (
              <button
                onClick={() => setIsReferralModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Add Referral
              </button>
            )}
          </div>
          
          {referral ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  {referral.referrerName}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                  {referral.relationship}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Added {new Date(referral.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={removeReferral}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
              No referral added yet.
            </div>
          )}
        </div>
      </div>

      {/* Document Scores Section */}
      <div className="info-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Document Scores</h2>
        
        {/* Resume Scores */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
            Resume Scores ({resumeScores.length})
          </h3>
          {resumeScores.length === 0 ? (
            <div className="empty-state">No resume scores yet.</div>
          ) : (
            <div className="resume-scores-list">
              {resumeScores.map((score) => (
                <div 
                  key={score.id} 
                  className="resume-score-item"
                  style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onClick={() => {
                    setSelectedScore({...score, documentType: 'Resume'});
                    setScoreModalOpen(true);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {score.evaluator?.fullName || score.evaluator?.email || 'Unknown Evaluator'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>
                        {new Date(score.createdAt).toLocaleDateString()} at {new Date(score.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669' }}>
                        {score.overallScore}/13
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cover Letter Scores */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
            Cover Letter Scores ({coverLetterScores.length})
          </h3>
          {coverLetterScores.length === 0 ? (
            <div className="empty-state">No cover letter scores yet.</div>
          ) : (
            <div className="resume-scores-list">
              {coverLetterScores.map((score) => (
                <div 
                  key={score.id} 
                  className="resume-score-item"
                  style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onClick={() => {
                    setSelectedScore({...score, documentType: 'Cover Letter'});
                    setScoreModalOpen(true);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {score.evaluator?.fullName || score.evaluator?.email || 'Unknown Evaluator'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>
                        {new Date(score.createdAt).toLocaleDateString()} at {new Date(score.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669' }}>
                        {score.overallScore}/3
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Scores */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
            Video Scores ({videoScores.length})
          </h3>
          {videoScores.length === 0 ? (
            <div className="empty-state">No video scores yet.</div>
          ) : (
            <div className="resume-scores-list">
              {videoScores.map((score) => (
                <div 
                  key={score.id} 
                  className="resume-score-item"
                  style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onClick={() => {
                    setSelectedScore({...score, documentType: 'Video'});
                    setScoreModalOpen(true);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {score.evaluator?.fullName || score.evaluator?.email || 'Unknown Evaluator'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>
                        {new Date(score.createdAt).toLocaleDateString()} at {new Date(score.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669' }}>
                        {score.overallScore}/2
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interview Evaluations Section */}
      <div className="info-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Interview Evaluations</h2>
        {evaluationsLoading ? (
          <div className="empty-state">Loading interview evaluations...</div>
        ) : interviewEvaluations.length > 0 ? (
          <div className="interview-evaluations-list">
            {interviewEvaluations.map((evaluation) => (
              <div 
                key={evaluation.id} 
                className="interview-evaluation-item"
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', fontSize: '1.1rem' }}>
                      {evaluation.interview.title}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>
                      {evaluation.interview.interviewType.replace(/_/g, ' ')} • 
                      Evaluated by {evaluation.evaluator.fullName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                      {new Date(evaluation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {evaluation.decision && (
                    <div 
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                          evaluation.decision === 'YES' ? '#dcfce7' :
                          evaluation.decision === 'MAYBE_YES' ? '#dcfce7' :
                          evaluation.decision === 'UNSURE' ? '#fef3c7' :
                          evaluation.decision === 'MAYBE_NO' ? '#fee2e2' :
                          '#fee2e2',
                        color: 
                          evaluation.decision === 'YES' ? '#166534' :
                          evaluation.decision === 'MAYBE_YES' ? '#166534' :
                          evaluation.decision === 'UNSURE' ? '#92400e' :
                          evaluation.decision === 'MAYBE_NO' ? '#991b1b' :
                          '#991b1b',
                        border: '1px solid',
                        borderColor: 
                          evaluation.decision === 'YES' ? '#bbf7d0' :
                          evaluation.decision === 'MAYBE_YES' ? '#bbf7d0' :
                          evaluation.decision === 'UNSURE' ? '#fde68a' :
                          evaluation.decision === 'MAYBE_NO' ? '#fecaca' :
                          '#fecaca'
                      }}
                    >
                      {evaluation.decision.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                {evaluation.notes && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px', fontSize: '0.875rem' }}>
                      Notes:
                    </div>
                    <div style={{ 
                      backgroundColor: '#f3f4f6', 
                      padding: '8px', 
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}>
                      {evaluation.notes}
                    </div>
                  </div>
                )}
                
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No interview evaluations found for this application.</div>
        )}
      </div>

      {/* Score Detail Modal */}
      {scoreModalOpen && selectedScore && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setScoreModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                {selectedScore?.documentType || 'Document'} Score Details
              </h3>
              <button 
                onClick={() => setScoreModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Evaluator
              </div>
              <div style={{ color: '#6b7280' }}>
                {selectedScore.evaluator?.fullName || selectedScore.evaluator?.email || 'Unknown'}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Date & Time
              </div>
              <div style={{ color: '#6b7280' }}>
                {new Date(selectedScore.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Category Scores
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedScore.documentType === 'Resume' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <span>Content, Relevance, and Impact</span>
                      <span style={{ fontWeight: '600' }}>{selectedScore.scoreOne || 'N/A'}/10</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <span>Structure & Formatting</span>
                      <span style={{ fontWeight: '600' }}>{selectedScore.scoreTwo || 'N/A'}/3</span>
                    </div>
                  </>
                )}
                {selectedScore.documentType === 'Cover Letter' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <span>Consulting Interest</span>
                      <span style={{ fontWeight: '600' }}>{selectedScore.scoreOne || 'N/A'}/3</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <span>UC Interest</span>
                      <span style={{ fontWeight: '600' }}>{selectedScore.scoreTwo || 'N/A'}/3</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                      <span>Culture Addition</span>
                      <span style={{ fontWeight: '600' }}>{selectedScore.scoreThree || 'N/A'}/3</span>
                    </div>
                  </>
                )}
                {selectedScore.documentType === 'Video' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                    <span>Overall Video Assessment</span>
                    <span style={{ fontWeight: '600' }}>{selectedScore.scoreOne || 'N/A'}/2</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Overall Score
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#059669' }}>
                {selectedScore.overallScore}/{selectedScore.documentType === 'Resume' ? '13' : 
                                           selectedScore.documentType === 'Cover Letter' ? '3' : 
                                           selectedScore.documentType === 'Video' ? '2' : '10'}
              </div>
            </div>

            {selectedScore.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Notes
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  color: '#374151'
                }}>
                  {selectedScore.notes}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => setScoreModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {preview.open && (
        <DocumentPreviewModal
          src={preview.src}
          kind={preview.kind}
          title={preview.title}
          onClose={() => setPreview({ open: false, src: '', kind: 'pdf', title: '' })}
        />
      )}

      {/* Referral Modal */}
      {isReferralModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Add Referral
              </h3>
              <button
                onClick={() => setIsReferralModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Referrer Name *
              </label>
              <input
                type="text"
                value={referralForm.referrerName}
                onChange={(e) => setReferralForm(prev => ({ ...prev, referrerName: e.target.value }))}
                placeholder="Enter referrer's name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Relationship *
              </label>
              <input
                type="text"
                value={referralForm.relationship}
                onChange={(e) => setReferralForm(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="e.g., Former colleague, Professor, Friend"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>


            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsReferralModalOpen(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={addReferral}
                disabled={isSubmittingReferral || !referralForm.referrerName.trim() || !referralForm.relationship.trim()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: isSubmittingReferral || !referralForm.referrerName.trim() || !referralForm.relationship.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isSubmittingReferral || !referralForm.referrerName.trim() || !referralForm.relationship.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmittingReferral ? 'Adding...' : 'Add Referral'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 