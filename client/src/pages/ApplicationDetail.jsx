import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, DocumentIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import AuthenticatedFileLink from '../components/AuthenticatedFileLink';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import '../styles/ApplicationDetail.css';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeGrade, setResumeGrade] = useState(0); // Start at 0
  const [videoGrade, setVideoGrade] = useState(0); // Start at 0
  const [coverLetterGrade, setCoverLetterGrade] = useState(0); // Start at 0
  const [isNa, setIsNa] = useState({
    resume: false,
    video: false,
    cover_letter: false
  });
  const [currentUserId, setCurrentUserId] = useState(null); // Store current user ID
  const [isSaving, setIsSaving] = useState(false); // Loading state for save operation
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' }); // Save status message
  const [averageGrades, setAverageGrades] = useState({
    resume: 0,
    video: 0,
    cover_letter: 0,
    total: 0,
    count: 0
  }); // Store average grades

  // Resume scores
  const [resumeScores, setResumeScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [preview, setPreview] = useState({ open: false, src: '', kind: 'pdf', title: '' });

  // Event attendance
  const [eventData, setEventData] = useState({ events: [], totalPoints: 0 });
  const [eventLoading, setEventLoading] = useState(true);

  // Interview evaluations
  const [interviewEvaluations, setInterviewEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

  const resetGrades = async () => {
    try {
      // Fetch the most recent grades for this application and user
      const grades = await apiClient.get(`/applications/${id}/grades/latest`);
      
      if (grades) {
        console.log('Loading previous grades for this application:', {
          resume_grade: grades.resume,
          video_grade: grades.video,
          cover_letter_grade: grades.cover_letter,
          submitted_at: grades.createdAt
        });
        
        // Set the sliders to the retrieved grades
        setResumeGrade(parseInt(grades.resume) || 0);
        setVideoGrade(parseInt(grades.video) || 0);
        setCoverLetterGrade(parseInt(grades.cover_letter) || 0);
        
        // Show success message
        setSaveStatus({ 
          type: 'info', 
          message: 'Loaded previous grades' 
        });
        
        // Clear the message after 2 seconds
        setTimeout(() => {
          setSaveStatus({ type: '', message: '' });
        }, 2000);
      } else {
        console.log('No previous grades found for this application and user');
        // Reset to 0 if no grades found
        setResumeGrade(0);
        setVideoGrade(0);
        setCoverLetterGrade(0);
        
        setSaveStatus({ 
          type: 'info', 
          message: 'No previous grades found' 
        });
        
        setTimeout(() => {
          setSaveStatus({ type: '', message: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching previous grades:', error);
      // Reset to 0 on error
      setResumeGrade(0);
      setVideoGrade(0);
      setCoverLetterGrade(0);
      
      setSaveStatus({ 
        type: 'error', 
        message: 'Error loading previous grades' 
      });
    }
  };

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
      
      console.log('Average grades for this application:', {
        resume: averages.resume,
        video: averages.video,
        cover_letter: averages.cover_letter,
        overall_average: averages.total,
        total_submissions: averages.count
      });
    } catch (error) {
      console.error('Error fetching average grades:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const list = await apiClient.get(`/applications/${id}/comments`);
      setComments(list);
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  const fetchResumeScores = async (candidateId) => {
    try {
      if (!candidateId) {
        console.log('No candidateId provided for fetchResumeScores');
        return;
      }
      const scores = await apiClient.get(`/review-teams/resume-scores/${candidateId}`);
      setResumeScores(scores);
      console.log('Fetched resume scores:', scores);
    } catch (e) {
      console.error('Error fetching resume scores:', e);
    }
  };

  const fetchEventData = async () => {
    try {
      const data = await apiClient.get(`/applications/${id}/events`);
      setEventData(data);
      console.log('Fetched event data:', data);
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
      console.log('Fetched interview evaluations:', evaluations);
    } catch (e) {
      console.error('Error fetching interview evaluations:', e);
      setInterviewEvaluations([]);
    } finally {
      setEvaluationsLoading(false);
    }
  };

  // Toggle N/A for a grade type
  const toggleNa = (type) => {
    const newState = !isNa[type];
    setIsNa(prev => ({
      ...prev,
      [type]: newState
    }));
    
    // Reset the grade to 0 when marking as N/A
    if (newState) {
      if (type === 'resume') setResumeGrade(0);
      if (type === 'video') setVideoGrade(0);
      if (type === 'cover_letter') setCoverLetterGrade(0);
    }
  };

  // Function to load grades for the current application and user
  const loadGrades = async () => {
    try {
      const grades = await apiClient.get(`/applications/${id}/grades/latest`);
      if (grades) {
        console.log('Loading previous grades for this application:', {
          resume_grade: grades.resume,
          video_grade: grades.video,
          cover_letter_grade: grades.cover_letter,
          submitted_at: grades.createdAt
        });
        
        // Set the sliders to the retrieved grades
        setResumeGrade(parseInt(grades.resume) || 0);
        setVideoGrade(parseInt(grades.video) || 0);
        setCoverLetterGrade(parseInt(grades.cover_letter) || 0);
        
        // Set N/A states based on null values
        setIsNa({
          resume: grades.resume === null,
          video: grades.video === null,
          cover_letter: grades.cover_letter === null
        });
      }
    } catch (error) {
      console.error('Error loading grades on page load:', error);
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
        console.log('Current User ID:', userData.userId);
        
        // Load grades after we have the user ID
        if (userData.userId) {
          await loadGrades();
        }
        
        // Log average grades
        await logAverageGrades();

        // Load comments
        await fetchComments();
        
        // Load resume scores
        await fetchResumeScores(appData.candidateId);
        
        // Load event data
        await fetchEventData();
        
        // Load interview evaluations
        await fetchInterviewEvaluations();
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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
                <div className="average-grade">
                  <span className="average-grade-label">Resume</span>
                  <div>
                    <span className="average-grade-value">{averageGrades.resume.toFixed(1)}</span>
                    <span className="average-grade-total">/ 30</span>
                  </div>
                </div>
                
                <div className="average-grade">
                  <span className="average-grade-label">Video</span>
                  <div>
                    <span className="average-grade-value">{averageGrades.video.toFixed(1)}</span>
                    <span className="average-grade-total">/ 10</span>
                  </div>
                </div>
                
                <div className="average-grade">
                  <span className="average-grade-label">Cover Letter</span>
                  <div>
                    <span className="average-grade-value">{averageGrades.cover_letter.toFixed(1)}</span>
                    <span className="average-grade-total">/ 10</span>
                  </div>
                </div>
                
                <div className="average-grade" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <span className="average-grade-label">Overall</span>
                  <div>
                    <span className="average-grade-value" style={{ color: '#0369a1' }}>{averageGrades.total.toFixed(1)}</span>
                    <span className="average-grade-total">/ 10</span>
                  </div>
                  {averageGrades.count > 0 && (
                    <div className="average-grade-count">
                      from {averageGrades.count} {averageGrades.count === 1 ? 'review' : 'reviews'}
                    </div>
                  )}
                </div>
                
                <div className="average-grade" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <span className="average-grade-label">Event Points</span>
                  <div>
                    <span className="average-grade-value" style={{ color: '#0369a1' }}>{eventData.totalPoints}</span>
                    <span className="average-grade-total">pts</span>
                  </div>
                  <div className="average-grade-count">
                    {eventData.events.filter(e => e.attendanceStatus === 'Attended').length} attended
                  </div>
                </div>
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
                <span className="info-value">{application.majorGpa}</span>
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
                  <AuthenticatedFileLink
                    href={application.videoUrl}
                    filename={`${application.firstName}_${application.lastName}_Video`}
                    className="document-link"
                  >
                    <DocumentIcon className="document-icon" />
                    Video
                  </AuthenticatedFileLink>
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
                      {eventData.events.filter(e => e.attendanceStatus === 'Attended').length} of {eventData.events.length} events attended
                    </span>
                  </div>
                </div>
                
                <div className="events-list">
                  {eventData.events.map((event) => (
                    <div 
                      key={event.id} 
                      className="event-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div className="event-name">
                            {event.eventName}
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
          
          {/* Grading Panel */}
          <div className="grading-panel">
            <h3 className="grading-title">Grade Application</h3>
            <div className="grading-content">
              <div className="grading-item">
                <div className="grading-header">
                  <label className="grading-label">Resume</label>
                  <span className="grade-value">{resumeGrade}/30</span>
                  <button 
                    className={`na-button ${isNa.resume ? 'active' : ''}`}
                    onClick={() => toggleNa('resume')}
                    data-active={isNa.resume}
                  >
                    {isNa.resume ? 'N/A ✓' : 'N/A'}
                  </button>
                </div>
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={isNa.resume ? 0 : resumeGrade}
                    onChange={(e) => setResumeGrade(parseInt(e.target.value))}
                    className="grade-slider"
                    disabled={isNa.resume}
                  />
                  <div className="slider-ticks">
                    {[5, 10, 15, 20, 25, 30].map((tick) => (
                      <span key={tick} className="tick"></span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grading-item">
                <div className="grading-header">
                  <label className="grading-label">Video</label>
                  <span className="grade-value">{videoGrade}/10</span>
                  <button 
                    className={`na-button ${isNa.video ? 'active' : ''}`}
                    onClick={() => toggleNa('video')}
                    data-active={isNa.video}
                  >
                    {isNa.video ? 'N/A ✓' : 'N/A'}
                  </button>
                </div>
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={isNa.video ? 0 : videoGrade}
                    onChange={(e) => setVideoGrade(parseInt(e.target.value))}
                    className="grade-slider"
                    disabled={isNa.video}
                  />
                  <div className="slider-ticks">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
                      <span key={`video-${tick}`} className="tick"></span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grading-item">
                <div className="grading-header">
                  <label className="grading-label">Cover Letter</label>
                  <span className="grade-value">{coverLetterGrade}/10</span>
                  <button 
                    className={`na-button ${isNa.cover_letter ? 'active' : ''}`}
                    onClick={() => toggleNa('cover_letter')}
                    data-active={isNa.cover_letter}
                  >
                    {isNa.cover_letter ? 'N/A ✓' : 'N/A'}
                  </button>
                </div>
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={isNa.cover_letter ? 0 : coverLetterGrade}
                    onChange={(e) => setCoverLetterGrade(parseInt(e.target.value))}
                    className="grade-slider"
                    disabled={isNa.cover_letter}
                  />
                  <div className="slider-ticks">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
                      <span key={`letter-${tick}`} className="tick"></span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grading-actions">
                <button 
                  className="grading-button save-button"
                  onClick={async () => {
                    if (!currentUserId) {
                      setSaveStatus({ type: 'error', message: 'You must be logged in to save grades' });
                      return;
                    }

                    // Validate that at least one grade is provided and valid
                    const hasValidGrade = 
                      (!isNa.resume && resumeGrade >= 1) ||
                      (!isNa.video && videoGrade >= 1) ||
                      (!isNa.cover_letter && coverLetterGrade >= 1);

                    if (!hasValidGrade) {
                      setSaveStatus({ 
                        type: 'error', 
                        message: 'Please provide at least one grade or mark all as N/A' 
                      });
                      return;
                    }

                    // Validate individual grades that are not N/A
                    if (!isNa.resume && (resumeGrade < 1 || resumeGrade > 30)) {
                      setSaveStatus({ type: 'error', message: 'Resume grade must be between 1 and 30' });
                      return;
                    }
                    if (!isNa.video && (videoGrade < 1 || videoGrade > 10)) {
                      setSaveStatus({ type: 'error', message: 'Video grade must be between 1 and 10' });
                      return;
                    }
                    if (!isNa.cover_letter && (coverLetterGrade < 1 || coverLetterGrade > 10)) {
                      setSaveStatus({ type: 'error', message: 'Cover letter grade must be between 1 and 10' });
                      return;
                    }

                    try {
                      setIsSaving(true);
                      
                      // Prepare the data to send, only including non-N/A grades
                      const gradeData = {};
                      
                      // Only include grades that are not marked as N/A and have a valid value
                      if (!isNa.resume && resumeGrade >= 1) {
                        gradeData.resume_grade = parseInt(resumeGrade);
                      } else if (isNa.resume) {
                        gradeData.resume_grade = null;
                      }
                      
                      if (!isNa.video && videoGrade >= 1) {
                        gradeData.video_grade = parseInt(videoGrade);
                      } else if (isNa.video) {
                        gradeData.video_grade = null;
                      }
                      
                      if (!isNa.cover_letter && coverLetterGrade >= 1) {
                        gradeData.cover_letter_grade = parseInt(coverLetterGrade);
                      } else if (isNa.cover_letter) {
                        gradeData.cover_letter_grade = null;
                      }
                      
                      // Send the data to the API
                      await apiClient.post(`/applications/${id}/grades`, gradeData);
                      
                      // Refresh the average grades display
                      await logAverageGrades();
                      
                      setSaveStatus({ 
                        type: 'success', 
                        message: 'Grades saved successfully!' 
                      });
                      
                      // Clear success message after 3 seconds
                      setTimeout(() => {
                        setSaveStatus({ type: '', message: '' });
                      }, 3000);
                    } catch (error) {
                      console.error('Error saving grades:', error);
                      const errorMessage = error.response?.data?.error || 'Failed to save grades. Please try again.';
                      setSaveStatus({ 
                        type: 'error', 
                        message: errorMessage 
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Grades'}
                </button>
                <button 
                  className="grading-button reset-button"
                  onClick={resetGrades}
                >
                  Reset
                </button>
                {saveStatus.message && (
                  <div className={`save-status ${saveStatus.type}`}>
                    {saveStatus.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="info-section">
            <h2 className="section-title">Comments</h2>
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a comment for the team..."
                style={{ width: '100%', minHeight: '80px', padding: '8px' }}
              />
              {commentError && (
                <div style={{ color: 'red', marginTop: '4px' }}>{commentError}</div>
              )}
              <button
                className="grading-button save-button"
                onClick={async () => {
                  setCommentError('');
                  const content = newComment.trim();
                  if (!content) {
                    setCommentError('Please enter a comment');
                    return;
                  }
                  try {
                    await apiClient.post(`/applications/${id}/comments`, { content });
                    setNewComment('');
                    await fetchComments();
                  } catch (e) {
                    console.error('Failed to post comment', e);
                    setCommentError('Failed to post comment');
                  }
                }}
                style={{ marginTop: '8px' }}
              >
                Add Comment
              </button>
            </div>

            {comments.length === 0 ? (
              <div className="empty-state">No comments yet.</div>
            ) : (
              <div className="comments-list">
                {comments.map((c) => (
                  <div key={c.id} className="comment-item" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {c.user?.fullName || c.user?.email || 'Unknown'} • {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resume Scores Section */}
      <div className="info-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Resume Scores</h2>
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
                  setSelectedScore(score);
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
                      {score.overallScore}/10
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
                Resume Score Details
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <span>Content & Relevance</span>
                  <span style={{ fontWeight: '600' }}>{selectedScore.scoreOne || 'N/A'}/10</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <span>Structure & Formatting</span>
                  <span style={{ fontWeight: '600' }}>{selectedScore.scoreTwo || 'N/A'}/10</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <span>Impact & Achievement</span>
                  <span style={{ fontWeight: '600' }}>{selectedScore.scoreThree || 'N/A'}/10</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Overall Score
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#059669' }}>
                {selectedScore.overallScore}/10
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
    </div>
  );
} 