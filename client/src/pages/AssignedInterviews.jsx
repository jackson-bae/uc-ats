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
  EyeIcon
} from '@heroicons/react/24/outline';
import UConsultingLogo from '../components/UConsultingLogo';
import '../styles/AssignedInterviews.css';

export default function AssignedInterviews() {
  const navigate = useNavigate();
  const [actionItems, setActionItems] = useState({
    reviewExpectations: true,
    fillQuestions: false
  });

  const handleActionItemToggle = (item) => {
    setActionItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleStartInterview = () => {
    // Navigate to interview interface
    navigate('/interview-interface');
  };

  const handleViewDeliberations = () => {
    // Navigate to deliberations page
    navigate('/deliberations');
  };

  const handleDownloadResource = (resourceName) => {
    // Handle resource download
    console.log(`Downloading ${resourceName}`);
  };

  const handleOpenResource = (resourceName) => {
    // Handle opening resource in new tab
    console.log(`Opening ${resourceName}`);
  };

  return (
    <div className="assigned-interviews-container">
      {/* Header Section */}
      <div className="interview-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon className="back-icon" />
          Back
        </button>
        <div className="social-links">
          <span>Follow us on:</span>
          {/* Social media icons would go here */}
        </div>
      </div>

      {/* Main Content */}
      <div className="interview-content">
        {/* Left Column - Event Overview */}
        <div className="event-overview">
          {/* Date Block */}
          <div className="date-block">
            <div className="date-day">Friday</div>
            <div className="date-number">09</div>
            <div className="date-month">Sep, 2025</div>
          </div>

          {/* Event Title and Times */}
          <div className="event-title">
            <h1>Coffee Chats (Round 1)</h1>
            <div className="event-times">
              <div className="time-slot">
                <ClockIcon className="time-icon" />
                <span>5:00 - 7:00 PM</span>
              </div>
              <div className="time-slot deliberations">
                <ClockIcon className="time-icon" />
                <span>Delibs @ 7:00 - 8:00 PM</span>
              </div>
            </div>
          </div>

          {/* Location and Dresscode */}
          <div className="event-details">
            <div className="detail-item">
              <MapPinIcon className="detail-icon" />
              <span>Location: Hanes Hall Room 100 | Business Casual</span>
            </div>
          </div>

          {/* Candidates and Team */}
          <div className="event-stats">
            <div className="stat-item">
              <UserGroupIcon className="stat-icon" />
              <span>Candidates: 50</span>
            </div>
            <div className="stat-item">
              <UserGroupIcon className="stat-icon" />
              <span>Team: Group 7 with: Ksenya Gotlieb</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn-primary start-interview-btn"
              onClick={handleStartInterview}
            >
              <PlayIcon className="btn-icon" />
              Start Interview
            </button>
            <button 
              className="btn-secondary deliberations-btn"
              onClick={handleViewDeliberations}
            >
              <EyeIcon className="btn-icon" />
              View Deliberations
            </button>
          </div>
        </div>

        {/* Main Column - Event Description */}
        <div className="event-description">
          <div className="description-section">
            <h3>Description</h3>
            <div className="description-content">
              <div className="key-info">
                <strong>Key Information:</strong> It is NECCESSARY for you to review our candidate rubric and question bank prior to the event, and record your planned questions on the table provided to ensure there are no repeats
              </div>
              
              <div className="info-item">
                <strong>Time:</strong> Arrive by 5:45. Coffee chat ends at 8:00PM and delibs will be right after, approximately an hour
              </div>
              
              <div className="info-item">
                <strong>Dresscode:</strong> Business Casual
              </div>
              
              <div className="info-item">
                <strong>What to bring:</strong> Laptop or something else for note-taking
              </div>
              
              <div className="info-item">
                <strong>How This Will Work:</strong> Each round is 10 minutes. You will stay at your assigned table while the candidates move around. On the applicants name tag, you will see either an ↑ or ↓. If they have an ↑, they will move to the UC member with the number above, If they have an ↓, they should move to the member with the number below.
              </div>
              
              <div className="info-item">
                <strong>Tips:</strong> Take notes and make a judgement on Yes/Maybe/No for each candidate right after each round because it's easy to forget after many rounds.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Action Items & Resources */}
        <div className="right-sidebar">
          {/* Action Items */}
          <div className="action-items-section">
            <h3>Action Items</h3>
            <div className="action-item">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={actionItems.reviewExpectations}
                  onChange={() => handleActionItemToggle('reviewExpectations')}
                />
                <span className="checkmark"></span>
                Review Candidate Expectations
              </label>
              <button 
                className="external-link-btn"
                onClick={() => handleOpenResource('Candidate Expectations')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>
            
            <div className="action-item">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={actionItems.fillQuestions}
                  onChange={() => handleActionItemToggle('fillQuestions')}
                />
                <span className="checkmark"></span>
                Fill Out Interview Questions!!
              </label>
              <button 
                className="external-link-btn"
                onClick={() => handleOpenResource('Interview Questions')}
              >
                <ArrowTopRightOnSquareIcon className="external-link-icon" />
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="resources-section">
            <h3>Resources</h3>
            <div className="resource-card">
              <div className="resource-info">
                <DocumentTextIcon className="resource-icon" />
                <span className="resource-label">Candidate Expectations</span>
              </div>
              <div className="resource-actions">
                <button 
                  className="resource-btn download-btn"
                  onClick={() => handleDownloadResource('Candidate Expectations')}
                >
                  <ArrowDownTrayIcon className="resource-action-icon" />
                </button>
                <button 
                  className="resource-btn external-btn"
                  onClick={() => handleOpenResource('Candidate Expectations')}
                >
                  <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                </button>
              </div>
            </div>
            
            <div className="resource-card">
              <div className="resource-info">
                <DocumentTextIcon className="resource-icon" />
                <span className="resource-label">Interview Questions Bank</span>
              </div>
              <div className="resource-actions">
                <button 
                  className="resource-btn download-btn"
                  onClick={() => handleDownloadResource('Interview Questions Bank')}
                >
                  <ArrowDownTrayIcon className="resource-action-icon" />
                </button>
                <button 
                  className="resource-btn external-btn"
                  onClick={() => handleOpenResource('Interview Questions Bank')}
                >
                  <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
