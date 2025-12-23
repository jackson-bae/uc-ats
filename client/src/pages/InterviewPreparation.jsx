import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AccessControl from '../components/AccessControl';
import '../styles/InterviewPreparation.css';

// Icons for the resources
const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 2H20V22H6.5C5.11929 22 4 20.8807 4 19.5V4.5C4 3.11929 5.11929 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XMarkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CoffeeChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 2h12l-1 14H4L3 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 2h4v4h-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 16v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 16v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ApplicationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ResourceCard = ({ resource, onClick, onEdit, onDelete, isAdmin = false }) => {
  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'people':
        return PeopleIcon;
      case 'globe':
        return GlobeIcon;
      case 'coffee':
        return CoffeeChatIcon;
      case 'application':
        return ApplicationIcon;
      default:
        return BookIcon;
    }
  };

  const Icon = getIconComponent(resource.icon);

  return (
    <div className="resource-card" onClick={onClick}>
      <div className="resource-icon">
        <Icon />
      </div>
      <div className="resource-content">
        <h3 className="resource-title">{resource.title}</h3>
        <p className="resource-description">{resource.description}</p>
      </div>
      {resource.hasExternalLink && (
        <div className="external-link-icon">
          <ExternalLinkIcon />
        </div>
      )}
      {isAdmin && (
        <div className="resource-actions">
          {onEdit && (
            <button 
              className="edit-resource-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(resource);
              }}
              title="Edit resource"
            >
              <PencilIcon />
            </button>
          )}
          {onDelete && (
            <button 
              className="delete-resource-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(resource.id);
              }}
              title="Delete resource"
            >
              <XMarkIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ResourceModal = ({ isOpen, onClose, onSave, resource = null, round }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    hasExternalLink: true,
    icon: 'book',
    round: ''
  });

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title,
        description: resource.description,
        url: resource.url || '',
        hasExternalLink: resource.hasExternalLink,
        icon: resource.icon,
        round: round || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        url: '',
        hasExternalLink: true,
        icon: 'book',
        round: round || ''
      });
    }
  }, [resource, round]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{resource ? 'Edit Resource' : 'Add New Resource'}</h2>
          <button className="modal-close" onClick={onClose}>
            <XMarkIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows="3"
            />
          </div>
          <div className="form-group">
            <label htmlFor="url">URL (optional)</label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.hasExternalLink}
                onChange={(e) => setFormData({ ...formData, hasExternalLink: e.target.checked })}
              />
              Show external link icon
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="round">Section</label>
            <select
              id="round"
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: e.target.value })}
              required
            >
              <option value="">Select a section...</option>
              <option value="applications">Applications</option>
              <option value="coffeeChats">Coffee Chats</option>
              <option value="firstRound">First Round</option>
              <option value="finalRound">Final Round</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="icon">Icon</label>
            <select
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            >
              <option value="book">Book</option>
              <option value="people">People</option>
              <option value="globe">Globe</option>
              <option value="coffee">Coffee</option>
              <option value="application">Application</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {resource ? 'Update Resource' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function InterviewPreparation() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MEMBER';
  
  const [resources, setResources] = useState({
    firstRound: [],
    finalRound: [],
    coffeeChats: [],
    applications: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    resource: null,
    round: null
  });

  // Fetch resources from API
  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await api.get('/interview-resources');
      // Ensure all resource arrays exist
      setResources({
        firstRound: data.firstRound || [],
        finalRound: data.finalRound || [],
        coffeeChats: data.coffeeChats || [],
        applications: data.applications || []
      });
    } catch (err) {
      setError(err.message);
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Set up API client with auth token
    if (user?.token) {
      api.setToken(user.token);
    }
    fetchResources();
  }, [user]);

  const handleResourceClick = (url) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  const handleAddResource = async (newResource) => {
    try {
      await api.post('/interview-resources', newResource);
      await fetchResources(); // Refresh the list
    } catch (err) {
      setError(err.message);
      console.error('Error creating resource:', err);
    }
  };

  const handleEditResource = async (updatedResource) => {
    try {
      await api.put(`/interview-resources/${modalState.resource.id}`, updatedResource);
      await fetchResources(); // Refresh the list
    } catch (err) {
      setError(err.message);
      console.error('Error updating resource:', err);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await api.delete(`/interview-resources/${resourceId}`);
      await fetchResources(); // Refresh the list
    } catch (err) {
      setError(err.message);
      console.error('Error deleting resource:', err);
    }
  };

  const handleSaveResource = (resourceData) => {
    if (modalState.resource) {
      handleEditResource(resourceData);
    } else {
      handleAddResource(resourceData);
    }
  };

  if (loading) {
    return (
      <div className="interview-prep-container">
        <div className="loading">Loading resources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interview-prep-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <AccessControl allowedRoles={['USER', 'ADMIN', 'MEMBER']}>
      <div className="interview-prep-container">
      <div className="interview-prep-header">
        <div className="header-content">
          <div>
            <h1 className="interview-prep-title">Recruitment Resources</h1>
            <p className="interview-prep-subtitle">
              Here are some preparation tools to help you understand what to expect and how to get ready for recruitment.
            </p>
          </div>
          {isAdmin && (
            <div className="admin-actions">
              <button 
                className="add-resource-btn"
                onClick={() => setModalState({ isOpen: true, resource: null, round: null })}
              >
                <PlusIcon />
                Add Resource
              </button>
            </div>
          )}
        </div>
      </div>

     

      <div className="interview-prep-content">
        <div className="prep-section">
          <h2 className="section-title">Applications</h2>
          <div className="resources-grid">
            {(resources.applications || []).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={() => handleResourceClick(resource.url)}
                onEdit={isAdmin ? (resource) => setModalState({ isOpen: true, resource, round: 'applications' }) : null}
                onDelete={isAdmin ? handleDeleteResource : null}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        <div className="prep-section">
          <h2 className="section-title">Coffee Chats</h2>
          <div className="resources-grid">
            {(resources.coffeeChats || []).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={() => handleResourceClick(resource.url)}
                onEdit={isAdmin ? (resource) => setModalState({ isOpen: true, resource, round: 'coffeeChats' }) : null}
                onDelete={isAdmin ? handleDeleteResource : null}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        <div className="prep-section">
          <h2 className="section-title">First Round</h2>
          <div className="resources-grid">
            {(resources.firstRound || []).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={() => handleResourceClick(resource.url)}
                onEdit={isAdmin ? (resource) => setModalState({ isOpen: true, resource, round: 'firstRound' }) : null}
                onDelete={isAdmin ? handleDeleteResource : null}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

        <div className="prep-section">
          <h2 className="section-title">Final Round</h2>
          <div className="resources-grid">
            {(resources.finalRound || []).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={() => handleResourceClick(resource.url)}
                onEdit={isAdmin ? (resource) => setModalState({ isOpen: true, resource, round: 'finalRound' }) : null}
                onDelete={isAdmin ? handleDeleteResource : null}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      </div>

      <ResourceModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, resource: null, round: null })}
        onSave={handleSaveResource}
        resource={modalState.resource}
        round={modalState.round}
      />
    </div>
    </AccessControl>
  );
}
