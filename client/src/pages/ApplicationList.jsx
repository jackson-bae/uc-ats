import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ImageCache from '../utils/imageCache';
import AddApplicationModal from '../components/AddApplicationModal';
import EditApplicationModal from '../components/EditApplicationModal';
import AccessControl from '../components/AccessControl';
import { useAuth } from '../context/AuthContext';
import '../styles/ApplicationList.css';

export default function ApplicationList() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    year: '',
    gender: '',
    firstGen: '',
    transfer: '',
    decision: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const data = await apiClient.get('/applications');
        setApplicants(data);
        
        // Preload all profile images in the background
        const imageUrls = data
          .filter(applicant => applicant.headshotUrl)
          .map(applicant => applicant.headshotUrl);
        
        if (imageUrls.length > 0) {
          console.log(`Preloading ${imageUrls.length} profile images...`);
          ImageCache.preloadImages(imageUrls, apiClient.token)
            .then(results => {
              const successful = results.filter(r => r.status === 'fulfilled').length;
              console.log(`Successfully preloaded ${successful}/${imageUrls.length} images`);
            })
            .catch(err => {
              console.error('Error preloading images:', err);
            });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicants();
  }, []);

  // Filter and search logic
  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = applicant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !filters.year || applicant.graduationYear === filters.year;
    const matchesGender = !filters.gender || applicant.gender === filters.gender;
    const matchesFirstGen = !filters.firstGen || applicant.isFirstGeneration.toString() === filters.firstGen;
    const matchesTransfer = !filters.transfer || applicant.isTransferStudent.toString() === filters.transfer;
    const matchesDecision = !filters.decision || applicant.status === filters.decision;

    return matchesSearch && matchesYear && matchesGender && matchesFirstGen && matchesTransfer && matchesDecision;
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatStatus = (status) => {
    return status.toLowerCase().replace('_', ' ');
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleApplicationAdded = () => {
    // Refresh the applications list
    const fetchApplicants = async () => {
      try {
        const data = await apiClient.get('/applications');
        setApplicants(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchApplicants();
  };

  const handleEdit = (e, applicant) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingApplication(applicant);
    setShowEditModal(true);
  };

  const handleDelete = async (e, applicant) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete the application for ${applicant.firstName} ${applicant.lastName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingApplication(applicant.id);
    try {
      await apiClient.delete(`/admin/applications/${applicant.id}`);
      // Refresh the applications list
      const data = await apiClient.get('/applications');
      setApplicants(data);
    } catch (err) {
      alert(err.message || 'Failed to delete application');
    } finally {
      setDeletingApplication(null);
    }
  };

  const handleApplicationUpdated = () => {
    handleApplicationAdded();
    setShowEditModal(false);
    setEditingApplication(null);
  };


  if (loading) {
    return (
      <div className="application-list">
        <div className="loading-state">Loading candidates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="application-list">
        <div className="error-state">Error loading candidates: {error}</div>
      </div>
    );
  }

  return (
    <AccessControl allowedRoles={['ADMIN', 'MEMBER']}>
      <div className="application-list">
      {/* Simple header */}
      <div className="application-list-header">
        <div className="header-top">
          <h1 className="header-title">Applications</h1>
          <button 
            className="add-application-btn"
            onClick={() => setShowAddModal(true)}
          >
            <PlusIcon className="btn-icon" />
            Add Application
          </button>
        </div>
        
        <div className="search-section">
          <div className="header-search">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search candidates..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="results-count">
            {filteredApplicants.length} candidate{filteredApplicants.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Simple inline filters */}
      <div className="filters-row">
        <select 
          className="filter-select"
          value={filters.year}
          onChange={(e) => handleFilterChange('year', e.target.value)}
        >
          <option value="">Year: All</option>
          <option value="2026">Year: 2026</option>
          <option value="2027">Year: 2027</option>
          <option value="2028">Year: 2028</option>
          <option value="2029">Year: 2029</option>
          <option value="2030">Year: 2030</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.gender}
          onChange={(e) => handleFilterChange('gender', e.target.value)}
        >
          <option value="">Gender: All</option>
          <option value="Male">Gender: Male</option>
          <option value="Female">Gender: Female</option>
          <option value="Other">Gender: Other</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.firstGen}
          onChange={(e) => handleFilterChange('firstGen', e.target.value)}
        >
          <option value="">First Gen: All</option>
          <option value="true">First Gen: Yes</option>
          <option value="false">First Gen: No</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.transfer}
          onChange={(e) => handleFilterChange('transfer', e.target.value)}
        >
          <option value="">Transfer: All</option>
          <option value="true">Transfer: Yes</option>
          <option value="false">Transfer: No</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.decision}
          onChange={(e) => handleFilterChange('decision', e.target.value)}
        >
          <option value="">Status: All</option>
          <option value="SUBMITTED">Status: Submitted</option>
          <option value="UNDER_REVIEW">Status: Under Review</option>
          <option value="ACCEPTED">Status: Accepted</option>
          <option value="REJECTED">Status: Rejected</option>
          <option value="WAITLISTED">Status: Waitlisted</option>
        </select>
      </div>

      {/* Candidates List */}
      {filteredApplicants.length === 0 ? (
        <div className="empty-state">
          <h3>No candidates found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {filteredApplicants.map((applicant, index) => (
            <div key={applicant.id} className="candidate-card-wrapper">
              <Link
                to={`/application/${applicant.id}`}
                className="candidate-card"
              >
                <div className="candidate-header">
                  <div className="candidate-info">
                    {/* Profile Picture with fallback */}
                    {applicant.headshotUrl ? (
                      <AuthenticatedImage
                        src={applicant.headshotUrl}
                        alt={`${applicant.firstName} ${applicant.lastName}`}
                        className="candidate-avatar"
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div className="candidate-avatar-fallback">
                        {getInitials(applicant.firstName, applicant.lastName)}
                      </div>
                    )}
                    <div className="candidate-details">
                      <h3>{applicant.firstName} {applicant.lastName}</h3>
                      <p className="candidate-meta">
                        {applicant.major1} • {applicant.graduationYear} • GPA: {applicant.cumulativeGpa}
                      </p>
                    </div>
                  </div>
                  <div className="candidate-status">
                    <span className={`status-badge ${formatStatus(applicant.status)}`}>
                      {applicant.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <div className="candidate-actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => handleEdit(e, applicant)}
                    title="Edit Application"
                  >
                    <PencilIcon className="action-icon" />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => handleDelete(e, applicant)}
                    disabled={deletingApplication === applicant.id}
                    title="Delete Application"
                  >
                    <TrashIcon className="action-icon" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleApplicationAdded}
      />

      {/* Edit Application Modal */}
      <EditApplicationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingApplication(null);
        }}
        onSuccess={handleApplicationUpdated}
        application={editingApplication}
      />
    </div>
    </AccessControl>
  );
}