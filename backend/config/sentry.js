// backend/config/sentry.js - Sentry Error Monitoring

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured, skipping error monitoring');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable performance monitoring
      new ProfilingIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.4.0',
    
    // Before send hook for filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry would send:', hint.originalException || hint.syntheticException);
        return null;
      }
      
      // Filter out specific errors
      const error = hint.originalException;
      if (error && error.message) {
        // Don't report 401 errors
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          return null;
        }
        
        // Don't report validation errors
        if (error.message.includes('ValidationError')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Ignore certain transactions
    ignoreTransactions: [
      '/health',
      '/favicon.ico'
    ],
    
    // Additional context
    initialScope: {
      tags: {
        service: 'night-watch-backend',
        version: process.env.npm_package_version || '1.4.0'
      }
    }
  });

  console.log('✓ Sentry monitoring initialized');
};

// Request handler - must be first
export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();

// Tracing handler
export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();

// Error handler - must be before other error middleware
export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all 5xx errors
    if (error.status >= 500) {
      return true;
    }
    return false;
  }
});

// Manual error capture with context
export const captureError = (error, context = {}) => {
  Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    user: context.user || {},
    level: context.level || 'error'
  });
};

// Capture message
export const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, {
    level,
    tags: context.tags || {},
    extra: context.extra || {}
  });
};

// Add breadcrumb
export const addBreadcrumb = (breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// Set user context
export const setUser = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role
  });
};

// Performance monitoring transaction
export const startTransaction = (name, operation) => {
  return Sentry.startTransaction({
    name,
    op: operation,
    trimEnd: true
  });
};

export default Sentry;
