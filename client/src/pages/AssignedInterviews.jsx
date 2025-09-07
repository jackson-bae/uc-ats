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
  XMarkIcon,
  UsersIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import '../styles/AdminAssignedInterviews.css';

export default function AssignedInterviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState(null);
  const [interviewData, setInterviewData] = useState({});
  const [groupSelectionOpen, setGroupSelectionOpen] = useState(false);
  const [selectedInterviewForStart, setSelectedInterviewForStart] = useState(null);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user information
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await apiClient.get('/member/profile');
        console.log('Current user loaded:', response);
        setCurrentUser(response);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch member's assigned interviews
  useEffect(() => {
    const loadMemberInterviews = async () => {
      try {
        const [ivsRes] = await Promise.allSettled([
          apiClient.get('/member/interviews')
        ]);

        const ivs = ivsRes.status === 'fulfilled' ? ivsRes.value : [];
        if (ivsRes.status === 'rejected') {
          console.warn('Interviews fetch failed, continuing without them');
        }

        setInterviews(ivs);

        console.log('Loaded interviews:', ivs);
        console.log('Interview types:', ivs.map(i => ({ id: i.id, title: i.title, type: i.interviewType })));

        // Auto-expand the first interview card by default
        if (ivs.length > 0) {
          setExpandedInterviewId(ivs[0].id);
          setSelectedInterviewId(ivs[0].id);
        }

        // Initialize interview-specific data for each interview
        const initialData = {};
        ivs.forEach(interview => {
          const desc = interview.description;
          let parsed;
          try {
            parsed = typeof desc === 'string' ? JSON.parse(desc) : desc;
          } catch {
            parsed = {};
          }
          
          console.log('Interview description for', interview.id, ':', parsed);
          initialData[interview.id] = {
            memberGroups: parsed?.memberGroups || [],
            applicationGroups: parsed?.applicationGroups || [],
            groupAssignments: parsed?.groupAssignments || {},
            actionItems: parsed?.actionItems || {
              reviewInstructions: false,
              fillQuestions: false,
              createMarketSizing: false,
              reviewResumes: false
            },
            resources: parsed?.resources || [
              { id: 1, name: 'Interview Instructions Guide', url: '#' },
              { id: 2, name: 'Interview Questions Bank', url: '#' }
            ]
          };
        });
        setInterviewData(initialData);
      } catch (e) {
        console.error('Failed to load interview data', e);
      }
    };
    loadMemberInterviews();
  }, []);

  const handleActionItemToggle = (interviewId, item) => {
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        actionItems: {
          ...prev[interviewId]?.actionItems,
          [item]: !prev[interviewId]?.actionItems?.[item]
        }
      }
    }));
  };

  const handleStartInterview = (interviewId) => {
    setSelectedInterviewForStart(interviewId);
    setGroupSelectionOpen(true);
    setGroupSearchTerm('');
    setSelectedGroups([]);
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else if (prev.length < 3) {
        return [...prev, groupId];
      }
      return prev;
    });
  };

  const handleStartWithSelectedGroups = () => {
    console.log('handleStartWithSelectedGroups called!');
    console.log('selectedGroups:', selectedGroups);
    console.log('selectedInterviewForStart:', selectedInterviewForStart);
    
    if (selectedGroups.length === 0) return;
    
    const groupIdsParam = selectedGroups.join(',');
    const interview = interviews.find(i => i.id === selectedInterviewForStart);
    
    console.log('Interview found:', interview);
    console.log('Interview type:', interview?.interviewType);
    console.log('Is ROUND_ONE?', interview?.interviewType === 'ROUND_ONE');
    
    // Route to appropriate interface based on interview type
    if (interview?.interviewType === 'ROUND_ONE') {
      console.log('Routing to first round interview interface');
      navigate(`/member/first-round-interview?interviewId=${selectedInterviewForStart}&groupIds=${groupIdsParam}`);
    } else {
      console.log('Routing to regular interview interface');
      navigate(`/member/interview-interface?interviewId=${selectedInterviewForStart}&groupIds=${groupIdsParam}`);
    }
    
    setGroupSelectionOpen(false);
    setSelectedInterviewForStart(null);
    setSelectedGroups([]);
  };

  const handleCloseGroupSelection = () => {
    setGroupSelectionOpen(false);
    setSelectedInterviewForStart(null);
    setGroupSearchTerm('');
    setSelectedGroups([]);
  };

  const handleViewDeliberations = () => {
    navigate('/deliberations');
  };

  const handleSelectInterview = (id) => {
    setSelectedInterviewId(id);
  };

  const toggleExpandInterview = (id) => {
    setExpandedInterviewId(expandedInterviewId === id ? null : id);
  };

  const handleDownloadResource = (resourceName) => {
    console.log(`Downloading ${resourceName}`);
  };

  const handleOpenResource = (resourceName) => {
    console.log(`Opening ${resourceName}`);
  };

  // Find which member group the current user belongs to for a given interview
  const getUserMemberGroup = (interviewId) => {
    if (!currentUser) {
      console.log('No current user found');
      return null;
    }
    
    const data = interviewData[interviewId];
    if (!data?.memberGroups) {
      console.log('No member groups found for interview:', interviewId, data);
      return null;
    }
    
    console.log('Looking for user in member groups:', {
      userId: currentUser.id,
      userIdType: typeof currentUser.id,
      memberGroups: data.memberGroups
    });
    
    // Log each member group's IDs for debugging
    data.memberGroups.forEach((group, index) => {
      console.log(`Member Group ${index + 1} (${group.name}):`, {
        memberIds: group.memberIds,
        memberIdTypes: group.memberIds?.map(id => typeof id)
      });
    });
    
    const userGroup = data.memberGroups.find(group => {
      const isInGroup = group.memberIds?.includes(currentUser.id);
      console.log(`Checking group "${group.name}":`, {
        groupMemberIds: group.memberIds,
        currentUserId: currentUser.id,
        isInGroup: isInGroup
      });
      return isInGroup;
    });
    
    console.log('Found user group:', userGroup);
    return userGroup;
  };

  return (
    <div className="admin-assigned-interviews-container">
      {/* Group Selection Modal */}
      {groupSelectionOpen && selectedInterviewForStart && (
        <div className="modal-overlay">
          <div className="modal-content group-selection-modal">
            <div className="modal-header">
              <h3>Select Application Groups to Evaluate</h3>
              <div className="selection-info">
                {selectedGroups.length}/3 groups selected
              </div>
              <button className="icon-btn" onClick={handleCloseGroupSelection}>
                <XMarkIcon className="btn-icon" />
              </button>
            </div>
            <div className="modal-body">
              {(() => {
                const interview = interviews.find(i => i.id === selectedInterviewForStart);
                const data = interviewData[selectedInterviewForStart] || { applicationGroups: [] };
                const filteredGroups = (data.applicationGroups || []).filter(group =>
                  group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
                );
                
                return (
                  <>
                    <div className="search-section">
                      <input
                        type="text"
                        placeholder="Search application groups..."
                        value={groupSearchTerm}
                        onChange={(e) => setGroupSearchTerm(e.target.value)}
                        className="group-search-input"
                      />
                    </div>
                    
                    <div className="groups-selection-list">
                      {filteredGroups.length === 0 ? (
                        <div className="no-groups-message">
                          {groupSearchTerm ? 'No groups match your search' : 'No application groups available'}
                        </div>
                      ) : (
                        filteredGroups.map(group => {
                          const isSelected = selectedGroups.includes(group.id);
                          const isDisabled = !isSelected && selectedGroups.length >= 3;
                          
                          return (
                            <div 
                              key={group.id} 
                              className={`group-selection-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && handleGroupToggle(group.id)}
                            >
                              <div className="group-checkbox">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => !isDisabled && handleGroupToggle(group.id)}
                                  disabled={isDisabled}
                                />
                                <span className="checkmark"></span>
                              </div>
                              <div className="group-info">
                                <h4 className="group-name">{group.name}</h4>
                                <p className="group-count">
                                  {group.applicationIds?.length || 0} applications
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseGroupSelection}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleStartWithSelectedGroups}
                disabled={selectedGroups.length === 0}
              >
                Start Interview ({selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="interview-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon className="back-icon" />
          Back
        </button>
      </div>

      {/* Main Content - Interview Cards Grid */}
      <div className="interviews-grid">
        {interviews.length === 0 ? (
          <div className="no-interviews-card">
            <div className="no-interviews-icon">
              <CalendarIcon className="empty-icon" />
            </div>
            <h2>No Interviews Assigned</h2>
            <p>You don't have any interviews assigned at this time</p>
          </div>
        ) : (
          interviews.map((interview) => {
            const startDate = new Date(interview.startDate);
            const endDate = new Date(interview.endDate);
            const isSelected = interview.id === selectedInterviewId;
            const isExpanded = expandedInterviewId === interview.id;
            const data = interviewData[interview.id] || { 
              actionItems: {}, 
              resources: [] 
            };
            
            return (
              <div 
                key={interview.id} 
                className={`interview-card ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Card Header */}
                <div className="interview-card-header" onClick={() => handleSelectInterview(interview.id)}>
                  <div className="interview-type-badge">
                    {interview.interviewType?.replace(/_/g, ' ')}
                  </div>
                  <div className="interview-card-actions">
                    <button 
                      className={`icon-btn expand ${isExpanded ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandInterview(interview.id);
                      }}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <XMarkIcon className="btn-icon" /> : <PlusIcon className="btn-icon" />}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="interview-card-body">
                  {/* Date Section */}
                  <div className="interview-date-section">
                    <div className="interview-date-badge">
                      <div className="date-day">{startDate.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="date-number">{startDate.getDate()}</div>
                      <div className="date-month">{startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                    </div>
                    
                    <div className="interview-info">
                      <h3 className="interview-card-title">{interview.title}</h3>
                      
                      <div className="interview-details">
                        <div className="detail-item">
                          <ClockIcon className="detail-icon" />
                          <span>
                            {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                            {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="detail-item">
                          <MapPinIcon className="detail-icon" />
                          <span>{interview.location || 'No location set'}</span>
                        </div>
                        
                        <div className="detail-item">
                          <UserGroupIcon className="detail-icon" />
                          <span>{interview.dresscode || 'No dress code specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member Group Assignment - Show when not expanded */}
                  {!isExpanded && isSelected && currentUser && (() => {
                    const userGroup = getUserMemberGroup(interview.id);
                    return (
                      <div className="interview-groups-summary">
                        <div className="groups-header">
                          <span className="groups-label">Your Assignment:</span>
                        </div>
                        <div className="groups-preview">
                          {userGroup ? (
                            <div className="preview-section">
                              <UsersIcon className="group-type-icon" />
                              <span className="preview-label">Member Group: </span>
                              <span className="preview-value">{userGroup.name}</span>
                            </div>
                          ) : (
                            <div className="preview-section">
                              <UsersIcon className="group-type-icon" />
                              <span className="preview-label">Member Group: </span>
                              <span className="preview-value" style={{color: 'var(--status-warning-text)'}}>
                                Not assigned to any group
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="interview-expanded-content">
                      {/* Member Assignment Section */}
                      {currentUser && (() => {
                        const userGroup = getUserMemberGroup(interview.id);
                        return (
                          <div className="expanded-section">
                            <h3 className="expanded-section-title">Your Assignment</h3>
                            <div className="assignment-details">
                              {userGroup ? (
                                <>
                                  <div className="assignment-item">
                                    <UsersIcon className="assignment-icon" />
                                    <div className="assignment-info">
                                      <span className="assignment-label">Member Group:</span>
                                      <span className="assignment-value">{userGroup.name}</span>
                                    </div>
                                  </div>
                                  {userGroup.notes && (
                                    <div className="assignment-notes">
                                      <span className="notes-label">Notes:</span>
                                      <span className="notes-value">{userGroup.notes}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="assignment-item">
                                  <UsersIcon className="assignment-icon" />
                                  <div className="assignment-info">
                                    <span className="assignment-label">Member Group:</span>
                                    <span className="assignment-value" style={{color: 'var(--status-warning-text)'}}>
                                      Not assigned to any group
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action Items Section */}
                      <div className="expanded-section">
                        <h3 className="expanded-section-title">Action Items</h3>
                        <div className="action-items-grid">
                          <label className="action-item-checkbox">
                            <input
                              type="checkbox"
                              checked={data.actionItems?.reviewInstructions || false}
                              onChange={() => handleActionItemToggle(interview.id, 'reviewInstructions')}
                            />
                            <span className="checkmark"></span>
                            <span>Review Interview Instructions Guide</span>
                          </label>
                          <label className="action-item-checkbox">
                            <input
                              type="checkbox"
                              checked={data.actionItems?.fillQuestions || false}
                              onChange={() => handleActionItemToggle(interview.id, 'fillQuestions')}
                            />
                            <span className="checkmark"></span>
                            <span>Fill Out Interview Questions</span>
                          </label>
                          <label className="action-item-checkbox">
                            <input
                              type="checkbox"
                              checked={data.actionItems?.createMarketSizing || false}
                              onChange={() => handleActionItemToggle(interview.id, 'createMarketSizing')}
                            />
                            <span className="checkmark"></span>
                            <span>Create Market Sizing Questions</span>
                          </label>
                          <label className="action-item-checkbox">
                            <input
                              type="checkbox"
                              checked={data.actionItems?.reviewResumes || false}
                              onChange={() => handleActionItemToggle(interview.id, 'reviewResumes')}
                            />
                            <span className="checkmark"></span>
                            <span>Review Applicant Resumes</span>
                          </label>
                        </div>
                      </div>

                      {/* Resources Section */}
                      <div className="expanded-section">
                        <h3 className="expanded-section-title">Resources</h3>
                        <div className="resources-grid">
                          {data.resources?.map(resource => (
                            <div key={resource.id} className="resource-item">
                              <DocumentTextIcon className="resource-icon" />
                              <span className="resource-name">{resource.name}</span>
                              <div className="resource-actions">
                                <button 
                                  className="resource-btn"
                                  onClick={() => handleDownloadResource(resource.name)}
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="resource-action-icon" />
                                </button>
                                <button 
                                  className="resource-btn"
                                  onClick={() => handleOpenResource(resource.name)}
                                  title="Open"
                                >
                                  <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="interview-card-footer">
                  <button 
                    className="btn-primary interview-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInterviewId(interview.id);
                      handleStartInterview(interview.id);
                    }}
                  >
                    <PlayIcon className="btn-icon" />
                    Start Interview
                  </button>
                  <button 
                    className="btn-secondary interview-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInterviewId(interview.id);
                      handleViewDeliberations();
                    }}
                  >
                    <EyeIcon className="btn-icon" />
                    Deliberations
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
