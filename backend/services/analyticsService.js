// backend/services/analyticsService.js - Simple analytics tracking

import pool from '../config/database.js';
import geoip from 'geoip-lite';

class AnalyticsService {
  constructor() {
    this.enabled = process.env.ENABLE_ANALYTICS !== 'false';
  }

  /**
   * Track event
   * @param {Object} event - Event data
   * @param {Object} req - Express request object
   */
  async track(event, req = null) {
    if (!this.enabled) {
      return;
    }

    try {
      const eventData = {
        event_name: event.name,
        user_id: event.userId || (req?.user?.id) || null,
        session_id: req?.session?.id || null,
        page_url: event.url || req?.originalUrl || null,
        referrer: req?.get('referer') || null,
        user_agent: req?.get('user-agent') || null,
        ip_address: this.getClientIp(req),
        device_type: this.detectDeviceType(req),
        browser: this.detectBrowser(req),
        os: this.detectOS(req),
        custom_data: JSON.stringify(event.data || {}),
        ...this.getGeoData(req)
      };

      await pool.execute(`
        INSERT INTO analytics_events 
        (event_name, user_id, session_id, page_url, referrer, user_agent,
         ip_address, country, city, device_type, browser, os, custom_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, Object.values(eventData));

    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Track page view
   * @param {String} page - Page URL
   * @param {Object} req - Express request
   */
  async trackPageView(page, req) {
    await this.track({
      name: 'page_view',
      url: page,
      userId: req.user?.id
    }, req);
  }

  /**
   * Track user action
   * @param {String} action - Action name
   * @param {Object} data - Additional data
   * @param {Object} req - Express request
   */
  async trackAction(action, data = {}, req) {
    await this.track({
      name: action,
      data,
      userId: req.user?.id
    }, req);
  }

  /**
   * Get analytics summary
   * @param {String} startDate - Start date
   * @param {String} endDate - End date
   * @returns {Object} - Analytics data
   */
  async getSummary(startDate, endDate) {
    try {
      // Total events
      const [totalEvents] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);

      // Unique users
      const [uniqueUsers] = await pool.execute(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ? AND user_id IS NOT NULL
      `, [startDate, endDate]);

      // Top events
      const [topEvents] = await pool.execute(`
        SELECT event_name, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ?
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Top pages
      const [topPages] = await pool.execute(`
        SELECT page_url, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ? AND page_url IS NOT NULL
        GROUP BY page_url
        ORDER BY count DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Device breakdown
      const [devices] = await pool.execute(`
        SELECT device_type, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ?
        GROUP BY device_type
      `, [startDate, endDate]);

      // Country breakdown
      const [countries] = await pool.execute(`
        SELECT country, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN ? AND ? AND country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `, [startDate, endDate]);

      return {
        totalEvents: totalEvents[0].count,
        uniqueUsers: uniqueUsers[0].count,
        topEvents,
        topPages,
        devices,
        countries
      };

    } catch (error) {
      console.error('Analytics summary error:', error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   * @param {Number} userId - User ID
   * @param {Number} limit - Number of events
   * @returns {Array} - User events
   */
  async getUserActivity(userId, limit = 50) {
    try {
      const [events] = await pool.execute(`
        SELECT event_name, custom_data, created_at
        FROM analytics_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, limit]);

      return events.map(e => ({
        ...e,
        custom_data: JSON.parse(e.custom_data || '{}')
      }));

    } catch (error) {
      console.error('User activity error:', error);
      return [];
    }
  }

  /**
   * Get geo data from IP
   * @param {Object} req - Express request
   * @returns {Object} - Geo data
   */
  getGeoData(req) {
    const ip = this.getClientIp(req);
    if (!ip) return { country: null, city: null };

    const geo = geoip.lookup(ip);
    if (!geo) return { country: null, city: null };

    return {
      country: geo.country,
      city: geo.city
    };
  }

  /**
   * Get client IP address
   * @param {Object} req - Express request
   * @returns {String} - IP address
   */
  getClientIp(req) {
    if (!req) return null;

    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           null;
  }

  /**
   * Detect device type from user agent
   * @param {Object} req - Express request
   * @returns {String} - Device type
   */
  detectDeviceType(req) {
    if (!req) return 'unknown';

    const ua = req.get('user-agent') || '';

    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  /**
   * Detect browser from user agent
   * @param {Object} req - Express request
   * @returns {String} - Browser name
   */
  detectBrowser(req) {
    if (!req) return 'unknown';

    const ua = req.get('user-agent') || '';

    if (/firefox/i.test(ua)) return 'Firefox';
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/safari/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    if (/opera/i.test(ua)) return 'Opera';

    return 'Other';
  }

  /**
   * Detect OS from user agent
   * @param {Object} req - Express request
   * @returns {String} - OS name
   */
  detectOS(req) {
    if (!req) return 'unknown';

    const ua = req.get('user-agent') || '';

    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS';

    return 'Other';
  }

  /**
   * Middleware to track all requests
   * @returns {Function} - Express middleware
   */
  trackingMiddleware() {
    return async (req, res, next) => {
      if (!this.enabled) {
        return next();
      }

      // Skip health checks and static files
      if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
      }

      await this.trackPageView(req.originalUrl, req);
      next();
    };
  }
}

// Export singleton
export default new AnalyticsService();

// Helper functions
export const trackEvent = (event, req) => {
  return new AnalyticsService().track(event, req);
};

export const trackAction = (action, data, req) => {
  return new AnalyticsService().trackAction(action, data, req);
};

// Common event names
export const AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  SIGNUP: 'user_signup',
  REPORT_CREATED: 'report_created',
  REPORT_VALIDATED: 'report_validated',
  REPORT_SENT: 'report_sent',
  PHOTO_UPLOADED: 'photo_uploaded',
  PDF_DOWNLOADED: 'pdf_downloaded',
  EXCEL_EXPORTED: 'excel_exported',
  SEARCH: 'search',
  ERROR: 'error'
};
