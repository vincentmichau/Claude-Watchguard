// backend/services/cacheService.js - Redis cache service

import { createClient } from 'redis';

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis connection failed:', error.message);
      console.log('⚠️  Running without cache');
      this.connected = false;
    }
  }

  /**
   * Get value from cache
   * @param {String} key - Cache key
   * @returns {Any} - Cached value or null
   */
  async get(key) {
    if (!this.connected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {String} key - Cache key
   * @param {Any} value - Value to cache
   * @param {Number} ttl - Time to live in seconds (default: 5 minutes)
   */
  async set(key, value, ttl = 300) {
    if (!this.connected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {String} key - Cache key
   */
  async del(key) {
    if (!this.connected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   * @param {String} pattern - Key pattern (e.g., "reports:*")
   */
  async delPattern(pattern) {
    if (!this.connected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async flush() {
    if (!this.connected) return false;

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   * @param {String} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not in cache
   * @param {Number} ttl - Time to live in seconds
   * @returns {Any} - Cached or fresh data
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, ttl);

    return data;
  }
}

// Export singleton instance
export default new CacheService();

// Cache key generators
export const cacheKeys = {
  report: (id) => `report:${id}`,
  reports: (filters) => `reports:${JSON.stringify(filters)}`,
  user: (id) => `user:${id}`,
  shifts: (userId, date) => `shifts:${userId}:${date}`,
  sites: () => 'sites:all',
  clients: () => 'clients:all'
};

// Cache TTLs (in seconds)
export const cacheTTL = {
  short: 60,        // 1 minute
  medium: 300,      // 5 minutes
  long: 1800,       // 30 minutes
  veryLong: 86400   // 24 hours
};
