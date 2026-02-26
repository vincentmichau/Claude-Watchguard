-- Night Watch Database Schema

CREATE DATABASE IF NOT EXISTS night_watch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE night_watch_db;

-- Users table with encrypted fields
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name_encrypted VARBINARY(500),
  last_name_encrypted VARBINARY(500),
  phone_encrypted VARBINARY(500),
  role ENUM('admin', 'manager', 'night_watch') DEFAULT 'night_watch',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- Clients table
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone_encrypted VARBINARY(500),
  address_encrypted VARBINARY(1000),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB;

-- Sites table
CREATE TABLE sites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  address_encrypted VARBINARY(1000),
  contact_name_encrypted VARBINARY(500),
  contact_phone_encrypted VARBINARY(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client (client_id)
) ENGINE=InnoDB;

-- Shifts table
CREATE TABLE shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  site_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  external_id VARCHAR(255) COMMENT 'ID from HR system (Combo, etc.)',
  notes_encrypted VARBINARY(2000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, start_time),
  INDEX idx_site_date (site_id, start_time),
  INDEX idx_external (external_id)
) ENGINE=InnoDB;

-- Reports table
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  user_id INT NOT NULL,
  site_id INT NOT NULL,
  status ENUM('draft', 'validated', 'sent') DEFAULT 'draft',
  title VARCHAR(255),
  summary_encrypted VARBINARY(5000),
  validated_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_shift (shift_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Events table (incidents, observations)
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT NOT NULL,
  type ENUM('incident', 'observation', 'maintenance', 'other') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  title VARCHAR(255) NOT NULL,
  description_encrypted VARBINARY(5000),
  location_encrypted VARBINARY(500),
  event_time DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  INDEX idx_report (report_id),
  INDEX idx_type (type),
  INDEX idx_event_time (event_time)
) ENGINE=InnoDB;

-- Photos table
CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT,
  event_id INT,
  file_path_encrypted VARBINARY(1000) NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_report (report_id),
  INDEX idx_event (event_id)
) ENGINE=InnoDB;

-- Email recipients table
CREATE TABLE email_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  site_id INT,
  client_id INT,
  email_encrypted VARBINARY(500) NOT NULL,
  name VARCHAR(255),
  type ENUM('primary', 'cc', 'bcc') DEFAULT 'primary',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_site (site_id),
  INDEX idx_client (client_id)
) ENGINE=InnoDB;

-- Chat messages table
CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT,
  site_id INT,
  message_encrypted VARBINARY(5000) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
  INDEX idx_sender (sender_id),
  INDEX idx_recipient (recipient_id),
  INDEX idx_sent (sent_at)
) ENGINE=InnoDB;

-- Audit log for GDPR compliance
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(255)),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- API keys table
CREATE TABLE api_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  permissions JSON,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  INDEX idx_key (key_hash)
) ENGINE=InnoDB;

-- Insert default admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@nightwatch.com', '$2a$10$xQxR5qZ7N9YKJ8pYgZpYF.kH3vJ5X7fQ9Wc8zL2pN4rT6wE8yU9uK', 'admin');
