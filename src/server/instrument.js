/**
 * Sentry instrumentation entry point.
 *
 * Follows https://docs.sentry.io/platforms/javascript/guides/node/:
 * this must be the very first import of the server so the SDK can
 * auto-instrument everything loaded afterwards (Express, fetch, ...).
 */
import dotenv from 'dotenv';

dotenv.config();

import * as Sentry from '@sentry/node';

import { logger } from './logger';

const getTracesSampleRate = () => {
  const parsed = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  release: process.env.HEROKU_SLUG_COMMIT || `oc-images@${process.env.npm_package_version || 'dev'}`,
  tracesSampleRate: getTracesSampleRate(),
  sendDefaultPii: false,
  attachStacktrace: true,
  enabled: process.env.NODE_ENV !== 'test' && Boolean(process.env.SENTRY_DSN),
  beforeSend(event) {
    return redactEventRequest(event);
  },
});

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  logger.info(`Initializing Sentry in ${process.env.NODE_ENV || 'development'} environment`);
}
