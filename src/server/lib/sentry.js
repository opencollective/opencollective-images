/**
 * Small Sentry reporting helpers.
 *
 * SDK init lives in `src/server/instrument.js`, the first import of the
 * server (see https://docs.sentry.io/platforms/javascript/guides/node/).
 * Process-level crashes (uncaughtException/unhandledRejection) are covered
 * by the SDK's default integrations, so no custom handlers here.
 */
import * as Sentry from '@sentry/node';

import { logger } from '../logger';

export const checkIfSentryConfigured = () => Boolean(process.env.SENTRY_DSN);

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

export { Sentry, shouldIgnoreError };
