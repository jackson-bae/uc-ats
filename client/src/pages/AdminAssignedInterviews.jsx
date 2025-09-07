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
  XMarkIcon,
  UsersIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import '../styles/AdminAssignedInterviews.css';

export default function AdminAssignedInterviews() {
  const navigate = useNavigate();
  const [allMembers, setAllMembers] = useState([]); // Combined list of admins and interviewers
  const [applications, setApplications] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newInterview, setNewInterview] = useState({
    title: '',
    interviewType: 'COFFEE_CHAT',
    startDate: '',
    endDate: '',
    location: '',
    dresscode: '',
  });
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState(null);
  const [interviewData, setInterviewData] = useState({});
  const [coffeeChatApplications, setCoffeeChatApplications] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedInterview, setEditedInterview] = useState(null);
  const [groupSelectionOpen, setGroupSelectionOpen] = useState(false);
  const [selectedInterviewForStart, setSelectedInterviewForStart] = useState(null);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [editingActionItems, setEditingActionItems] = useState(false);
  const [editingResources, setEditingResources] = useState(false);
  const [newActionItem, setNewActionItem] = useState('');
  const [newResource, setNewResource] = useState({ name: '', url: '' });
  const [actionItems, setActionItems] = useState({});
  const [resources, setResources] = useState({});

  // Fetch initial data
  useEffect(() => {
    const load = async () => {
      try {
        const [ivsRes, mems, adminUsers, apps, cycle] = await Promise.allSettled([
          apiClient.get('/admin/interviews'),
          apiClient.get('/admin/users?role=INTERVIEWER'),
          apiClient.get('/admin/users?role=ADMIN'),
          apiClient.get('/admin/applications'),
          apiClient.get('/admin/cycles/active')
        ]);

        const ivs = ivsRes.status === 'fulfilled' ? ivsRes.value : [];
        if (ivsRes.status === 'rejected') {
          console.warn('Interviews fetch failed, continuing without them');
        }

        setInterviews(ivs);
        const interviewers = mems.status === 'fulfilled' ? mems.value : [];
        const adminsList = adminUsers.status === 'fulfilled' ? adminUsers.value : [];
        
        // Combine admins and interviewers, adding a role property for identification
        const combined = [
          ...adminsList.map(admin => ({ ...admin, role: 'ADMIN', displayName: `${admin.fullName} (Admin)` })),
          ...interviewers.map(interviewer => ({ ...interviewer, role: 'INTERVIEWER', displayName: `${interviewer.fullName}` }))
        ];
        setAllMembers(combined);
        
        const allApps = apps.status === 'fulfilled' ? apps.value : [];
        setApplications(allApps);
        // Filter applications for Coffee Chat round
        // Use status to identify Coffee Chat candidates (UNDER_REVIEW)
        const coffeeChatApps = allApps.filter(app => app.status === 'UNDER_REVIEW');
        setCoffeeChatApplications(coffeeChatApps);
        setActiveCycle(cycle.status === 'fulfilled' ? cycle.value : null);

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
          initialData[interview.id] = {
            memberGroups: parsed?.memberGroups || [],
            applicationGroups: parsed?.applicationGroups || [],
            groupAssignments: parsed?.groupAssignments || {} // Maps memberGroupId to array of applicationGroupIds
          };
        });
        setInterviewData(initialData);
      } catch (e) {
        console.error('Failed to load interview data', e);
      }
    };
    load();
  }, []);


  const handleStartInterview = (interviewId) => {
    setSelectedInterviewForStart(interviewId);
    setGroupSelectionOpen(true);
    setGroupSearchTerm('');
    setSelectedGroups([]);
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        // Remove group if already selected
        return prev.filter(id => id !== groupId);
      } else if (prev.length < 3) {
        // Add group if less than 3 selected
        return [...prev, groupId];
      }
      // Don't add if already at max (3 groups)
      return prev;
    });
  };

  const handleStartWithSelectedGroups = () => {
    if (selectedGroups.length === 0) return;
    
    // Navigate to interview interface with selected groups
    const groupIdsParam = selectedGroups.join(',');
    navigate(`/admin/interview-interface?interviewId=${selectedInterviewForStart}&groupIds=${groupIdsParam}`);
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


  const handleDeleteInterview = async (interviewId) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) return;
    try {
      await apiClient.delete(`/admin/interviews/${interviewId}`);
      setInterviews(prev => prev.filter(interview => interview.id !== interviewId));
      if (selectedInterviewId === interviewId) setSelectedInterviewId(null);
      if (expandedInterviewId === interviewId) setExpandedInterviewId(null);
    } catch (e) {
      console.error('Failed to delete interview', e);
      alert(e.message || 'Failed to delete interview');
    }
  };

  const handleCreateInterview = () => {
    setCreateOpen(true);
  };

  const submitCreateInterview = async () => {
    if (!activeCycle) return;
    setCreating(true);
    try {
      const payload = {
        ...newInterview,
        cycleId: activeCycle.id
      };
      const created = await apiClient.post('/admin/interviews', payload);
      const next = [created, ...interviews];
      setInterviews(next);
      setSelectedInterviewId(created.id);
      setEditedInterview(null);
      setGroups([]);
      setCreateOpen(false);
      setNewInterview({ title: '', interviewType: 'COFFEE_CHAT', startDate: '', endDate: '', location: '', dresscode: '' });
    } catch (e) {
      console.error('Failed to create interview', e);
      alert(e.message || 'Failed to create interview');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectInterview = (id) => {
    setSelectedInterviewId(id);
    setIsEditMode(false);
    setEditedInterview(null);
  };

  const toggleExpandInterview = async (id) => {
    if (expandedInterviewId === id) {
      setExpandedInterviewId(null);
    } else {
      setExpandedInterviewId(id);
      // Load action items and resources when expanding
      await loadInterviewData(id);
    }
  };

  const addMemberGroup = (interviewId) => {
    const currentGroups = interviewData[interviewId]?.memberGroups || [];
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        memberGroups: [
          ...currentGroups,
          { 
            id: crypto.randomUUID(), 
            name: `Member Group ${currentGroups.length + 1}`, 
            memberIds: [],
            notes: '' 
          }
        ]
      }
    }));
  };

  const addApplicationGroup = (interviewId) => {
    const currentGroups = interviewData[interviewId]?.applicationGroups || [];
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        applicationGroups: [
          ...currentGroups,
          { 
            id: crypto.randomUUID(), 
            name: `Application Group ${currentGroups.length + 1}`, 
            applicationIds: [],
            notes: '' 
          }
        ]
      }
    }));
  };

  const removeMemberGroup = (interviewId, groupId) => {
    const current = interviewData[interviewId] || { memberGroups: [], applicationGroups: [], groupAssignments: {} };
    const newAssignments = { ...current.groupAssignments };
    delete newAssignments[groupId];
    const updated = {
      ...current,
      memberGroups: (current.memberGroups || []).filter(g => g.id !== groupId),
      groupAssignments: newAssignments
    };
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: updated
    }));
    // Persist immediately so deletion is saved
    persistInterviewConfig(interviewId, updated, { silent: true });
  };

  const removeApplicationGroup = (interviewId, groupId) => {
    const current = interviewData[interviewId] || { memberGroups: [], applicationGroups: [], groupAssignments: {} };
    const newAssignments = {};
    Object.entries(current.groupAssignments || {}).forEach(([memberGroupId, appGroupIds]) => {
      newAssignments[memberGroupId] = (appGroupIds || []).filter(id => id !== groupId);
    });
    const updated = {
      ...current,
      applicationGroups: (current.applicationGroups || []).filter(g => g.id !== groupId),
      groupAssignments: newAssignments
    };
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: updated
    }));
    // Persist immediately so deletion is saved
    persistInterviewConfig(interviewId, updated, { silent: true });
  };

  const updateMemberGroup = (interviewId, groupId, changes) => {
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        memberGroups: prev[interviewId]?.memberGroups?.map(g => g.id === groupId ? { ...g, ...changes } : g) || []
      }
    }));
  };

  const updateApplicationGroup = (interviewId, groupId, changes) => {
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        applicationGroups: prev[interviewId]?.applicationGroups?.map(g => g.id === groupId ? { ...g, ...changes } : g) || []
      }
    }));
  };

  const assignGroupsToMemberGroup = (interviewId, memberGroupId, applicationGroupIds) => {
    setInterviewData(prev => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        groupAssignments: {
          ...prev[interviewId]?.groupAssignments,
          [memberGroupId]: applicationGroupIds
        }
      }
    }));
  };

  const saveInterviewData = async (interviewId) => {
    const data = interviewData[interviewId];
    if (!data) return;
    try {
      await apiClient.patch(`/admin/interviews/${interviewId}/config`, {
        type: 'full',
        config: data
      });
      // Update the interview's description with the new data
      setInterviews(prev => prev.map(iv => 
        iv.id === interviewId 
          ? { ...iv, description: JSON.stringify(data) } 
          : iv
      ));
      alert('Interview data saved');
    } catch (e) {
      console.error('Failed to save interview data', e);
      alert(e.message || 'Failed to save interview data');
    }
  };

  const persistInterviewConfig = async (interviewId, data, { silent = true } = {}) => {
    try {
      await apiClient.patch(`/admin/interviews/${interviewId}/config`, {
        type: 'full',
        config: data
      });
      setInterviews(prev => prev.map(iv => 
        iv.id === interviewId 
          ? { ...iv, description: JSON.stringify(data) } 
          : iv
      ));
      if (!silent) alert('Interview data saved');
    } catch (e) {
      console.error('Failed to persist interview config', e);
      if (!silent) alert(e.message || 'Failed to save interview data');
    }
  };

  const handleDownloadResource = (resourceName) => {
    console.log(`Downloading ${resourceName}`);
  };

  const handleOpenResource = (resourceName) => {
    console.log(`Opening ${resourceName}`);
  };

  // Load action items and resources for a specific interview
  const loadInterviewData = async (interviewId) => {
    try {
      const [actionItemsRes, resourcesRes] = await Promise.allSettled([
        apiClient.get(`/admin/interviews/${interviewId}/action-items`),
        apiClient.get(`/admin/interviews/${interviewId}/resources`)
      ]);

      const actionItemsData = actionItemsRes.status === 'fulfilled' ? actionItemsRes.value : [];
      const resourcesData = resourcesRes.status === 'fulfilled' ? resourcesRes.value : [];

      setActionItems(prev => ({
        ...prev,
        [interviewId]: actionItemsData
      }));

      setResources(prev => ({
        ...prev,
        [interviewId]: resourcesData
      }));
    } catch (error) {
      console.error('Failed to load interview data:', error);
    }
  };

  // Action Items Management
  const addCustomActionItem = async (interviewId) => {
    if (!newActionItem.trim()) return;
    
    try {
      const response = await apiClient.post(`/admin/interviews/${interviewId}/action-items`, {
        title: newActionItem.trim(),
        order: (actionItems[interviewId]?.length || 0)
      });
      
      setActionItems(prev => ({
        ...prev,
        [interviewId]: [...(prev[interviewId] || []), response]
      }));
      setNewActionItem('');
    } catch (error) {
      console.error('Failed to add action item:', error);
      alert('Failed to add action item');
    }
  };

  const removeCustomActionItem = async (interviewId, actionItemId) => {
    try {
      await apiClient.delete(`/admin/interviews/${interviewId}/action-items/${actionItemId}`);
      
      setActionItems(prev => ({
        ...prev,
        [interviewId]: (prev[interviewId] || []).filter(item => item.id !== actionItemId)
      }));
    } catch (error) {
      console.error('Failed to remove action item:', error);
      alert('Failed to remove action item');
    }
  };

  const updateActionItem = async (interviewId, actionItemId, updates) => {
    try {
      const response = await apiClient.patch(`/admin/interviews/${interviewId}/action-items/${actionItemId}`, updates);
      
      setActionItems(prev => ({
        ...prev,
        [interviewId]: (prev[interviewId] || []).map(item => 
          item.id === actionItemId ? response : item
        )
      }));
    } catch (error) {
      console.error('Failed to update action item:', error);
      alert('Failed to update action item');
    }
  };

  const toggleActionItemCompletion = async (interviewId, actionItemId, isCompleted) => {
    await updateActionItem(interviewId, actionItemId, { isCompleted });
  };

  // Resources Management
  const addCustomResource = async (interviewId) => {
    if (!newResource.name.trim() || !newResource.url.trim()) return;
    
    try {
      const response = await apiClient.post(`/admin/interviews/${interviewId}/resources`, {
        title: newResource.name.trim(),
        url: newResource.url.trim(),
        order: (resources[interviewId]?.length || 0)
      });
      
      setResources(prev => ({
        ...prev,
        [interviewId]: [...(prev[interviewId] || []), response]
      }));
      setNewResource({ name: '', url: '' });
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert('Failed to add resource');
    }
  };

  const removeCustomResource = async (interviewId, resourceId) => {
    try {
      await apiClient.delete(`/admin/interviews/${interviewId}/resources/${resourceId}`);
      
      setResources(prev => ({
        ...prev,
        [interviewId]: (prev[interviewId] || []).filter(r => r.id !== resourceId)
      }));
    } catch (error) {
      console.error('Failed to remove resource:', error);
      alert('Failed to remove resource');
    }
  };

  const updateResource = async (interviewId, resourceId, updates) => {
    try {
      const response = await apiClient.patch(`/admin/interviews/${interviewId}/resources/${resourceId}`, updates);
      
      setResources(prev => ({
        ...prev,
        [interviewId]: (prev[interviewId] || []).map(r => 
          r.id === resourceId ? response : r
        )
      }));
    } catch (error) {
      console.error('Failed to update resource:', error);
      alert('Failed to update resource');
    }
  };

  return (
    <div className="admin-assigned-interviews-container">
      {createOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Interview</h3>
              <button className="icon-btn" onClick={() => setCreateOpen(false)}>
                <XMarkIcon className="btn-icon" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>Title</label>
                <input type="text" value={newInterview.title} onChange={e => setNewInterview({ ...newInterview, title: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Type</label>
                <select value={newInterview.interviewType} onChange={e => setNewInterview({ ...newInterview, interviewType: e.target.value })}>
                  <option value="COFFEE_CHAT">Coffee Chat</option>
                  <option value="ROUND_ONE">Round 1</option>
                  <option value="ROUND_TWO">Round 2</option>
                </select>
              </div>
              <div className="form-row two-col">
                <div>
                  <label>Start</label>
                  <input type="datetime-local" value={newInterview.startDate} onChange={e => setNewInterview({ ...newInterview, startDate: e.target.value })} />
                </div>
                <div>
                  <label>End</label>
                  <input type="datetime-local" value={newInterview.endDate} onChange={e => setNewInterview({ ...newInterview, endDate: e.target.value })} />
                </div>
              </div>
              <div className="form-row two-col">
                <div>
                  <label>Location</label>
                  <input type="text" value={newInterview.location} onChange={e => setNewInterview({ ...newInterview, location: e.target.value })} />
                </div>
                <div>
                  <label>Dresscode</label>
                  <input type="text" value={newInterview.dresscode} onChange={e => setNewInterview({ ...newInterview, dresscode: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={submitCreateInterview} disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

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
                const filteredGroups = data.applicationGroups.filter(group =>
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

      {/* Main Content - Interview Cards Grid */}
      <div className="interviews-grid">
        {interviews.length === 0 ? (
          <div className="no-interviews-card">
            <div className="no-interviews-icon">
              <CalendarIcon className="empty-icon" />
            </div>
            <h2>No Interviews Scheduled</h2>
            <p>Create your first interview to get started</p>
            <button className="btn-primary" onClick={handleCreateInterview}>
              <PlusIcon className="btn-icon" />
              Create First Interview
            </button>
          </div>
        ) : (
          interviews.map((interview) => {
            const startDate = new Date(interview.startDate);
            const endDate = new Date(interview.endDate);
            const isSelected = interview.id === selectedInterviewId;
            const isBeingEdited = isEditMode && editedInterview?.id === interview.id;
            const isExpanded = expandedInterviewId === interview.id;
            const data = interviewData[interview.id] || { 
              memberGroups: [], 
              applicationGroups: [], 
              groupAssignments: {}
            };
            
            return (
              <div 
                key={interview.id} 
                className={`interview-card ${isSelected ? 'selected' : ''} ${isBeingEdited ? 'editing' : ''} ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Card Header */}
                <div className="interview-card-header" onClick={() => !isExpanded && handleSelectInterview(interview.id)}>
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
                    {isBeingEdited ? (
                      <>
                        <button 
                          className="icon-btn save"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveInterview();
                          }}
                          title="Save Changes"
                        >
                          <CheckIcon className="btn-icon" />
                        </button>
                        <button 
                          className="icon-btn cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          title="Cancel"
                        >
                          <XMarkIcon className="btn-icon" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="icon-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInterview(interview.id);
                          }}
                          title="Edit Interview"
                        >
                          <PencilIcon className="btn-icon" />
                        </button>
                        <button 
                          className="icon-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInterview(interview.id);
                          }}
                          title="Delete Interview"
                        >
                          <TrashIcon className="btn-icon" />
                        </button>
                      </>
                    )}
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
                      {isBeingEdited ? (
                        <input
                          type="text"
                          value={editedInterview.title}
                          onChange={(e) => handleFieldChange('title', e.target.value)}
                          className="edit-input interview-title-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="interview-card-title">{interview.title}</h3>
                      )}
                      
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
                          {isBeingEdited ? (
                            <input
                              type="text"
                              value={editedInterview.location}
                              onChange={(e) => handleFieldChange('location', e.target.value)}
                              className="edit-input location-input"
                              placeholder="Location"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span>{interview.location || 'No location set'}</span>
                          )}
                        </div>
                        
                        <div className="detail-item">
                          <UserGroupIcon className="detail-icon" />
                          {isBeingEdited ? (
                            <input
                              type="text"
                              value={editedInterview.dresscode}
                              onChange={(e) => handleFieldChange('dresscode', e.target.value)}
                              className="edit-input dresscode-input"
                              placeholder="Dress code"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span>{interview.dresscode || 'No dress code specified'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Groups Summary - Show when not expanded */}
                  {!isExpanded && isSelected && (data.memberGroups.length > 0 || data.applicationGroups.length > 0) && (
                    <div className="interview-groups-summary">
                      <div className="groups-header">
                        <span className="groups-label">Groups:</span>
                        <span className="groups-count">
                          {data.memberGroups.length} member, {data.applicationGroups.length} application
                        </span>
                      </div>
                      <div className="groups-preview">
                        <div className="preview-section">
                          <UsersIcon className="group-type-icon" />
                          <span className="preview-label">Member Groups: </span>
                          <span className="preview-value">
                            {data.memberGroups.length > 0 
                              ? data.memberGroups.slice(0, 2).map(g => g.name).join(', ')
                              : 'None'}
                            {data.memberGroups.length > 2 && ` +${data.memberGroups.length - 2} more`}
                          </span>
                        </div>
                        <div className="preview-section">
                          <DocumentDuplicateIcon className="group-type-icon" />
                          <span className="preview-label">Application Groups: </span>
                          <span className="preview-value">
                            {data.applicationGroups.length > 0 
                              ? data.applicationGroups.slice(0, 2).map(g => g.name).join(', ')
                              : 'None'}
                            {data.applicationGroups.length > 2 && ` +${data.applicationGroups.length - 2} more`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="interview-expanded-content">
                      {/* Action Items Section */}
                      <div className="expanded-section">
                        <div className="expanded-section-header">
                          <h3 className="expanded-section-title">Action Items</h3>
                          <div className="section-actions">
                            <button 
                              className="btn-secondary small" 
                              onClick={() => setEditingActionItems(!editingActionItems)}
                            >
                              {editingActionItems ? 'Done Editing' : 'Edit Items'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="action-items-grid">
                          {(actionItems[interview.id] || []).map((actionItem) => (
                            <div key={actionItem.id} className="action-item-container">
                              <label className="action-item-checkbox">
                                <input
                                  type="checkbox"
                                  checked={actionItem.isCompleted || false}
                                  onChange={(e) => toggleActionItemCompletion(interview.id, actionItem.id, e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                {editingActionItems ? (
                                  <input
                                    type="text"
                                    value={actionItem.title}
                                    onChange={(e) => updateActionItem(interview.id, actionItem.id, { title: e.target.value })}
                                    className="action-item-input"
                                    onBlur={() => {
                                      if (!actionItem.title.trim()) {
                                        removeCustomActionItem(interview.id, actionItem.id);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span>{actionItem.title}</span>
                                )}
                              </label>
                              {editingActionItems && (
                                <button
                                  className="action-item-remove-btn"
                                  onClick={() => removeCustomActionItem(interview.id, actionItem.id)}
                                  title="Remove action item"
                                >
                                  <XMarkIcon className="btn-icon" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {editingActionItems && (
                          <div className="add-action-item-section">
                            <div className="add-item-input-group">
                              <input
                                type="text"
                                value={newActionItem}
                                onChange={(e) => setNewActionItem(e.target.value)}
                                placeholder="Enter new action item..."
                                className="add-item-input"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addCustomActionItem(interview.id);
                                  }
                                }}
                              />
                              <button
                                className="btn-primary small"
                                onClick={() => addCustomActionItem(interview.id)}
                                disabled={!newActionItem.trim()}
                              >
                                <PlusIcon className="btn-icon" />
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resources Section */}
                      <div className="expanded-section">
                        <div className="expanded-section-header">
                          <h3 className="expanded-section-title">Resources</h3>
                          <div className="section-actions">
                            <button 
                              className="btn-secondary small" 
                              onClick={() => setEditingResources(!editingResources)}
                            >
                              {editingResources ? 'Done Editing' : 'Edit Resources'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="resources-grid">
                          {(resources[interview.id] || []).map(resource => (
                            <div key={resource.id} className="resource-item">
                              <DocumentTextIcon className="resource-icon" />
                              {editingResources ? (
                                <div className="resource-edit-fields">
                                  <input
                                    type="text"
                                    value={resource.title}
                                    onChange={(e) => updateResource(interview.id, resource.id, { title: e.target.value })}
                                    className="resource-name-input"
                                    placeholder="Resource name"
                                  />
                                  <input
                                    type="url"
                                    value={resource.url}
                                    onChange={(e) => updateResource(interview.id, resource.id, { url: e.target.value })}
                                    className="resource-url-input"
                                    placeholder="Resource URL"
                                  />
                                </div>
                              ) : (
                                <span className="resource-name">{resource.title}</span>
                              )}
                              <div className="resource-actions">
                                {editingResources ? (
                                  <button 
                                    className="resource-btn remove"
                                    onClick={() => removeCustomResource(interview.id, resource.id)}
                                    title="Remove resource"
                                  >
                                    <TrashIcon className="resource-action-icon" />
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      className="resource-btn"
                                      onClick={() => handleDownloadResource(resource.title)}
                                      title="Download"
                                    >
                                      <ArrowDownTrayIcon className="resource-action-icon" />
                                    </button>
                                    <button 
                                      className="resource-btn"
                                      onClick={() => window.open(resource.url, '_blank')}
                                      title="Open"
                                    >
                                      <ArrowTopRightOnSquareIcon className="resource-action-icon" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {editingResources && (
                          <div className="add-resource-section">
                            <div className="add-resource-input-group">
                              <input
                                type="text"
                                value={newResource.name}
                                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                placeholder="Resource name..."
                                className="add-resource-input"
                              />
                              <input
                                type="url"
                                value={newResource.url}
                                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                                placeholder="Resource URL..."
                                className="add-resource-input"
                              />
                              <button
                                className="btn-primary small"
                                onClick={() => addCustomResource(interview.id)}
                                disabled={!newResource.name.trim() || !newResource.url.trim()}
                              >
                                <PlusIcon className="btn-icon" />
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Groups Section */}
                      <div className="expanded-section">
                        <div className="expanded-section-header">
                          <h3 className="expanded-section-title">Group Assignments</h3>
                          <div className="section-actions">
                            <button className="btn-primary small" onClick={() => saveInterviewData(interview.id)}>
                              <CheckIcon className="btn-icon" /> Save All
                            </button>
                          </div>
                        </div>
                        
                        <div className="groups-split-container">
                          {/* Member Groups Column */}
                          <div className="groups-column">
                            <div className="column-header">
                              <h4><UsersIcon className="section-icon" /> Member Groups</h4>
                              <button className="btn-secondary small" onClick={() => addMemberGroup(interview.id)}>
                                <PlusIcon className="btn-icon" /> Add
                              </button>
                            </div>
                            <div className="groups-list">
                              {data.memberGroups?.length === 0 && (
                                <div className="empty-state">No member groups yet</div>
                              )}
                              {data.memberGroups?.map(group => (
                                <div key={group.id} className="group-card-compact">
                                  <div className="group-header-compact">
                                    <input
                                      className="group-name-input-compact"
                                      value={group.name || ''}
                                      onChange={e => updateMemberGroup(interview.id, group.id, { name: e.target.value })}
                                      placeholder="Group name"
                                    />
                                    <button className="icon-btn small" onClick={() => removeMemberGroup(interview.id, group.id)}>
                                      <TrashIcon className="btn-icon" />
                                    </button>
                                  </div>
                                  <div className="group-members-list">
                                    {/* Admins Section */}
                                    {allMembers.filter(m => m.role === 'ADMIN').length > 0 && (
                                      <>
                                        <div className="members-section-header">Admins</div>
                                        {allMembers.filter(m => m.role === 'ADMIN').map(m => (
                                          <label key={m.id} className="member-checkbox admin-member">
                                            <input
                                              type="checkbox"
                                              checked={group.memberIds?.includes(m.id) || false}
                                              onChange={e => {
                                                const next = new Set(group.memberIds || []);
                                                if (e.target.checked) next.add(m.id); else next.delete(m.id);
                                                updateMemberGroup(interview.id, group.id, { memberIds: Array.from(next) });
                                              }}
                                            />
                                            <span className="member-name">{m.displayName}</span>
                                          </label>
                                        ))}
                                      </>
                                    )}
                                    
                                    {/* Interviewers Section */}
                                    {allMembers.filter(m => m.role === 'INTERVIEWER').length > 0 && (
                                      <>
                                        <div className="members-section-header">Interviewers</div>
                                        {allMembers.filter(m => m.role === 'INTERVIEWER').map(m => (
                                          <label key={m.id} className="member-checkbox interviewer-member">
                                            <input
                                              type="checkbox"
                                              checked={group.memberIds?.includes(m.id) || false}
                                              onChange={e => {
                                                const next = new Set(group.memberIds || []);
                                                if (e.target.checked) next.add(m.id); else next.delete(m.id);
                                                updateMemberGroup(interview.id, group.id, { memberIds: Array.from(next) });
                                              }}
                                            />
                                            <span className="member-name">{m.displayName}</span>
                                          </label>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Application Groups Assignment */}
                                  <div className="group-assignments">
                                    <label className="assignments-label">Assigned Application Groups:</label>
                                    <div className="assignments-list">
                                      {data.applicationGroups?.map(appGroup => (
                                        <label key={appGroup.id} className="assignment-checkbox">
                                          <input
                                            type="checkbox"
                                            checked={data.groupAssignments?.[group.id]?.includes(appGroup.id) || false}
                                            onChange={e => {
                                              const currentAssignments = data.groupAssignments?.[group.id] || [];
                                              const newAssignments = e.target.checked
                                                ? [...currentAssignments, appGroup.id]
                                                : currentAssignments.filter(id => id !== appGroup.id);
                                              assignGroupsToMemberGroup(interview.id, group.id, newAssignments);
                                            }}
                                          />
                                          <span>{appGroup.name} ({appGroup.applicationIds?.length || 0} apps)</span>
                                        </label>
                                      ))}
                                      {data.applicationGroups?.length === 0 && (
                                        <span className="no-assignments">No application groups available</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Application Groups Column */}
                          <div className="groups-column">
                            <div className="column-header">
                              <h4><DocumentDuplicateIcon className="section-icon" /> Application Groups</h4>
                              <button className="btn-secondary small" onClick={() => addApplicationGroup(interview.id)}>
                                <PlusIcon className="btn-icon" /> Add
                              </button>
                            </div>
                            <div className="groups-list">
                              {data.applicationGroups?.length === 0 && (
                                <div className="empty-state">No application groups yet</div>
                              )}
                              {data.applicationGroups?.map(group => (
                                <div key={group.id} className="group-card-compact">
                                  <div className="group-header-compact">
                                    <input
                                      className="group-name-input-compact"
                                      value={group.name || ''}
                                      onChange={e => updateApplicationGroup(interview.id, group.id, { name: e.target.value })}
                                      placeholder="Group name"
                                    />
                                    <button className="icon-btn small" onClick={() => removeApplicationGroup(interview.id, group.id)}>
                                      <TrashIcon className="btn-icon" />
                                    </button>
                                  </div>
                                  <div className="group-applications-list">
                                    <div className="applications-label">Coffee Chat Round Applications:</div>
                                    {coffeeChatApplications.length === 0 ? (
                                      <div className="no-applications">No applications in coffee chat round</div>
                                    ) : (
                                      coffeeChatApplications.map(app => (
                                        <label key={app.id} className="application-checkbox">
                                          <input
                                            type="checkbox"
                                            checked={group.applicationIds?.includes(app.id) || false}
                                            onChange={e => {
                                              const next = new Set(group.applicationIds || []);
                                              if (e.target.checked) next.add(app.id); else next.delete(app.id);
                                              updateApplicationGroup(interview.id, group.id, { applicationIds: Array.from(next) });
                                            }}
                                          />
                                          <span>{app.name}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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
