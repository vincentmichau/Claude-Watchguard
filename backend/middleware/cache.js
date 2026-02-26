// backend/middleware/cache.js - Cache middleware

import cacheService, { cacheTTL } from '../services/cacheService.js';

/**
 * Cache middleware - Cache GET requests
 * @param {Number} ttl - Time to live in seconds
 * @returns {Function} - Express middleware
 */
export const cacheMiddleware = (ttl = cacheTTL.medium) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `route:${req.originalUrl}:${req.user?.id || 'public'}`;

    try {
      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        console.log(`✓ Cache hit: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = (data) => {
        // Cache the response
        cacheService.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });

        console.log(`✓ Cache set: ${cacheKey}`);

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Invalidate cache for specific patterns
 * @param {String|Array} patterns - Cache key patterns to invalidate
 * @returns {Function} - Express middleware
 */
export const invalidateCache = (...patterns) => {
  return async (req, res, next) => {
    // Store original json to invalidate after response
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Invalidate cache patterns
      for (const pattern of patterns) {
        try {
          await cacheService.delPattern(pattern);
          console.log(`✓ Cache invalidated: ${pattern}`);
        } catch (error) {
          console.error(`Cache invalidation error for ${pattern}:`, error);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

// Export convenience functions
export const cache = {
  short: () => cacheMiddleware(cacheTTL.short),
  medium: () => cacheMiddleware(cacheTTL.medium),
  long: () => cacheMiddleware(cacheTTL.long),
  veryLong: () => cacheMiddleware(cacheTTL.veryLong)
};
