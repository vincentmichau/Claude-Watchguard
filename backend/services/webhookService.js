// backend/services/webhookService.js - Webhook notifications

import axios from 'axios';
import crypto from 'crypto';
import { log } from './loggerService.js';
import pool from '../config/database.js';

class WebhookService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Send webhook notification
   * @param {String} url - Webhook URL
   * @param {Object} payload - Data to send
   * @param {Object} options - Additional options
   * @returns {Object} - Response
   */
  async send(url, payload, options = {}) {
    const {
      secret = null,
      retries = this.maxRetries,
      timeout = this.timeout,
      headers = {}
    } = options;

    // Generate signature if secret provided
    if (secret) {
      const signature = this.generateSignature(payload, secret);
      headers['X-Webhook-Signature'] = signature;
    }

    // Add timestamp
    const timestamp = Date.now();
    headers['X-Webhook-Timestamp'] = timestamp;

    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NightWatch-Webhook/1.0',
            ...headers
          },
          timeout,
          validateStatus: (status) => status >= 200 && status < 300
        });

        // Log success
        await this.logWebhook({
          url,
          payload,
          status: response.status,
          response: response.data,
          attempt: attempt + 1,
          success: true
        });

        return {
          success: true,
          status: response.status,
          data: response.data,
          attempts: attempt + 1
        };

      } catch (error) {
        lastError = error;
        
        // Log attempt
        await this.logWebhook({
          url,
          payload,
          status: error.response?.status || 0,
          error: error.message,
          attempt: attempt + 1,
          success: false
        });

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }

        // Wait before retry
        if (attempt < retries) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError.message,
      status: lastError.response?.status || 0,
      attempts: retries + 1
    };
  }

  /**
   * Send multiple webhooks in parallel
   * @param {Array} webhooks - Array of {url, payload} objects
   * @returns {Array} - Results
   */
  async sendBatch(webhooks) {
    const promises = webhooks.map(({ url, payload, options }) => 
      this.send(url, payload, options)
    );

    return Promise.allSettled(promises);
  }

  /**
   * Generate HMAC signature for webhook verification
   * @param {Object} payload - Data to sign
   * @param {String} secret - Secret key
   * @returns {String} - Signature
   */
  generateSignature(payload, secret) {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {String} payload - Request body as string
   * @param {String} signature - Received signature
   * @param {String} secret - Secret key
   * @returns {Boolean} - Valid or not
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Log webhook call to database
   * @param {Object} data - Webhook data
   */
  async logWebhook(data) {
    try {
      await pool.execute(`
        INSERT INTO webhook_logs 
        (url, payload, status, response, error, attempt, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        data.url,
        JSON.stringify(data.payload),
        data.status,
        JSON.stringify(data.response || null),
        data.error || null,
        data.attempt,
        data.success
      ]);
    } catch (error) {
      console.error('Failed to log webhook:', error);
    }
  }

  /**
   * Delay helper
   * @param {Number} ms - Milliseconds
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get registered webhooks for an event type
   * @param {String} eventType - Event type
   * @returns {Array} - Webhook URLs
   */
  async getWebhooksForEvent(eventType) {
    try {
      const [webhooks] = await pool.execute(`
        SELECT url, secret, is_active 
        FROM webhook_subscriptions 
        WHERE event_type = ? AND is_active = 1
      `, [eventType]);

      return webhooks;
    } catch (error) {
      console.error('Failed to get webhooks:', error);
      return [];
    }
  }

  /**
   * Trigger webhooks for specific event
   * @param {String} eventType - Event type
   * @param {Object} data - Event data
   */
  async trigger(eventType, data) {
    const webhooks = await this.getWebhooksForEvent(eventType);

    if (webhooks.length === 0) {
      return;
    }

    const payload = {
      event: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    // Send to all registered webhooks
    const results = await this.sendBatch(
      webhooks.map(webhook => ({
        url: webhook.url,
        payload,
        options: { secret: webhook.secret }
      }))
    );

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        log.info(`Webhook sent successfully: ${webhooks[index].url}`);
      } else {
        log.error(`Webhook failed: ${webhooks[index].url}`, result.reason);
      }
    });

    return results;
  }
}

// Export singleton
export default new WebhookService();

// Event types
export const WebhookEvents = {
  REPORT_CREATED: 'report.created',
  REPORT_VALIDATED: 'report.validated',
  REPORT_SENT: 'report.sent',
  EVENT_CREATED: 'event.created',
  SHIFT_CREATED: 'shift.created',
  SHIFT_UPDATED: 'shift.updated',
  USER_CREATED: 'user.created',
  PHOTO_UPLOADED: 'photo.uploaded'
};

// Helper functions
export const triggerWebhook = (eventType, data) => {
  return new WebhookService().trigger(eventType, data);
};
