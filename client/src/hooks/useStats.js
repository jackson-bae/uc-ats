import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import apiClient from '../utils/api';

/**
 * Hook for fetching and caching stats data (short TTL - 60s)
 * @param {Object} options - Hook options
 * @param {boolean} options.forceRefresh - Force refetch ignoring cache
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @returns {Object} { stats, activeCycle, loading, error, refetch }
 */
export function useStats(options = {}) {
  const {
    forceRefresh = false,
    enabled = true,
  } = options;

  const {
    isCacheValid,
    getCache,
    setCache,
    invalidate,
    registerRequest,
    clearRequest,
  } = useData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState(null);

  const cacheId = 'default';
  const requestKey = 'stats_default';

  const fetchStats = useCallback(async (force = false) => {
    // Check cache first
    if (!force && isCacheValid('stats', cacheId)) {
      const cached = getCache('stats', cacheId);
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
      // Fetch stats and active cycle in parallel
      const [statsResponse, cycleResponse] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/cycles/active').catch(() => null),
      ]);

      const combinedData = {
        stats: statsResponse,
        activeCycle: cycleResponse,
      };

      setCache('stats', combinedData, cacheId);
      setLocalData(combinedData);
      return combinedData;
    } catch (err) {
      setError(err.message || 'Failed to fetch stats');
      return null;
    } finally {
      setLoading(false);
      clearRequest(requestKey);
    }
  }, [cacheId, requestKey, isCacheValid, getCache, setCache, registerRequest, clearRequest]);

  // Fetch on mount
  useEffect(() => {
    if (enabled) {
      fetchStats(forceRefresh);
    }
  }, [enabled, fetchStats, forceRefresh]);

  // Get current data from cache or local state
  const currentData = useMemo(() => {
    const cached = getCache('stats', cacheId);
    return cached || localData;
  }, [getCache, cacheId, localData]);

  /**
   * Force refetch data
   */
  const refetch = useCallback(() => {
    return fetchStats(true);
  }, [fetchStats]);

  /**
   * Invalidate stats cache
   */
  const invalidateStats = useCallback(() => {
    invalidate('stats');
  }, [invalidate]);

  return {
    stats: currentData?.stats || null,
    activeCycle: currentData?.activeCycle || null,
    loading,
    error,
    refetch,
    invalidate: invalidateStats,
  };
}

export default useStats;
