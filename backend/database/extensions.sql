-- database/extensions.sql - Additional tables for advanced features

USE night_watch_db;

-- ==========================================
-- WEBHOOK SUBSCRIPTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  INDEX idx_event_type (event_type),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- WEBHOOK LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  url VARCHAR(500) NOT NULL,
  payload JSON,
  status INT,
  response JSON,
  error TEXT,
  attempt INT DEFAULT 1,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_success (success),
  INDEX idx_url (url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  device_type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  UNIQUE KEY unique_subscription (user_id, endpoint(255)),
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PUSH NOTIFICATION LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS push_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  subscription_id INT,
  title VARCHAR(255),
  body TEXT,
  data JSON,
  status VARCHAR(50),
  error TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_sent_at (sent_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- IMAGE OPTIMIZATION METADATA
-- ==========================================

CREATE TABLE IF NOT EXISTS image_metadata (
  id INT PRIMARY KEY AUTO_INCREMENT,
  photo_id INT NOT NULL,
  original_size INT,
  optimized_size INT,
  compression_ratio DECIMAL(5,2),
  format VARCHAR(10),
  width INT,
  height INT,
  thumbnail_path VARCHAR(500),
  webp_path VARCHAR(500),
  s3_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_photo_id (photo_id),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- ANALYTICS EVENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_name VARCHAR(100) NOT NULL,
  user_id INT,
  session_id VARCHAR(255),
  page_url VARCHAR(500),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address VARCHAR(45),
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  custom_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_name (event_name),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- FEATURE FLAGS
-- ==========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INT DEFAULT 0,
  target_users JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default feature flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage) VALUES
('push_notifications', 'Enable push notifications', FALSE, 0),
('offline_mode', 'Enable offline PWA mode', FALSE, 0),
('webhooks', 'Enable webhook integrations', FALSE, 0),
('analytics', 'Enable analytics tracking', TRUE, 100),
('s3_storage', 'Use S3 for file storage', FALSE, 0),
('redis_cache', 'Enable Redis caching', TRUE, 100)
ON DUPLICATE KEY UPDATE name=name;

-- ==========================================
-- SYSTEM HEALTH METRICS
-- ==========================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2),
  metric_unit VARCHAR(50),
  tags JSON,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric_name (metric_name),
  INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- RATE LIMIT TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  requests_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_limit (identifier, endpoint),
  INDEX idx_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- SCHEDULED JOBS
-- ==========================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  cron_expression VARCHAR(100),
  is_enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP NULL,
  next_run_at TIMESTAMP NULL,
  status VARCHAR(50),
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_enabled (is_enabled),
  INDEX idx_next_run_at (next_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default scheduled jobs
INSERT INTO scheduled_jobs (name, description, cron_expression, is_enabled) VALUES
('cleanup_old_logs', 'Clean logs older than 90 days', '0 2 * * *', TRUE),
('backup_database', 'Daily database backup', '0 3 * * *', TRUE),
('sync_shifts', 'Sync shifts from HR API', '0 */6 * * *', TRUE),
('generate_reports', 'Generate monthly reports', '0 1 1 * *', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Webhook logs cleanup (old logs)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_cleanup ON webhook_logs(created_at);

-- Push logs cleanup
CREATE INDEX IF NOT EXISTS idx_push_logs_cleanup ON push_logs(sent_at);

-- Analytics events partitioning support
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

-- System metrics aggregation
CREATE INDEX IF NOT EXISTS idx_metrics_name_date ON system_metrics(metric_name, recorded_at);

-- ==========================================
-- CLEANUP OLD DATA (Run monthly)
-- ==========================================

-- Delete webhook logs older than 90 days
-- DELETE FROM webhook_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete push logs older than 90 days
-- DELETE FROM push_logs WHERE sent_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete analytics events older than 1 year
-- DELETE FROM analytics_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Delete inactive push subscriptions (not used in 6 months)
-- DELETE FROM push_subscriptions WHERE last_used_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
