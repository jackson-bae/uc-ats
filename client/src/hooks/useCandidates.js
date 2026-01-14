import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import apiClient from '../utils/api';

/**
 * Hook for fetching and caching candidates data with pagination
 * @param {Object} options - Hook options
 * @param {number} options.page - Current page (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {boolean} options.forceRefresh - Force refetch ignoring cache
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @param {string} options.endpoint - API endpoint to use (default: '/admin/candidates')
 * @returns {Object} { candidates, total, pagination, loading, error, refetch, updateCandidate }
 */
export function useCandidates(options = {}) {
  const {
    page = 1,
    limit = 50,
    forceRefresh = false,
    enabled = true,
    endpoint = '/admin/candidates',
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
    const params = { page, limit, endpoint };
    return Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}=${v}`)
      .join('&') || 'default';
  }, [page, limit, endpoint]);

  const requestKey = `candidates_${cacheId}`;

  const fetchCandidates = useCallback(async (force = false) => {
    // Check cache first
    if (!force && isCacheValid('candidates', cacheId)) {
      const cached = getCache('candidates', cacheId);
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

      const response = await apiClient.get(`${endpoint}?${params.toString()}`);

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

      setCache('candidates', normalizedData, cacheId);
      setLocalData(normalizedData);
      return normalizedData;
    } catch (err) {
      setError(err.message || 'Failed to fetch candidates');
      return null;
    } finally {
      setLoading(false);
      clearRequest(requestKey);
    }
  }, [page, limit, endpoint, cacheId, requestKey, isCacheValid, getCache, setCache, registerRequest, clearRequest]);

  // Fetch on mount and when parameters change
  useEffect(() => {
    if (enabled) {
      fetchCandidates(forceRefresh);
    }
  }, [enabled, fetchCandidates, forceRefresh]);

  // Get current data from cache or local state
  const currentData = useMemo(() => {
    const cached = getCache('candidates', cacheId);
    return cached || localData;
  }, [getCache, cacheId, localData]);

  /**
   * Update a single candidate optimistically
   * @param {string} id - Candidate ID
   * @param {Object} updates - Fields to update
   */
  const updateCandidate = useCallback((id, updates) => {
    updateCacheItem('candidates', cacheId, id, updates);
  }, [updateCacheItem, cacheId]);

  /**
   * Force refetch data
   */
  const refetch = useCallback(() => {
    return fetchCandidates(true);
  }, [fetchCandidates]);

  /**
   * Invalidate all candidates cache
   */
  const invalidateCandidates = useCallback(() => {
    invalidate('candidates');
  }, [invalidate]);

  return {
    candidates: currentData?.data || [],
    total: currentData?.pagination?.total || 0,
    pagination: currentData?.pagination || null,
    loading,
    error,
    refetch,
    updateCandidate,
    invalidate: invalidateCandidates,
  };
}

export default useCandidates;
