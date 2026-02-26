// backend/services/loggerService.js - Structured logging with Winston

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'night-watch' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),

    // Audit log file (for GDPR compliance)
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 30 // Keep 30 days
    })
  ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper methods for structured logging
export const log = {
  // General logging
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, error = null, meta = {}) => {
    if (error) {
      logger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else {
      logger.error(message, meta);
    }
  },
  debug: (message, meta = {}) => logger.debug(message, meta),

  // API logging
  api: {
    request: (req) => logger.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    }),

    response: (req, res, duration) => logger.info('API Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    }),

    error: (req, error) => logger.error('API Error', {
      method: req.method,
      url: req.url,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    })
  },

  // Security logging
  security: {
    loginSuccess: (userId, email, ip) => logger.info('Login Success', {
      type: 'security',
      action: 'login_success',
      userId,
      email,
      ip
    }),

    loginFailure: (email, ip, reason) => logger.warn('Login Failure', {
      type: 'security',
      action: 'login_failure',
      email,
      ip,
      reason
    }),

    tokenRefresh: (userId) => logger.info('Token Refresh', {
      type: 'security',
      action: 'token_refresh',
      userId
    }),

    unauthorizedAccess: (req, reason) => logger.warn('Unauthorized Access', {
      type: 'security',
      action: 'unauthorized_access',
      url: req.url,
      ip: req.ip,
      reason
    })
  },

  // Database logging
  database: {
    query: (query, duration) => logger.debug('Database Query', {
      type: 'database',
      query: query.substring(0, 100),
      duration: `${duration}ms`
    }),

    error: (query, error) => logger.error('Database Error', {
      type: 'database',
      query: query.substring(0, 100),
      error: error.message
    }),

    connection: (status) => logger.info('Database Connection', {
      type: 'database',
      status
    })
  },

  // Cache logging
  cache: {
    hit: (key) => logger.debug('Cache Hit', {
      type: 'cache',
      action: 'hit',
      key
    }),

    miss: (key) => logger.debug('Cache Miss', {
      type: 'cache',
      action: 'miss',
      key
    }),

    set: (key, ttl) => logger.debug('Cache Set', {
      type: 'cache',
      action: 'set',
      key,
      ttl
    }),

    invalidate: (pattern) => logger.info('Cache Invalidate', {
      type: 'cache',
      action: 'invalidate',
      pattern
    })
  },

  // Business events (GDPR audit)
  audit: {
    reportCreated: (userId, reportId, siteId) => logger.info('Report Created', {
      type: 'audit',
      action: 'report_created',
      userId,
      reportId,
      siteId
    }),

    reportValidated: (userId, reportId) => logger.info('Report Validated', {
      type: 'audit',
      action: 'report_validated',
      userId,
      reportId
    }),

    reportSent: (reportId, recipients) => logger.info('Report Sent', {
      type: 'audit',
      action: 'report_sent',
      reportId,
      recipientCount: recipients.length
    }),

    userCreated: (adminId, newUserId, email) => logger.info('User Created', {
      type: 'audit',
      action: 'user_created',
      adminId,
      newUserId,
      email
    }),

    dataExported: (userId, dataType) => logger.info('Data Exported', {
      type: 'audit',
      action: 'data_exported',
      userId,
      dataType
    }),

    dataDeleted: (userId, dataType, recordId) => logger.info('Data Deleted', {
      type: 'audit',
      action: 'data_deleted',
      userId,
      dataType,
      recordId
    })
  }
};

// Middleware to log all requests/responses
export const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  log.api.request(req);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    log.api.response(req, res, duration);
  });

  next();
};

export default logger;
