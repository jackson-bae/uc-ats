import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import apiClient from '../utils/api';

/**
 * Hook for fetching and caching applications data with pagination
 * @param {Object} options - Hook options
 * @param {number} options.page - Current page (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string} options.status - Filter by status
 * @param {boolean} options.forceRefresh - Force refetch ignoring cache
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @returns {Object} { applications, total, pagination, loading, error, refetch, updateApplication }
 */
export function useApplications(options = {}) {
  const {
    page = 1,
    limit = 50,
    status = null,
    forceRefresh = false,
    enabled = true,
  } = options;

  const {
    isCacheValid,
    getCache,
    setCache,
    invalidate,
    updateCacheItem,
    registerRequest,
    clearRequest,
  } = useData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState(null);

  // Create a unique cache ID based on parameters
  const cacheId = useMemo(() => {
    const params = { page, limit, status };
    return Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}=${v}`)
      .join('&') || 'default';
  }, [page, limit, status]);

  const requestKey = `applications_${cacheId}`;

  const fetchApplications = useCallback(async (force = false) => {
    // Check cache first
    if (!force && isCacheValid('applications', cacheId)) {
      const cached = getCache('applications', cacheId);
      if (cached) {
        setLocalData(cached);
        return cached;
      }
    }

    // Prevent duplicate requests
    if (!registerRequest(requestKey)) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (status) params.append('status', status);

      const response = await apiClient.get(`/applications?${params.toString()}`);

      // Handle both paginated and non-paginated response formats
      const normalizedData = response.pagination
        ? response
        : {
            data: response,
            pagination: {
              page: 1,
              limit: response.length,
              total: response.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            }
          };

      setCache('applications', normalizedData, cacheId);
      setLocalData(normalizedData);
      return normalizedData;
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
      return null;
    } finally {
      setLoading(false);
      clearRequest(requestKey);
    }
  }, [page, limit, status, cacheId, requestKey, isCacheValid, getCache, setCache, registerRequest, clearRequest]);

  // Fetch on mount and when parameters change
  useEffect(() => {
    if (enabled) {
      fetchApplications(forceRefresh);
    }
  }, [enabled, fetchApplications, forceRefresh]);

  // Get current data from cache or local state
  const currentData = useMemo(() => {
    const cached = getCache('applications', cacheId);
    return cached || localData;
  }, [getCache, cacheId, localData]);

  /**
   * Update a single application optimistically
   * @param {string} id - Application ID
   * @param {Object} updates - Fields to update
   */
  const updateApplication = useCallback((id, updates) => {
    updateCacheItem('applications', cacheId, id, updates);
  }, [updateCacheItem, cacheId]);

  /**
   * Force refetch data
   */
  const refetch = useCallback(() => {
    return fetchApplications(true);
  }, [fetchApplications]);

  /**
   * Invalidate all applications cache
   */
  const invalidateApplications = useCallback(() => {
    invalidate('applications');
  }, [invalidate]);

  return {
    applications: currentData?.data || [],
    total: currentData?.pagination?.total || 0,
    pagination: currentData?.pagination || null,
    loading,
    error,
    refetch,
    updateApplication,
    invalidate: invalidateApplications,
  };
}

export default useApplications;
