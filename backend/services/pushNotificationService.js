// backend/services/pushNotificationService.js - Web Push Notifications

import webpush from 'web-push';
import pool from '../config/database.js';
import { log } from './loggerService.js';

class PushNotificationService {
  constructor() {
    this.configured = false;
    this.initialize();
  }

  initialize() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@nightwatch.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('⚠️  VAPID keys not configured, push notifications disabled');
      return;
    }

    try {
      webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
      );

      this.configured = true;
      console.log('✓ Push notifications initialized');
    } catch (error) {
      console.error('Push notification initialization error:', error);
      this.configured = false;
    }
  }

  /**
   * Send push notification to user
   * @param {Number} userId - User ID
   * @param {Object} notification - Notification data
   * @returns {Object} - Send results
   */
  async sendToUser(userId, notification) {
    if (!this.configured) {
      return { success: false, error: 'Push notifications not configured' };
    }

    try {
      // Get user's push subscriptions
      const [subscriptions] = await pool.execute(`
        SELECT id, endpoint, p256dh_key, auth_key
        FROM push_subscriptions
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      if (subscriptions.length === 0) {
        return { success: false, error: 'No active subscriptions found' };
      }

      const results = [];

      // Send to all user's devices
      for (const sub of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192.png',
            badge: notification.badge || '/badge-72.png',
            data: notification.data || {},
            actions: notification.actions || []
          });

          await webpush.sendNotification(pushSubscription, payload);

          // Update last used
          await pool.execute(`
            UPDATE push_subscriptions 
            SET last_used_at = NOW() 
            WHERE id = ?
          `, [sub.id]);

          // Log success
          await this.logPush(userId, sub.id, notification, 'success', null);

          results.push({ 
            subscriptionId: sub.id, 
            success: true 
          });

        } catch (error) {
          // Handle expired subscription
          if (error.statusCode === 410) {
            await this.removeSubscription(sub.id);
          }

          // Log failure
          await this.logPush(userId, sub.id, notification, 'failed', error.message);

          results.push({ 
            subscriptionId: sub.id, 
            success: false, 
            error: error.message 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        total: results.length,
        successCount,
        results
      };

    } catch (error) {
      log.error('Push notification error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notification - Notification data
   * @returns {Array} - Results for each user
   */
  async sendToUsers(userIds, notification) {
    const promises = userIds.map(userId => 
      this.sendToUser(userId, notification)
    );

    return Promise.allSettled(promises);
  }

  /**
   * Save push subscription
   * @param {Number} userId - User ID
   * @param {Object} subscription - Push subscription object
   * @param {String} deviceType - Device type
   * @returns {Object} - Save result
   */
  async subscribe(userId, subscription, deviceType = 'web') {
    try {
      await pool.execute(`
        INSERT INTO push_subscriptions 
        (user_id, endpoint, p256dh_key, auth_key, device_type)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          p256dh_key = VALUES(p256dh_key),
          auth_key = VALUES(auth_key),
          is_active = 1
      `, [
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        deviceType
      ]);

      return { success: true };
    } catch (error) {
      log.error('Push subscription save error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove push subscription
   * @param {Number} subscriptionId - Subscription ID
   */
  async removeSubscription(subscriptionId) {
    try {
      await pool.execute(`
        UPDATE push_subscriptions 
        SET is_active = 0 
        WHERE id = ?
      `, [subscriptionId]);

      return { success: true };
    } catch (error) {
      log.error('Push subscription removal error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log push notification
   * @param {Number} userId - User ID
   * @param {Number} subscriptionId - Subscription ID
   * @param {Object} notification - Notification data
   * @param {String} status - Status
   * @param {String} error - Error message
   */
  async logPush(userId, subscriptionId, notification, status, error = null) {
    try {
      await pool.execute(`
        INSERT INTO push_logs 
        (user_id, subscription_id, title, body, data, status, error)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        subscriptionId,
        notification.title,
        notification.body,
        JSON.stringify(notification.data || {}),
        status,
        error
      ]);
    } catch (err) {
      console.error('Failed to log push notification:', err);
    }
  }

  /**
   * Generate VAPID keys (run once during setup)
   * @returns {Object} - Public and private keys
   */
  static generateVAPIDKeys() {
    return webpush.generateVAPIDKeys();
  }
}

// Export singleton
export default new PushNotificationService();

// Helper functions
export const sendPushNotification = (userId, notification) => {
  return new PushNotificationService().sendToUser(userId, notification);
};

export const subscribeToPush = (userId, subscription, deviceType) => {
  return new PushNotificationService().subscribe(userId, subscription, deviceType);
};

// Notification templates
export const NotificationTemplates = {
  reportValidated: (reportTitle) => ({
    title: 'Rapport validé',
    body: `Votre rapport "${reportTitle}" a été validé`,
    data: { type: 'report_validated' }
  }),

  reportSent: (reportTitle) => ({
    title: 'Rapport envoyé',
    body: `Le rapport "${reportTitle}" a été envoyé`,
    data: { type: 'report_sent' }
  }),

  newShift: (siteName, startTime) => ({
    title: 'Nouvelle mission',
    body: `Vous avez une nouvelle mission à ${siteName}`,
    data: { type: 'new_shift', startTime }
  }),

  chatMessage: (senderName, message) => ({
    title: `Message de ${senderName}`,
    body: message.substring(0, 100),
    data: { type: 'chat_message' }
  })
};
