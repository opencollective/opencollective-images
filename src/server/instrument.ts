/**
 * Sentry instrumentation. Must be the very first import of the server so the SDK can
 * instrument the modules loaded afterwards (http, Express...).
 * See https://docs.sentry.io/platforms/javascript/guides/express/
 */
import './env';

import * as Sentry from '@sentry/node';

import { getTracesSampleRate, isSentryEnabled } from './lib/sentry';
import { logger } from './logger';

const enabled = isSentryEnabled();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.OC_ENV || process.env.NODE_ENV,
  // Tracing is disabled by default, enable with SENTRY_TRACES_SAMPLE_RATE
  tracesSampleRate: getTracesSampleRate(),
  // Headers and query params that look sensitive (auth, token, secret, key...) are always filtered
  // by the SDK. Images are public, so there's no need for user info (IP) or cookies either.
  dataCollection: { userInfo: false, cookies: false },
});

if (enabled) {
  logger.info(`Sentry initialized (environment: ${process.env.SENTRY_ENVIRONMENT || process.env.OC_ENV})`);
}
