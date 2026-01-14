import { createContext, useContext, useState, useCallback, useRef } from 'react';

const DataContext = createContext(null);

// TTL values in seconds
const CACHE_TTL = {
  stats: 60,
  activeCycle: 300,
  applications: 120,
  candidates: 120,
  events: 180,
  reviewTeams: 300,
  staging: 120, // 2 minutes for staging page data
};

// Related cache keys for smart invalidation
const CACHE_RELATIONS = {
  applications: ['stats', 'candidates', 'demographics', 'staging'],
  candidates: ['stats', 'applications', 'staging'],
  stats: [],
  events: ['staging'],
  reviewTeams: ['staging'],
  activeCycle: ['applications', 'candidates', 'stats', 'events', 'reviewTeams', 'staging'],
  staging: ['candidates', 'applications', 'stats'],
};

export const DataProvider = ({ children }) => {
  // Cache state - stores data with timestamps
  const [cache, setCache] = useState({});

  // Track in-flight requests to prevent duplicate fetches
  const pendingRequests = useRef({});

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @param {string} cacheId - Unique identifier for this specific cache entry (e.g., "applications_page1_limit50")
   * @returns {boolean}
   */
  const isCacheValid = useCallback((key, cacheId = 'default') => {
    const fullKey = `${key}_${cacheId}`;
    const cached = cache[fullKey];

    if (!cached || !cached.timestamp) {
      return false;
    }

    const ttl = CACHE_TTL[key] || 120;
    const age = (Date.now() - cached.timestamp) / 1000;

    return age < ttl;
  }, [cache]);

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @param {string} cacheId - Unique identifier
   * @returns {any} Cached data or null
   */
  const getCache = useCallback((key, cacheId = 'default') => {
    const fullKey = `${key}_${cacheId}`;
    return cache[fullKey]?.data || null;
  }, [cache]);

  /**
   * Set cache data with timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {string} cacheId - Unique identifier
   */
  const setDataCache = useCallback((key, data, cacheId = 'default') => {
    const fullKey = `${key}_${cacheId}`;
    setCache(prev => ({
      ...prev,
      [fullKey]: {
        data,
        timestamp: Date.now(),
      }
    }));
  }, []);

  /**
   * Invalidate a specific cache key
   * @param {string} key - Cache key to invalidate
   * @param {string} cacheId - Optional specific cache ID, or invalidate all matching key
   */
  const invalidate = useCallback((key, cacheId = null) => {
    setCache(prev => {
      const newCache = { ...prev };

      if (cacheId) {
        // Invalidate specific entry
        delete newCache[`${key}_${cacheId}`];
      } else {
        // Invalidate all entries for this key
        Object.keys(newCache).forEach(k => {
          if (k.startsWith(`${key}_`)) {
            delete newCache[k];
          }
        });
      }

      return newCache;
    });
  }, []);

  /**
   * Invalidate related caches based on relationships
   * @param {string} key - Primary cache key that changed
   */
  const invalidateRelated = useCallback((key) => {
    const related = CACHE_RELATIONS[key] || [];

    setCache(prev => {
      const newCache = { ...prev };

      // Invalidate the primary key
      Object.keys(newCache).forEach(k => {
        if (k.startsWith(`${key}_`)) {
          delete newCache[k];
        }
      });

      // Invalidate related keys
      related.forEach(relatedKey => {
        Object.keys(newCache).forEach(k => {
          if (k.startsWith(`${relatedKey}_`)) {
            delete newCache[k];
          }
        });
      });

      return newCache;
    });
  }, []);

  /**
   * Invalidate all caches (e.g., on logout or cycle change)
   */
  const invalidateAll = useCallback(() => {
    setCache({});
    pendingRequests.current = {};
  }, []);

  /**
   * Update a single item in a cached list (optimistic update)
   * @param {string} key - Cache key
   * @param {string} cacheId - Cache ID
   * @param {string} itemId - ID of item to update
   * @param {object} updates - Fields to update
   */
  const updateCacheItem = useCallback((key, cacheId, itemId, updates) => {
    const fullKey = `${key}_${cacheId}`;

    setCache(prev => {
      const cached = prev[fullKey];
      if (!cached || !cached.data) return prev;

      let newData;

      // Handle paginated response format
      if (cached.data.data && Array.isArray(cached.data.data)) {
        newData = {
          ...cached.data,
          data: cached.data.data.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        };
      } else if (Array.isArray(cached.data)) {
        newData = cached.data.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        );
      } else {
        return prev;
      }

      return {
        ...prev,
        [fullKey]: {
          ...cached,
          data: newData,
        }
      };
    });
  }, []);

  /**
   * Register a pending request to prevent duplicates
   * @param {string} requestKey - Unique key for the request
   * @returns {boolean} Whether the request should proceed
   */
  const registerRequest = useCallback((requestKey) => {
    if (pendingRequests.current[requestKey]) {
      return false;
    }
    pendingRequests.current[requestKey] = true;
    return true;
  }, []);

  /**
   * Clear a pending request
   * @param {string} requestKey - Request key to clear
   */
  const clearRequest = useCallback((requestKey) => {
    delete pendingRequests.current[requestKey];
  }, []);

  const value = {
    // Cache operations
    isCacheValid,
    getCache,
    setCache: setDataCache,
    invalidate,
    invalidateRelated,
    invalidateAll,
    updateCacheItem,

    // Request deduplication
    registerRequest,
    clearRequest,

    // Constants for external use
    CACHE_TTL,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
