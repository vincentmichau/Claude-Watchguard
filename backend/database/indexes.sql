-- database/indexes.sql - Database Performance Optimization

-- ==========================================
-- INDEX STRATEGY
-- ==========================================
-- Performance indexes for most common queries
-- Run this after initial schema.sql

USE night_watch_db;

-- ==========================================
-- USERS TABLE INDEXES
-- ==========================================

-- Fast login lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Filter by role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Filter active users
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Composite index for active users by role
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- ==========================================
-- REPORTS TABLE INDEXES
-- ==========================================

-- Filter by user (most common query)
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Filter by site
CREATE INDEX IF NOT EXISTS idx_reports_site_id ON reports(site_id);

-- Filter by shift
CREATE INDEX IF NOT EXISTS idx_reports_shift_id ON reports(shift_id);

-- Filter by status (validated, draft, sent)
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Date range queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Composite index for user's reports by status
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON reports(user_id, status);

-- Composite index for site reports by date
CREATE INDEX IF NOT EXISTS idx_reports_site_created ON reports(site_id, created_at DESC);

-- Full-text search on title (if needed)
CREATE FULLTEXT INDEX IF NOT EXISTS idx_reports_title_fulltext ON reports(title);

-- ==========================================
-- EVENTS TABLE INDEXES
-- ==========================================

-- Filter by report (most common)
CREATE INDEX IF NOT EXISTS idx_events_report_id ON events(report_id);

-- Filter by type (incident, observation, etc.)
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Filter by severity
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);

-- Order by event time
CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_time);

-- Composite index for report events by time
CREATE INDEX IF NOT EXISTS idx_events_report_time ON events(report_id, event_time);

-- ==========================================
-- SHIFTS TABLE INDEXES
-- ==========================================

-- Filter by user
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);

-- Filter by site
CREATE INDEX IF NOT EXISTS idx_shifts_site_id ON shifts(site_id);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON shifts(end_time);

-- Composite index for user shifts by date
CREATE INDEX IF NOT EXISTS idx_shifts_user_start ON shifts(user_id, start_time);

-- External ID for HR integration
CREATE INDEX IF NOT EXISTS idx_shifts_external_id ON shifts(external_id);

-- ==========================================
-- PHOTOS TABLE INDEXES
-- ==========================================

-- Filter by report
CREATE INDEX IF NOT EXISTS idx_photos_report_id ON photos(report_id);

-- Filter by event
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);

-- Order by upload date
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);

-- ==========================================
-- SITES TABLE INDEXES
-- ==========================================

-- Filter by client
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);

-- Filter active sites
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);

-- ==========================================
-- CHAT_MESSAGES TABLE INDEXES
-- ==========================================

-- Filter by sender
CREATE INDEX IF NOT EXISTS idx_chat_sender_id ON chat_messages(sender_id);

-- Filter by receiver
CREATE INDEX IF NOT EXISTS idx_chat_receiver_id ON chat_messages(receiver_id);

-- Order by timestamp
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at DESC);

-- Composite index for conversation
CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_messages(sender_id, receiver_id, created_at DESC);

-- Read status
CREATE INDEX IF NOT EXISTS idx_chat_is_read ON chat_messages(is_read);

-- ==========================================
-- EMAIL_RECIPIENTS TABLE INDEXES
-- ==========================================

-- Filter by site
CREATE INDEX IF NOT EXISTS idx_email_recipients_site_id ON email_recipients(site_id);

-- Filter by type (TO, CC, BCC)
CREATE INDEX IF NOT EXISTS idx_email_recipients_type ON email_recipients(type);

-- Active recipients
CREATE INDEX IF NOT EXISTS idx_email_recipients_active ON email_recipients(is_active);

-- ==========================================
-- AUDIT_LOGS TABLE INDEXES
-- ==========================================

-- Filter by user
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);

-- Filter by action
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- IP address for security analysis
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON audit_logs(ip_address);

-- Composite index for user actions by date
CREATE INDEX IF NOT EXISTS idx_audit_user_action_date ON audit_logs(user_id, action, created_at DESC);

-- ==========================================
-- REFRESH_TOKENS TABLE INDEXES
-- ==========================================

-- Find by token
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Find by user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Clean expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ==========================================
-- API_KEYS TABLE INDEXES
-- ==========================================

-- Find by key hash
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Filter by user
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Active keys
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Clean expired keys
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- ==========================================
-- ANALYZE TABLES
-- ==========================================
-- Update statistics for query optimizer

ANALYZE TABLE users;
ANALYZE TABLE reports;
ANALYZE TABLE events;
ANALYZE TABLE shifts;
ANALYZE TABLE photos;
ANALYZE TABLE sites;
ANALYZE TABLE clients;
ANALYZE TABLE chat_messages;
ANALYZE TABLE email_recipients;
ANALYZE TABLE audit_logs;
ANALYZE TABLE refresh_tokens;
ANALYZE TABLE api_keys;

-- ==========================================
-- QUERY OPTIMIZATION TIPS
-- ==========================================

/*
1. USE INDEXES:
   - Always filter on indexed columns
   - Composite indexes for multi-column WHERE clauses
   - Order matters in composite indexes

2. AVOID:
   - SELECT * (use specific columns)
   - Functions on indexed columns in WHERE
   - OR conditions (use UNION instead)
   - NOT IN (use NOT EXISTS or LEFT JOIN)

3. PAGINATION:
   - Use LIMIT + OFFSET with ORDER BY
   - Consider cursor-based pagination for large datasets

4. JOINS:
   - Index foreign keys
   - Join on indexed columns
   - Limit result set before joining when possible

5. MONITORING:
   - Use EXPLAIN to analyze queries
   - Monitor slow query log
   - Review query execution plans regularly
*/

-- ==========================================
-- SHOW INDEX STATS
-- ==========================================

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    CARDINALITY,
    INDEX_TYPE
FROM 
    information_schema.STATISTICS 
WHERE 
    TABLE_SCHEMA = 'night_watch_db'
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
