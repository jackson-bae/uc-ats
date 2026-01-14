import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ImageCache from '../utils/imageCache';
import { useAuth } from '../context/AuthContext';
import AccessControl from '../components/AccessControl';
import EditCandidateModal from '../components/EditCandidateModal';
import { useCandidates } from '../hooks/useCandidates';
import { useData } from '../context/DataContext';
import Pagination from '../components/Pagination';
import '../styles/CandidateList.css';

export default function CandidateList() {
  const { user } = useAuth();

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Use cached candidates hook with minimal data for list view
  const {
    candidates: rawCandidates,
    pagination,
    loading,
    error,
    refetch: refetchCandidates
  } = useCandidates({
    page,
    limit,
    endpoint: '/member/all-candidates',
    enabled: !!user?.id
  });

  const { invalidateRelated } = useData();

  // Transform candidates data
  const candidates = useMemo(() => {
    // Handle paginated response format
    return rawCandidates || [];
  }, [rawCandidates]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    group: '',
    createdDate: '',
    cycle: ''
  });
  const [cycles, setCycles] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [deletingCandidate, setDeletingCandidate] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch cycles separately (they don't change often)
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const cyclesData = await apiClient.get('/admin/cycles');
        setCycles(cyclesData || []);
      } catch (err) {
        console.error('Error loading cycles:', err);
      }
    };
    if (user?.id) {
      fetchCycles();
    }
  }, [user?.id]);

  // Preload images when candidates change
  useEffect(() => {
    if (candidates.length > 0) {
      const imageUrls = candidates
        .filter(candidate => candidate.applications && candidate.applications.length > 0)
        .map(candidate => candidate.applications[0].headshotUrl)
        .filter(url => url);

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
    }
  }, [candidates]);

  // Filter and search logic
  const filteredCandidates = candidates.filter(candidate => {
    // Get the latest application for search
    const latestApp = candidate.applications?.[0];
    // Use candidate's own name if no application, otherwise use application name
    const candidateName = latestApp ? 
      `${latestApp.firstName} ${latestApp.lastName}` : 
      `${candidate.firstName} ${candidate.lastName}`;
    const candidateEmail = latestApp?.email || candidate.email;
    
    const matchesSearch = candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (candidate.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = !filters.group ||
      (filters.group === 'applied' && candidate.applications && candidate.applications.length > 0) ||
      (filters.group === 'not_applied' && (!candidate.applications || candidate.applications.length === 0));

    const matchesCycle = !filters.cycle ||
      candidate.applications?.some(app => app.cycleId === filters.cycle || app.cycle?.id === filters.cycle);

    const matchesDate = !filters.createdDate || (() => {
      const candidateDate = new Date(candidate.createdAt || latestApp?.submittedAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (filters.createdDate) {
        case 'today':
          return candidateDate >= today;
        case 'week':
          return candidateDate >= weekAgo;
        case 'month':
          return candidateDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesGroup && matchesCycle && matchesDate;
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    return nameParts.map(part => part.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEdit = async (e, candidate) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCandidate(candidate);
    setShowEditModal(true);
  };

  const handleDelete = async (e, candidate) => {
    e.preventDefault();
    e.stopPropagation();

    const candidateName = candidate.applications?.[0] ?
      `${candidate.applications[0].firstName} ${candidate.applications[0].lastName}` :
      `${candidate.firstName} ${candidate.lastName}`;

    if (!window.confirm(`Are you sure you want to delete candidate ${candidateName}? This action cannot be undone.`)) {
      return;
    }

    // Check if candidate has applications
    if (candidate.applications && candidate.applications.length > 0) {
      alert('Cannot delete candidate with associated applications. Please delete applications first.');
      return;
    }

    setDeletingCandidate(candidate.id);
    try {
      await apiClient.delete(`/admin/candidates/${candidate.id}`);
      // Invalidate cache and refetch
      invalidateRelated('candidates');
      await refetchCandidates();
    } catch (err) {
      alert(err.message || 'Failed to delete candidate');
    } finally {
      setDeletingCandidate(null);
    }
  };

  const handleCandidateUpdated = useCallback(() => {
    // Invalidate cache and refetch
    invalidateRelated('candidates');
    refetchCandidates();
    setShowEditModal(false);
    setEditingCandidate(null);
  }, [invalidateRelated, refetchCandidates]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Handle limit change
  const handleLimitChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  if (loading) {
    return (
      <div className="candidate-list">
        <div className="loading-state">Loading candidates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-list">
        <div className="error-state">Error loading candidates: {error}</div>
      </div>
    );
  }

  return (
    <AccessControl allowedRoles={['ADMIN', 'MEMBER']}>
      <div className="candidate-list">
      {/* Simple header */}
      <div className="candidate-list-header">
        <div className="header-top">
          <h1 className="header-title">View Candidates</h1>
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
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Simple inline filters */}
      <div className="filters-row">
        <select 
          className="filter-select"
          value={filters.group}
          onChange={(e) => handleFilterChange('group', e.target.value)}
        >
          <option value="">Application: All</option>
          <option value="applied">Application: Applied</option>
          <option value="not_applied">Application: Not Applied</option>
        </select>
        
        <select
          className="filter-select"
          value={filters.createdDate}
          onChange={(e) => handleFilterChange('createdDate', e.target.value)}
        >
          <option value="">Date Added: All</option>
          <option value="today">Date Added: Today</option>
          <option value="week">Date Added: This Week</option>
          <option value="month">Date Added: This Month</option>
        </select>

        <select
          className="filter-select"
          value={filters.cycle}
          onChange={(e) => handleFilterChange('cycle', e.target.value)}
        >
          <option value="">Cycle: All</option>
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>
              Cycle: {cycle.name}{cycle.isActive ? ' (Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <div className="empty-state">
          <h3>No candidates found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {filteredCandidates.map((candidate, index) => (
            <div key={candidate.id} className="candidate-card-wrapper">
              <Link
                to={`/candidate-detail/${candidate.id}`}
                className="candidate-card"
              >
                <div className="candidate-header">
                  <div className="candidate-info">
                    {/* Profile Picture with fallback - extract from application */}
                    {candidate.applications && candidate.applications.length > 0 && candidate.applications[0].headshotUrl ? (
                      <AuthenticatedImage
                        src={candidate.applications[0].headshotUrl}
                        alt={candidate.applications[0] ? 
                          `${candidate.applications[0].firstName} ${candidate.applications[0].lastName}` : 
                          `${candidate.firstName} ${candidate.lastName}`}
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
                        {getInitials(candidate.applications?.[0] ? 
                          `${candidate.applications[0].firstName} ${candidate.applications[0].lastName}` : 
                          `${candidate.firstName} ${candidate.lastName}`)}
                      </div>
                    )}
                    <div className="candidate-details">
                      <h3>{candidate.applications?.[0] ? 
                        `${candidate.applications[0].firstName} ${candidate.applications[0].lastName}` : 
                        `${candidate.firstName} ${candidate.lastName}`}</h3>
                      <p className="candidate-meta">
                        {candidate.studentId || 'N/A'} • {candidate.applications?.[0]?.email || candidate.email || 'N/A'}
                      </p>
                      <p className="candidate-meta">
                        Applications: {candidate.applications?.length || 0} • 
                        Group: {candidate.assignedGroup?.id ? `Group ${candidate.assignedGroup.id.slice(-4)}` : 'Unassigned'}
                      </p>
                      <p className="candidate-date">
                        Added: {formatDate(candidate.createdAt || candidate.applications?.[0]?.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="candidate-status">
                    <span className={`status-badge ${candidate.applications && candidate.applications.length > 0 ? 'applied' : 'not_applied'}`}>
                      {candidate.applications && candidate.applications.length > 0 ? 'APPLIED' : 'NOT APPLIED'}
                    </span>
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <div className="candidate-actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => handleEdit(e, candidate)}
                    title="Edit Candidate"
                  >
                    <PencilIcon className="action-icon" />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => handleDelete(e, candidate)}
                    disabled={deletingCandidate === candidate.id || (candidate.applications && candidate.applications.length > 0)}
                    title={candidate.applications && candidate.applications.length > 0 ? "Cannot delete candidate with applications" : "Delete Candidate"}
                  >
                    <TrashIcon className="action-icon" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          loading={loading}
        />
      )}

      {/* Edit Candidate Modal */}
      <EditCandidateModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCandidate(null);
        }}
        onSuccess={handleCandidateUpdated}
        candidate={editingCandidate}
      />
    </div>
    </AccessControl>
  );
}
