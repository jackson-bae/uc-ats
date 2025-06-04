import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import apiClient from '../utils/api';
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

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const data = await apiClient.get('/applications');
        setApplicants(data);
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

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
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
    <div className="application-list">
      {/* Simple header */}
      <div className="application-list-header">
        <h1 className="header-title">Candidates</h1>
        
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
          <option value="2024">Year: 2024</option>
          <option value="2025">Year: 2025</option>
          <option value="2026">Year: 2026</option>
          <option value="2027">Year: 2027</option>
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
            <Link
              key={applicant.id}
              to={`/application/${applicant.id}`}
              className="candidate-card"
            >
              <div className="candidate-header">
                <div className="candidate-info">
                  {/* Profile Picture with fallback */}
                  {applicant.headshotUrl ? (
                    <>
                      <img
                        src={applicant.headshotUrl}
                        alt={`${applicant.firstName} ${applicant.lastName}`}
                        className="candidate-avatar"
                        onError={handleImageError}
                      />
                      <div className="candidate-avatar-fallback" style={{ display: 'none' }}>
                        {getInitials(applicant.firstName, applicant.lastName)}
                      </div>
                    </>
                  ) : (
                    <div className="candidate-avatar-fallback">
                      {getInitials(applicant.firstName, applicant.lastName)}
                    </div>
                  )}
                  
                  <div className="candidate-details">
                    <h3>{applicant.firstName} {applicant.lastName}</h3>
                    <p className="candidate-meta">
                      {applicant.major1} • {applicant.graduationYear} • GPA: {applicant.cumulativeGpa}
                      {applicant.isFirstGeneration && " • First Gen"}
                      {applicant.isTransferStudent && " • Transfer"}
                    </p>
                  </div>
                </div>

                <div className="candidate-scores">
                  {applicant.averageGrades?.resume || applicant.averageGrades?.cover_letter || applicant.averageGrades?.video ? (
                    <>
                      <div className="score-item">
                        <p className="score-label">Resume</p>
                        <p className="score-value">
                          {applicant.averageGrades?.resume || 'N/A'}
                        </p>
                      </div>
                      <div className="score-item">
                        <p className="score-label">Cover Letter</p>
                        <p className="score-value">
                          {applicant.averageGrades?.cover_letter || 'N/A'}
                        </p>
                      </div>
                      <div className="score-item">
                        <p className="score-label">Video</p>
                        <p className="score-value">
                          {applicant.averageGrades?.video || 'N/A'}
                        </p>
                      </div>
                      <div className="score-item">
                        <p className="score-label">Overall</p>
                        <p className="score-value" style={{ color: '#3b82f6' }}>
                          {applicant.averageGrades?.overall || 'N/A'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="no-grades-message" style={{ fontStyle: 'italic', color: '#6b7280' }}>
                      Be the first to grade this application
                    </div>
                  )}
                </div>

                <div className="candidate-status">
                  <span className={`status-badge ${formatStatus(applicant.status)}`}>
                    {applicant.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}