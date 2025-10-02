import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ImageCache from '../utils/imageCache';
import { useAuth } from '../context/AuthContext';
import AccessControl from '../components/AccessControl';
import '../styles/CandidateList.css';

export default function CandidateList() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    group: '',
    createdDate: ''
  });

  useEffect(() => {
    const fetchCandidates = async () => {
      if (!user?.id) return;
      
      try {
        // Use member endpoint to get all candidates, not just assigned ones
        const data = await apiClient.get('/member/all-candidates');
        console.log('Fetched all candidates data:', data);
        console.log('Number of candidates:', data?.length || 0);
        setCandidates(data);
        
        // Preload all profile images from applications in the background if they exist
        const imageUrls = data
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
      } catch (err) {
        console.error('Error loading candidates:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [user?.id]);

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
    
    return matchesSearch && matchesGroup && matchesDate;
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
            <Link
              key={candidate.id}
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
          ))}
        </div>
      )}
    </div>
    </AccessControl>
  );
}
