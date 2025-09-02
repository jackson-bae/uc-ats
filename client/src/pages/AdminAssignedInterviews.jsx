import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import UConsultingLogo from '../components/UConsultingLogo';
import '../styles/AdminAssignedInterviews.css';

export default function AdminAssignedInterviews() {
  const navigate = useNavigate();
  const [actionItems, setActionItems] = useState({
    reviewInstructions: true,
    fillQuestions: false,
    createMarketSizing: false,
    reviewResumes: false
  });

  const [interviews, setInterviews] = useState([
    {
      id: 1,
      title: "First Round Interview",
      date: "Friday, Sep 09, 2025",
      time: "5:00 - 7:00 PM",
      deliberations: "7:00 - 8:00 PM",
      location: "Hanes Hall Room 100",
      dresscode: "Business Casual",
      interviewees: 4,
      team: "Group 7 with: Ksenya Gotlieb",
      status: "UPCOMING",
      description: {
        beforeInterviews: "Complete all action items and read the documents! We will be checking that you've completed all the steps by tmrw 8:30am\n\nReach out to your interview partner!! Make sure you assign questions, know who's giving the market sizing prompt, etc!",
        duringInterviews: "It is essential that you are 5-10mins early. Please make the candidates wait outside the room until you are both ready to go!\n\nBe sure to regularly check the suggested itinerary to stay on track and leave time for questions\n\nFYI decisions for final round interviews will be released tomorrow evening, final round interviews will be on Monday!",
        afterInterviews: "Do not decide scores with your partner, this is meant to be individual and should not take into consideration any prior experiences with candidates.\n\nBe ready for delibs! Our goal is to make delibs as streamlined as possible so please be ready with comments and evidence-backed decision recommendations"
      }
    }
  ]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedInterview, setEditedInterview] = useState(null);

  const handleActionItemToggle = (item) => {
    setActionItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleStartInterview = () => {
    navigate('/admin/interview-interface');
  };

  const handleViewDeliberations = () => {
    navigate('/admin/deliberations');
  };

  const handleEditInterview = (interviewId) => {
    const interview = interviews.find(i => i.id === interviewId);
    setEditedInterview({...interview});
    setIsEditMode(true);
  };

  const handleSaveInterview = () => {
    setInterviews(prev => prev.map(interview => 
      interview.id === editedInterview.id ? editedInterview : interview
    ));
    setIsEditMode(false);
    setEditedInterview(null);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedInterview(null);
  };

  const handleFieldChange = (field, value) => {
    setEditedInterview(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDescriptionChange = (section, value) => {
    setEditedInterview(prev => ({
      ...prev,
      description: {
        ...prev.description,
        [section]: value
      }
    }));
  };

  const handleDeleteInterview = (interviewId) => {
    if (window.confirm('Are you sure you want to delete this interview?')) {
      setInterviews(prev => prev.filter(interview => interview.id !== interviewId));
    }
  };

  const handleCreateInterview = () => {
    navigate('/admin/interviews/create');
  };

  const handleDownloadResource = (resourceName) => {
    console.log(`Downloading ${resourceName}`);
  };

  const handleOpenResource = (resourceName) => {
    console.log(`Opening ${resourceName}`);
  };

  const currentInterview = interviews[0];

  return (
    <div className="admin-assigned-interviews-container">
      {/* Header Section */}
      <div className="interview-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon className="back-icon" />
          Back
        </button>
        <div className="header-actions">
          <button 
            className="btn-primary create-interview-btn"
            onClick={handleCreateInterview}
          >
            <PlusIcon className="btn-icon" />
            Create Interview
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="interview-content-new">
        {/* Left Column - Main Content */}
        <div className="left-column">
          {/* Top Section - Interview Details */}
          <div className="top-section">
            {/* Date Block */}
            <div className="date-block-new">
              <div className="date-day">Friday</div>
              <div className="date-number">09</div>
              <div className="date-month">Sep, 2025</div>
            </div>

            {/* Interview Title */}
            <div className="interview-title-section">
              {isEditMode ? (
                <input
                  type="text"
                  value={editedInterview.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="edit-input title-input-new"
                />
              ) : (
                <h1 className="interview-title-new">{currentInterview.title}</h1>
              )}
              
              <div className="time-info">
                {isEditMode ? (
                  <div className="time-edit">
                    <input
                      type="text"
                      value={editedInterview.time}
                      onChange={(e) => handleFieldChange('time', e.target.value)}
                      className="edit-input time-input-small"
                      placeholder="5:00 - 7:00 PM"
                    />
                    <div className="delibs-time">
                      <span>Delibs @ </span>
                      <input
                        type="text"
                        value={editedInterview.deliberations}
                        onChange={(e) => handleFieldChange('deliberations', e.target.value)}
                        className="edit-input time-input-small"
                        placeholder="7:00 - 8:00 PM"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="main-time">{currentInterview.time}</div>
                    <div className="delibs-time">Delibs @ {currentInterview.deliberations}</div>
                  </>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="location-section">
              <div className="section-label">Location</div>
              {isEditMode ? (
                <div className="location-edit-new">
                  <input
                    type="text"
                    value={editedInterview.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    className="edit-input"
                    placeholder="Location"
                  />
                  <span> | </span>
                  <input
                    type="text"
                    value={editedInterview.dresscode}
                    onChange={(e) => handleFieldChange('dresscode', e.target.value)}
                    className="edit-input"
                    placeholder="Dresscode"
                  />
                </div>
              ) : (
                <div className="location-info">{currentInterview.location} | {currentInterview.dresscode}</div>
              )}
            </div>

            {/* Interviewees and Team */}
            <div className="stats-section">
              <div className="stat-row">
                <div className="section-label">Interviewees</div>
                {isEditMode ? (
                  <input
                    type="number"
                    value={editedInterview.interviewees}
                    onChange={(e) => handleFieldChange('interviewees', parseInt(e.target.value))}
                    className="edit-input number-input-small"
                    min="1"
                  />
                ) : (
                  <div className="stat-value">{currentInterview.interviewees}</div>
                )}
              </div>
              <div className="stat-row">
                <div className="section-label">Team</div>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedInterview.team}
                    onChange={(e) => handleFieldChange('team', e.target.value)}
                    className="edit-input"
                    placeholder="Team information"
                  />
                ) : (
                  <div className="stat-value">{currentInterview.team}</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-new">
              <button 
                className="btn-primary start-interview-btn-new"
                onClick={handleStartInterview}
              >
                Start Interview
              </button>
              <button 
                className="btn-secondary deliberations-btn-new"
                onClick={handleViewDeliberations}
              >
                View Deliberations
              </button>
            </div>

            {/* Admin Actions */}
            <div className="admin-actions-new">
              {isEditMode ? (
                <>
                  <button 
                    className="btn-primary save-btn-new"
                    onClick={handleSaveInterview}
                  >
                    <CheckIcon className="btn-icon" />
                    Save Changes
                  </button>
                  <button 
                    className="btn-secondary cancel-btn-new"
                    onClick={handleCancelEdit}
                  >
                    <XMarkIcon className="btn-icon" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary edit-btn-new"
                    onClick={() => handleEditInterview(1)}
                  >
                    <PencilIcon className="btn-icon" />
                    Edit Interview
                  </button>
                  <button 
                    className="btn-danger delete-btn-new"
                    onClick={() => handleDeleteInterview(1)}
                  >
                    <TrashIcon className="btn-icon" />
                    Delete Interview
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Section - Description */}
          <div className="main-section">
            <div className="description-header">
              <h3>Description:</h3>
            </div>
            
            <div className="description-content-new">
              <div className="description-block">
                <h4>Before Interviews:</h4>
                {isEditMode ? (
                  <textarea
                    value={editedInterview.description.beforeInterviews}
                    onChange={(e) => handleDescriptionChange('beforeInterviews', e.target.value)}
                    className="edit-textarea description-textarea-new"
                    rows={4}
                  />
                ) : (
                  <div className="description-text">
                    {currentInterview.description.beforeInterviews.split('\n').map((line, index) => (
                      <div key={index}>{index === 0 ? `${index + 1}. ${line}` : line}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="description-block">
                <h4>During Interviews:</h4>
                {isEditMode ? (
                  <textarea
                    value={editedInterview.description.duringInterviews}
                    onChange={(e) => handleDescriptionChange('duringInterviews', e.target.value)}
                    className="edit-textarea description-textarea-new"
                    rows={4}
                  />
                ) : (
                  <div className="description-text">
                    {currentInterview.description.duringInterviews.split('\n').map((line, index) => (
                      <div key={index}>{index === 0 ? `${index + 1}. ${line}` : line}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="description-block">
                <h4>After interviews:</h4>
                {isEditMode ? (
                  <textarea
                    value={editedInterview.description.afterInterviews}
                    onChange={(e) => handleDescriptionChange('afterInterviews', e.target.value)}
                    className="edit-textarea description-textarea-new"
                    rows={3}
                  />
                ) : (
                  <div className="description-text">
                    {currentInterview.description.afterInterviews.split('\n').map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="right-column">
          {/* Action Items */}
          <div className="action-items-section-new">
            <h3>Action Items</h3>
            <div className="action-item-new">
              <label className="checkbox-container-new">
                <input
                  type="checkbox"
                  checked={actionItems.reviewInstructions}
                  onChange={() => handleActionItemToggle('reviewInstructions')}
                />
                <span className="checkmark-new"></span>
                Review Interview Instructions Guide
              </label>
              <button 
                className="external-link-btn-new"
                onClick={() => handleOpenResource('Interview Instructions')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>
            
            <div className="action-item-new">
              <label className="checkbox-container-new">
                <input
                  type="checkbox"
                  checked={actionItems.fillQuestions}
                  onChange={() => handleActionItemToggle('fillQuestions')}
                />
                <span className="checkmark-new"></span>
                Fill Out Interview Questions!!
              </label>
              <button 
                className="external-link-btn-new"
                onClick={() => handleOpenResource('Interview Questions')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>

            <div className="action-item-new">
              <label className="checkbox-container-new">
                <input
                  type="checkbox"
                  checked={actionItems.createMarketSizing}
                  onChange={() => handleActionItemToggle('createMarketSizing')}
                />
                <span className="checkmark-new"></span>
                Create Market Sizing Question
              </label>
              <button 
                className="external-link-btn-new"
                onClick={() => handleOpenResource('Market Sizing')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>

            <div className="action-item-new">
              <label className="checkbox-container-new">
                <input
                  type="checkbox"
                  checked={actionItems.reviewResumes}
                  onChange={() => handleActionItemToggle('reviewResumes')}
                />
                <span className="checkmark-new"></span>
                Review Applicants Resume, Cover Letter, and Video
              </label>
              <button 
                className="external-link-btn-new"
                onClick={() => handleOpenResource('Applicant Materials')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="resources-section-new">
            <h3>Resources</h3>
            <div className="resource-card-new">
              <div className="resource-info-new">
                <DocumentTextIcon className="resource-icon-new" />
                <span className="resource-label-new">Interview Instructions Guide</span>
              </div>
              <div className="resource-actions-new">
                <button 
                  className="resource-btn-new download-btn"
                  onClick={() => handleDownloadResource('Interview Instructions')}
                >
                  <ArrowDownTrayIcon className="resource-action-icon" />
                </button>
                <button 
                  className="resource-btn-new external-btn"
                  onClick={() => handleOpenResource('Interview Instructions')}
                >
                  <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                </button>
              </div>
            </div>
            
            <div className="resource-card-new">
              <div className="resource-info-new">
                <DocumentTextIcon className="resource-icon-new" />
                <span className="resource-label-new">Interview Questions Bank</span>
              </div>
              <div className="resource-actions-new">
                <button 
                  className="resource-btn-new download-btn"
                  onClick={() => handleDownloadResource('Interview Questions Bank')}
                >
                  <ArrowDownTrayIcon className="resource-action-icon" />
                </button>
                <button 
                  className="resource-btn-new external-btn"
                  onClick={() => handleOpenResource('Interview Questions Bank')}
                >
                  <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                </button>
              </div>
            </div>
          </div>

          {/* Interviewees */}
          <div className="interviewees-section">
            <h3>Interviewees</h3>
            <div className="interviewee-list">
              {[1, 2, 3, 4].map((_, index) => (
                <div key={index} className="interviewee-card">
                  <div className="interviewee-avatar">
                    <UserGroupIcon className="avatar-icon" />
                  </div>
                  <span className="interviewee-name">Ksenya Gotlieb</span>
                  <div className="interviewee-actions">
                    <button className="interviewee-action-btn">
                      <DocumentTextIcon className="action-icon" />
                    </button>
                    <button className="interviewee-action-btn">
                      <PencilIcon className="action-icon" />
                    </button>
                    <button className="interviewee-action-btn">
                      <PlayIcon className="action-icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}