import * as Sentry from '@sentry/node';

import { logger } from '../logger';

const getTracesSampleRate = () => {
  const parsed = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const checkIfSentryConfigured = () => Boolean(process.env.SENTRY_DSN);

const SENSITIVE_HEADERS = ['cookie', 'authorization', 'api-key', 'personal-token', 'oc-secret', 'x-api-key'];

const redactEventRequest = (event) => {
  if (!event?.request) {
    return event;
  }
  try {
    const request = { ...event.request };
    if (request.headers) {
      const headers = { ...request.headers };
      for (const header of SENSITIVE_HEADERS) {
        if (headers[header] !== undefined) {
          headers[header] = '[Filtered]';
        }
      }
      request.headers = headers;
    }
    if (request.cookies) {
      request.cookies = '[Filtered]';
    }
    event.request = request;
  } catch {
    // Never break error reporting because of redaction
  }
  return event;
};

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.OC_ENV || process.env.NODE_ENV || 'development',
  release: process.env.HEROKU_SLUG_COMMIT || `opencollective-images@${process.env.npm_package_version || 'dev'}`,
  tracesSampleRate: getTracesSampleRate(),
  sendDefaultPii: false,
  attachStacktrace: true,
  enabled: process.env.NODE_ENV !== 'test' && checkIfSentryConfigured(),
  beforeSend(event) {
    return redactEventRequest(event);
  },
});

if (checkIfSentryConfigured() && process.env.NODE_ENV !== 'test') {
  logger.info(`Initializing Sentry in ${process.env.NODE_ENV || 'development'} environment`);
}

const shouldIgnoreError = (err) => {
  const message = err?.message || '';
  return (
    err?.status === 404 ||
    err?.statusCode === 404 ||
    err?.status === 400 ||
    err?.statusCode === 400 ||
    /No collective found/i.test(message) ||
    /not found/i.test(message)
  );
};

export const reportErrorToSentry = (err, { severity = 'error', tags, extra, req } = {}) => {
  if (!err) {
    return;
  }
  if (shouldIgnoreError(err)) {
    return;
  }
  if (checkIfSentryConfigured() && process.env.NODE_ENV !== 'test') {
    Sentry.withScope((scope) => {
      scope.setLevel(severity);
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => scope.setTag(key, value));
      }
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          try {
            scope.setExtra(key, typeof value === 'string' ? value : JSON.stringify(value));
          } catch {
            scope.setExtra(key, String(value));
          }
        });
      }
      if (req) {
        scope.setSDKProcessingMetadata({ request: req });
      }
      Sentry.captureException(err);
    });
  } else if (process.env.NODE_ENV !== 'test') {
    logger.error(err.stack || err.message || err);
  }
};

export const reportMessageToSentry = (message, { severity = 'error', tags, extra } = {}) => {
  if (checkIfSentryConfigured() && process.env.NODE_ENV !== 'test') {
    Sentry.withScope((scope) => {
      scope.setLevel(severity);
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => scope.setTag(key, value));
      }
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => scope.setExtra(key, String(value)));
      }
      Sentry.captureMessage(message);
    });
  } else if (process.env.NODE_ENV !== 'test') {
    logger.error(`[Sentry fallback] ${message}`);
  }
};

// Global fallback for errors that never reach Express (e.g. rejected promises, timers)
process
  .on('unhandledRejection', (reason) => {
    reportErrorToSentry(reason instanceof Error ? reason : new Error(`Unhandled Rejection: ${reason}`), {
      severity: 'fatal',
      tags: { handler: 'fallback' },
    });
  })
  .on('uncaughtException', (err) => {
    reportErrorToSentry(err, { severity: 'fatal', tags: { handler: 'fallback' } });
  });

export { Sentry, shouldIgnoreError };
